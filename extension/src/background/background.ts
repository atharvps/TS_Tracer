/**
 * Service Worker (Background Script) — TS_Tracer's central hub.
 *
 * BUG FIXES applied in this version:
 *  [BUG-1] setPanelBehavior was only called on `onInstalled`, meaning after
 *          an extension reload/update the icon click would stop working.
 *          Fix: also call it on `chrome.runtime.onStartup`.
 *
 *  [BUG-2] Broadcasting CONTEXT_UPDATE via chrome.runtime.sendMessage
 *          only works if the side panel port is open. If SW wakes up cold,
 *          the message is silently dropped. Fix: store context in storage
 *          AND broadcast so both paths work.
 *
 *  [BUG-3] No try/catch around async message handlers. A storage error
 *          would leave sendResponse never called → port closes → the side
 *          panel's callback never fires → UI hangs.
 *
 *  [BUG-4] Missing `tabs` permission means we cannot query the active tab
 *          to forward the context request. Fixed by using the sender tabId
 *          from the content script's message instead.
 */

const LOG = "[TS-BG]";

// ── Storage key constants ─────────────────────────────────────
const KEYS = {
  API_KEY:   "ts_api_key",
  ONBOARDED: "ts_onboarded",
  PREFS:     "ts_prefs",
  CONTEXT:   "ts_latest_context",  // NEW: persist context across SW restarts
} as const;

const chatKey = (slug: string) => `ts_chat_${slug}`;

const DEFAULT_PREFS = {
  isSocraticMode: true,
  theme:          "dark",
  model:          "gemini-1.5-flash", // free tier: 15 RPM, 1500 RPD
  proxyUrl:       "http://localhost:5000",
};

// ── Type-safe storage helpers ─────────────────────────────────

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) =>
    chrome.storage.local.get(key, (r) => {
      if (chrome.runtime.lastError) {
        console.error(LOG, "storageGet error:", chrome.runtime.lastError.message);
        resolve(undefined);
      } else {
        resolve(r[key] as T | undefined);
      }
    })
  );
}

function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error(LOG, "storageSet error:", chrome.runtime.lastError.message);
      }
      resolve();
    })
  );
}

function storageRemove(key: string): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        console.error(LOG, "storageRemove error:", chrome.runtime.lastError.message);
      }
      resolve();
    })
  );
}

// ── In-memory context cache (backed by storage for SW restart survival) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let latestContext: any = null;

// Restore context from storage when SW wakes up cold
storageGet("ts_latest_context").then((stored) => {
  if (stored) {
    latestContext = stored;
    console.log(LOG, "Restored context from storage for slug:", (stored as any)?.slug);
  }
});

// ── BUG-1 FIX: Register panel behavior on BOTH install AND startup ────────

function registerPanelBehavior() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: Error) =>
      console.warn(LOG, "setPanelBehavior failed (likely already set):", err.message)
    );
}

chrome.runtime.onInstalled.addListener(() => {
  console.log(LOG, "Extension installed/updated.");
  registerPanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  console.log(LOG, "Browser started — re-registering panel behavior.");
  registerPanelBehavior();
});

// Also register immediately in case the SW was just restarted mid-session
registerPanelBehavior();

// ── Message router ────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: any, sender, sendResponse) => {
    console.log(LOG, "Message received:", message.type, "| from:", sender.tab?.id ?? "side-panel");

    // Wrap the entire async handler in try/catch so sendResponse is
    // ALWAYS called — even on error — preventing the port from hanging.
    (async () => {
      try {
        switch (message.type) {

          // ── Content script pushes fresh context ──────────────
          case "LEETCODE_CONTEXT": {
            latestContext = message.payload;
            console.log(LOG, "Context cached for slug:", latestContext.slug);

            // BUG-2 FIX: Persist across SW restarts
            await storageSet(KEYS.CONTEXT, latestContext);

            // Broadcast to side panel (fire-and-forget — panel may not be open)
            chrome.runtime.sendMessage({
              type:    "CONTEXT_UPDATE",
              payload: latestContext,
            }).catch(() => {
              // Normal — side panel isn't open yet. Not an error.
              console.log(LOG, "CONTEXT_UPDATE broadcast: side panel not listening (OK).");
            });

            sendResponse({ ok: true });
            break;
          }

          // ── Side panel requests current context ──────────────
          case "GET_CONTEXT": {
            // Return in-memory cache first; fall back to storage
            if (!latestContext) {
              latestContext = await storageGet("ts_latest_context") ?? null;
            }
            console.log(LOG, "GET_CONTEXT →", latestContext?.slug ?? "null");
            sendResponse({ context: latestContext });
            break;
          }

          // ── API key management ───────────────────────────────
          case "GET_API_KEY": {
            const key = await storageGet<string>(KEYS.API_KEY);
            console.log(LOG, "GET_API_KEY →", key ? "found" : "not set");
            sendResponse({ key: key ?? null });
            break;
          }

          case "SET_API_KEY": {
            const { key } = message.payload;
            await storageSet(KEYS.API_KEY, key);
            await storageSet(KEYS.ONBOARDED, true);
            console.log(LOG, "SET_API_KEY: key saved.");
            sendResponse({ ok: true });
            break;
          }

          case "CLEAR_API_KEY": {
            await storageRemove(KEYS.API_KEY);
            await storageRemove(KEYS.ONBOARDED);
            console.log(LOG, "CLEAR_API_KEY: key removed.");
            sendResponse({ ok: true });
            break;
          }

          // ── Chat history ─────────────────────────────────────
          case "GET_CHAT_HISTORY": {
            const { slug } = message.payload;
            const history = await storageGet(chatKey(slug));
            console.log(LOG, "GET_CHAT_HISTORY for", slug, "→", history ? "found" : "empty");
            sendResponse({ history: history ?? null });
            break;
          }

          case "SAVE_MESSAGE": {
            const { slug, problemTitle, difficulty, message: newMsg } = message.payload;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing: any = await storageGet(chatKey(slug));
            const history = existing ?? {
              slug,
              problemTitle,
              difficulty,
              lastActive: new Date().toISOString(),
              messages:   [],
            };
            history.messages.push(newMsg);
            history.lastActive = new Date().toISOString();
            if (history.messages.length > 100) {
              history.messages = history.messages.slice(-100);
            }
            await storageSet(chatKey(slug), history);
            console.log(LOG, "SAVE_MESSAGE: saved for slug:", slug);
            sendResponse({ ok: true });
            break;
          }

          case "CLEAR_HISTORY": {
            const { slug } = message.payload;
            await storageRemove(chatKey(slug));
            console.log(LOG, "CLEAR_HISTORY: cleared for slug:", slug);
            sendResponse({ ok: true });
            break;
          }

          // ── User preferences ─────────────────────────────────
          case "GET_PREFS": {
            const stored = await storageGet(KEYS.PREFS);
            const prefs = { ...DEFAULT_PREFS, ...(stored ?? {}) };
            console.log(LOG, "GET_PREFS →", prefs);
            sendResponse({ prefs });
            break;
          }

          case "SET_PREFS": {
            const current = await storageGet(KEYS.PREFS);
            const updated = { ...DEFAULT_PREFS, ...(current ?? {}), ...message.payload };
            await storageSet(KEYS.PREFS, updated);
            console.log(LOG, "SET_PREFS: saved:", message.payload);
            sendResponse({ ok: true });
            break;
          }

          default:
            console.warn(LOG, "Unknown message type:", message.type);
            sendResponse({ error: `Unknown message type: ${message.type}` });
        }
      } catch (err) {
        // BUG-3 FIX: Always call sendResponse even on unexpected errors
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(LOG, "Handler error for", message.type, ":", errMsg);
        sendResponse({ error: errMsg });
      }
    })();

    return true; // Keep the message channel open for async sendResponse
  }
);

console.log(LOG, "Service worker script loaded.");
