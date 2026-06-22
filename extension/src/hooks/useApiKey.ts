/**
 * useApiKey — Manages reading, writing, and validating the Gemini API key.
 *
 * BUG FIXES applied in this version:
 *  [BUG-12] clearKey() was calling chrome.storage.local.remove directly
 *           from the side panel. This bypasses the service worker and can
 *           fail silently in MV3. Fix: route through SW via CLEAR_API_KEY.
 *
 *  [BUG-13] No chrome.storage.onChanged listener. If the user updates their
 *           key in the popup while the side panel is open, the side panel
 *           stayed on the old (onboarding) screen. Fix: listen for changes
 *           and update local state immediately.
 *
 *  [BUG-14] isLoading was never reset if chrome.runtime.lastError fired
 *           during initial GET_API_KEY, causing an infinite spinner.
 */

import { useState, useEffect, useCallback } from "react";
import { isValidGeminiKey, sanitizeKey } from "@lib/validators.ts";

const LOG = "[TS-SidePanel][useApiKey]";

interface UseApiKeyReturn {
  apiKey:       string | null;
  isLoading:    boolean;
  isSaving:     boolean;
  error:        string | null;
  isOnboarded:  boolean;
  saveKey:      (key: string) => Promise<boolean>;
  clearKey:     () => void;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey,      setApiKey]      = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Load the key from storage on mount
  useEffect(() => {
    console.log(LOG, "Loading API key from storage...");

    chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (response) => {
      // BUG-14 FIX: Handle runtime errors and always clear loading state
      if (chrome.runtime.lastError) {
        console.error(LOG, "GET_API_KEY error:", chrome.runtime.lastError.message);
        setIsLoading(false);
        return;
      }

      const key = response?.key ?? null;
      console.log(LOG, "API key loaded:", key ? "present" : "not set");
      setApiKey(key);
      setIsOnboarded(!!key);
      setIsLoading(false);
    });

    // BUG-13 FIX: Listen for storage changes so the UI updates in real-time
    // if the user saves/clears their key in the popup.
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local") return;

      if ("ts_api_key" in changes) {
        const newKey = changes["ts_api_key"].newValue as string | undefined;
        console.log(LOG, "Storage key changed externally:", newKey ? "key set" : "key cleared");
        setApiKey(newKey ?? null);
        setIsOnboarded(!!newKey);
      }
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  // Save a new key (validates format first, then routes through SW)
  const saveKey = useCallback(async (rawKey: string): Promise<boolean> => {
    const key = sanitizeKey(rawKey);
    setError(null);

    if (!isValidGeminiKey(key)) {
      const msg = "Invalid key format. Keys start with 'AIza' (legacy) or 'AQ.' (new).";
      console.warn(LOG, "saveKey: invalid format →", key.slice(0, 8));
      setError(msg);
      return false;
    }

    setIsSaving(true);
    console.log(LOG, "saveKey: saving key to storage via SW...");

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SET_API_KEY", payload: { key } }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(LOG, "SET_API_KEY error:", chrome.runtime.lastError.message);
          setError("Failed to save key. Please try again.");
          setIsSaving(false);
          resolve(false);
          return;
        }
        console.log(LOG, "Key saved successfully.");
        setApiKey(key);
        setIsOnboarded(true);
        setIsSaving(false);
        resolve(true);
      });
    });
  }, []);

  // BUG-12 FIX: Route clearKey through the service worker (not direct storage)
  const clearKey = useCallback(() => {
    console.log(LOG, "clearKey: removing API key via SW...");
    setApiKey(null);
    setIsOnboarded(false);
    // Optimistically clear local state, then tell the SW
    chrome.runtime.sendMessage({ type: "CLEAR_API_KEY" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(LOG, "CLEAR_API_KEY error:", chrome.runtime.lastError.message);
      } else {
        console.log(LOG, "API key cleared:", response);
      }
    });
  }, []);

  return { apiKey, isLoading, isSaving, error, isOnboarded, saveKey, clearKey };
}
