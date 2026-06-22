/**
 * useChat — The core state machine for the chat feature.
 *
 * BUG FIXES applied in this version:
 *  [BUG-15] SSE parser split chunks on "\n\n" but fetch() ReadableStream
 *           chunks are arbitrary byte slices — a single SSE event can span
 *           multiple chunks, or one chunk can contain multiple events.
 *           Fix: Use a proper line-buffering parser with a carry-over buffer.
 *
 *  [BUG-16] If the proxy server is DOWN, fetch() throws a TypeError
 *           "Failed to fetch" but the UI only showed a generic error.
 *           Fix: Detect network errors specifically and show a helpful message.
 *
 *  [BUG-17] The error path called both SET_ERROR and SET_STREAMING_DONE,
 *           but SET_ERROR already sets isStreaming:false. The double dispatch
 *           caused a redundant render. Minor but cleaned up.
 *
 *  [BUG-18] AbortController for the fetch request was missing. If the user
 *           navigates away or unmounts the component while streaming, the
 *           fetch continues in the background consuming resources.
 *           Fix: Store AbortController in a ref and abort on unmount.
 *
 *  [BUG-19] The `[DONE]` sentinel was checked inside the per-line loop with
 *           a `break` — but that only breaks the inner `for` loop, not the
 *           outer `while(true)` reader loop, so reading continued until
 *           the server closed the connection. Fix: use a flag variable.
 *
 *  [BUG-20] GET_CHAT_HISTORY callback has no chrome.runtime.lastError check,
 *           so a SW restart during load would leave the chat in a blank state
 *           forever with no recovery path.
 */

import { useReducer, useCallback, useEffect, useRef } from "react";
import { ChatMessage, LeetCodeContext, UserPrefs } from "@types-ext/storage.ts";

const LOG = "[TS-SidePanel][useChat]";

// ── State & Actions ───────────────────────────────────────────

interface ChatState {
  messages:           ChatMessage[];
  isStreaming:        boolean;
  error:              string | null;
  rateLimitCountdown: number | null; // seconds remaining, null = no rate limit
}

type ChatAction =
  | { type: "LOAD_HISTORY";       payload: ChatMessage[] }
  | { type: "ADD_MESSAGE";        payload: ChatMessage }
  | { type: "APPEND_TOKEN";       payload: string }
  | { type: "SET_STREAMING_DONE" }
  | { type: "SET_ERROR";          payload: string }
  | { type: "SET_RATE_LIMIT";     payload: number }   // seconds to wait
  | { type: "TICK_RATE_LIMIT" }                       // decrement countdown
  | { type: "CLEAR" };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "LOAD_HISTORY":
      return { ...state, messages: action.payload, error: null };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload], error: null };

    case "APPEND_TOKEN": {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;
      const last = { ...msgs[msgs.length - 1] };
      last.content += action.payload;
      msgs[msgs.length - 1] = last;
      return { ...state, messages: msgs, isStreaming: true };
    }

    case "SET_STREAMING_DONE":
      return { ...state, isStreaming: false };

    case "SET_ERROR":
      return { ...state, isStreaming: false, error: action.payload, rateLimitCountdown: null };

    case "SET_RATE_LIMIT":
      return {
        ...state,
        isStreaming:        false,
        error:              null,
        rateLimitCountdown: action.payload,
      };

    case "TICK_RATE_LIMIT":
      if (state.rateLimitCountdown === null) return state;
      const next = state.rateLimitCountdown - 1;
      return { ...state, rateLimitCountdown: next <= 0 ? null : next };

    case "CLEAR":
      return { messages: [], isStreaming: false, error: null, rateLimitCountdown: null };

    default:
      return state;
  }
}

// ── SSE Line Buffer Parser ────────────────────────────────────
// BUG-15 FIX: Proper stateful SSE parser that handles chunk boundaries.

interface SSEEvent {
  tokens:     string[];
  done:       boolean;
  errors:     Array<{ message: string; code?: string; retryAfter?: number }>;
}

function parseSSEChunk(rawChunk: string, lineBuffer: { current: string }): SSEEvent {
  const tokens: string[] = [];
  const errors: Array<{ message: string; code?: string; retryAfter?: number }> = [];
  let done = false;

  lineBuffer.current += rawChunk;
  const events = lineBuffer.current.split("\n\n");
  lineBuffer.current = events.pop() ?? "";

  for (const event of events) {
    const lines = event.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();

      if (data === "[DONE]") { done = true; continue; }

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          errors.push({
            message:    parsed.error,
            code:       parsed.code,
            retryAfter: parsed.retryAfter,
          });
        } else if (typeof parsed.token === "string") {
          tokens.push(parsed.token);
        }
      } catch {
        console.warn(LOG, "Skipping malformed SSE data:", data.slice(0, 80));
      }
    }
  }

  return { tokens, done, errors };
}

// ── Hook ──────────────────────────────────────────────────────

interface UseChatProps {
  context:  LeetCodeContext | null;
  prefs:    UserPrefs;
  apiKey:   string;
}

export function useChat({ context, prefs, apiKey }: UseChatProps) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages:           [],
    isStreaming:        false,
    error:              null,
    rateLimitCountdown: null,
  });

  // BUG-18 FIX: AbortController ref to cancel in-flight fetch on unmount
  const abortRef = useRef<AbortController | null>(null);

  // Load chat history when the problem slug changes
  useEffect(() => {
    if (!context?.slug) return;

    dispatch({ type: "CLEAR" });
    console.log(LOG, "Loading chat history for slug:", context.slug);

    chrome.runtime.sendMessage(
      { type: "GET_CHAT_HISTORY", payload: { slug: context.slug } },
      (response) => {
        // BUG-20 FIX: Check lastError before accessing response
        if (chrome.runtime.lastError) {
          console.error(LOG, "GET_CHAT_HISTORY error:", chrome.runtime.lastError.message);
          return;
        }
        const msgs = response?.history?.messages;
        if (Array.isArray(msgs) && msgs.length > 0) {
          console.log(LOG, `Loaded ${msgs.length} messages from history.`);
          dispatch({ type: "LOAD_HISTORY", payload: msgs });
        } else {
          console.log(LOG, "No chat history found.");
        }
      }
    );
  }, [context?.slug]);

  // Abort any in-flight stream on component unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        console.log(LOG, "Aborting in-flight stream on unmount.");
        abortRef.current.abort();
      }
    };
  }, []);

  // Countdown ticker: decrement rateLimitCountdown every second
  useEffect(() => {
    if (state.rateLimitCountdown === null) return;
    const id = setInterval(() => dispatch({ type: "TICK_RATE_LIMIT" }), 1000);
    return () => clearInterval(id);
  }, [state.rateLimitCountdown !== null]);

  // ── Send a message and consume the SSE stream ─────────────
  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!context || !apiKey || state.isStreaming) {
        console.warn(LOG, "sendMessage blocked:", { hasContext: !!context, hasKey: !!apiKey, isStreaming: state.isStreaming });
        return;
      }

      const userMessage: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "user",
        content:   userInput,
        timestamp: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "assistant",
        content:   "",
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "ADD_MESSAGE", payload: assistantMessage });

      // Save user message asynchronously
      chrome.runtime.sendMessage({
        type:    "SAVE_MESSAGE",
        payload: {
          slug:         context.slug,
          problemTitle: context.title,
          difficulty:   context.difficulty,
          message:      userMessage,
        },
      }).catch((err) => console.warn(LOG, "SAVE_MESSAGE (user) failed:", err));

      // Build messages history for the API (all previous + new user message)
      const allMessages = [...state.messages, userMessage].map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      let proxyUrl = prefs.proxyUrl || "https://ts-tracer-proxy.onrender.com";
      if (proxyUrl === "http://localhost:5000") {
        proxyUrl = "https://ts-tracer-proxy.onrender.com"; // Force migration from local dev
      }
      console.log(LOG, `Fetching from ${proxyUrl}/api/chat for slug: ${context.slug}`);

      // BUG-18 FIX: Create an AbortController for this request
      const controller = new AbortController();
      abortRef.current = controller;

      let finalContent = "";

      try {
        const response = await fetch(`${proxyUrl}/api/chat`, {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${apiKey}`,
          },
          body:   JSON.stringify({
            messages:       allMessages,
            problemContext: {
              title:       context.title,
              difficulty:  context.difficulty,
              description: context.description,
              userCode:    context.userCode,
              language:    context.language,
            },
            isSocraticMode: prefs.isSocraticMode,
            model:          prefs.model,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // BUG-16 FIX: Parse server error response properly
          let errMsg = `Server error: ${response.status} ${response.statusText}`;
          try {
            const errData = await response.json();
            if (errData.error) errMsg = errData.error;
          } catch { /* JSON parse failed — use status text */ }
          throw new Error(errMsg);
        }

        if (!response.body) {
          throw new Error("Server returned no response body.");
        }

        console.log(LOG, "SSE stream opened. Reading chunks...");

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        // BUG-15 FIX: Persistent line buffer across chunks
        const lineBuffer = { current: "" };
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(LOG, "ReadableStream closed by server.");
            break;
          }

          const rawChunk = decoder.decode(value, { stream: true });
          const { tokens, done: sseFinished, errors } = parseSSEChunk(rawChunk, lineBuffer);

          for (const token of tokens) {
            dispatch({ type: "APPEND_TOKEN", payload: token });
            finalContent += token;
          }

          for (const errEvent of errors) {
            console.error(LOG, "SSE error event:", errEvent);

            // Rate limit → dedicated countdown state (not a generic error)
            if (errEvent.code === "RATE_LIMIT") {
              const waitSecs = errEvent.retryAfter ?? 60;
              console.warn(LOG, `Rate limit hit. Retry in ${waitSecs}s.`);
              dispatch({ type: "SET_RATE_LIMIT", payload: waitSecs });
              isDone = true;
              return; // exit sendMessage entirely
            }

            throw new Error(errEvent.message);
          }

          // BUG-19 FIX: Use a flag to break the OUTER while loop
          if (sseFinished) {
            console.log(LOG, "SSE [DONE] sentinel received.");
            isDone = true;
          }
        }

        dispatch({ type: "SET_STREAMING_DONE" });
        console.log(LOG, "Stream complete. Final length:", finalContent.length);

        // Save completed assistant message
        const completedAssistant: ChatMessage = { ...assistantMessage, content: finalContent };
        chrome.runtime.sendMessage({
          type:    "SAVE_MESSAGE",
          payload: {
            slug:         context.slug,
            problemTitle: context.title,
            difficulty:   context.difficulty,
            message:      completedAssistant,
          },
        }).catch((err) => console.warn(LOG, "SAVE_MESSAGE (assistant) failed:", err));

      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log(LOG, "Stream aborted by user/unmount.");
          dispatch({ type: "SET_STREAMING_DONE" });
          return;
        }

        // BUG-16 FIX: Specific message for network errors (proxy is down)
        let message: string;
        if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
          message = `Could not reach the proxy server at ${prefs.proxyUrl}. Is it running?`;
          console.error(LOG, "Network error — proxy unreachable:", prefs.proxyUrl);
        } else {
          message = err instanceof Error ? err.message : "An unknown error occurred.";
          console.error(LOG, "Stream error:", message);
        }

        // BUG-17 FIX: Single dispatch (SET_ERROR already sets isStreaming: false)
        dispatch({ type: "SET_ERROR", payload: message });
      } finally {
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, apiKey, prefs, state.messages, state.isStreaming]
  );

  const clearHistory = useCallback(() => {
    if (!context?.slug) return;
    console.log(LOG, "Clearing history for:", context.slug);
    dispatch({ type: "CLEAR" });
    chrome.runtime.sendMessage(
      { type: "CLEAR_HISTORY", payload: { slug: context.slug } },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(LOG, "CLEAR_HISTORY error:", chrome.runtime.lastError.message);
        } else {
          console.log(LOG, "History cleared:", response);
        }
      }
    );
  }, [context?.slug]);

  return {
    messages:           state.messages,
    isStreaming:        state.isStreaming,
    error:              state.error,
    rateLimitCountdown: state.rateLimitCountdown,
    sendMessage,
    clearHistory,
  };
}
