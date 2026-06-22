/**
 * useLeetCode — Receives scraped LeetCode context from the service worker.
 *
 * BUG FIXES applied in this version:
 *  [BUG-9]  On mount, GET_CONTEXT may return null because the content script
 *           hasn't scraped yet OR the SW just restarted (cold). Previously
 *           the hook would just show "null" forever. Fix: if the first
 *           response is null, retry up to 3 times with exponential backoff.
 *
 *  [BUG-10] No chrome.runtime.lastError check in the sendMessage callback
 *           caused silent failures when the SW was unreachable.
 *
 *  [BUG-11] chrome.storage.onChanged listener added for real-time context
 *           updates (e.g., when the user clears storage or another tab
 *           navigates to a new problem).
 */

import { useState, useEffect, useCallback } from "react";
import { LeetCodeContext } from "@types-ext/storage.ts";

const LOG = "[TS-SidePanel][useLeetCode]";

interface UseLeetCodeReturn {
  context: LeetCodeContext | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useLeetCode(): UseLeetCodeReturn {
  const [context, setContext]     = useState<LeetCodeContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // BUG-9 FIX: Fetch with retry logic
  const fetchContext = useCallback((attempt = 0) => {
    console.log(LOG, `Requesting context from SW (attempt ${attempt + 1})...`);
    setIsLoading(true);

    chrome.runtime.sendMessage({ type: "GET_CONTEXT" }, (response) => {
      // BUG-10 FIX: Always check lastError first
      if (chrome.runtime.lastError) {
        console.error(LOG, "GET_CONTEXT failed:", chrome.runtime.lastError.message);
        setIsLoading(false);
        return;
      }

      const ctx = response?.context ?? null;

      if (!ctx && attempt < 3) {
        // Context is null — SW might be cold starting, content script not run yet.
        // Retry with exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        console.log(LOG, `Context null — retrying in ${delay}ms...`);
        setTimeout(() => fetchContext(attempt + 1), delay);
      } else {
        if (ctx) {
          console.log(LOG, "Context received:", {
            slug:      ctx.slug,
            title:     ctx.title,
            hasCode:   ctx.userCode?.length > 0,
            difficulty: ctx.difficulty,
          });
        } else {
          console.log(LOG, "Context is null after all retries — not on a LeetCode problem page.");
        }
        setContext(ctx);
        setIsLoading(false);
        setRetryCount(0);
      }
    });
  }, []);

  useEffect(() => {
    // 1. Request context on mount
    fetchContext();

    // 2. Listen for live CONTEXT_UPDATE broadcasts from the background script
    //    (fired when the content script scrapes a new problem)
    const onMessage = (message: { type: string; payload?: LeetCodeContext }) => {
      if (message.type === "CONTEXT_UPDATE" && message.payload) {
        console.log(LOG, "CONTEXT_UPDATE received via broadcast:", message.payload.slug);
        setContext(message.payload);
        setIsLoading(false);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);

    // 3. BUG-11 FIX: Listen to chrome.storage.onChanged for context updates
    //    that happen when the SW updates storage (survives SW restarts)
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local") return;

      if (changes["ts_latest_context"]) {
        const newCtx = changes["ts_latest_context"].newValue as LeetCodeContext | undefined;
        console.log(LOG, "Storage context updated:", newCtx?.slug ?? "cleared");
        setContext(newCtx ?? null);
        setIsLoading(false);
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, [fetchContext]);

  return {
    context,
    isLoading,
    refresh: () => {
      setRetryCount(0);
      fetchContext(0);
    },
  };
}
