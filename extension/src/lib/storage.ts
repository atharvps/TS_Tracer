/**
 * Type-safe chrome.storage.local helpers.
 *
 * These wrap the callback-based Chrome API in Promises so we can
 * use async/await throughout the codebase — much cleaner to read.
 */

import {
  ChatHistory,
  UserPrefs,
  STORAGE_KEYS,
  CHAT_KEY,
  DEFAULT_PREFS,
} from "../types/storage";

// ── Generic get/set helpers ───────────────────────────────────

/** Read a single key from storage. Returns undefined if not set. */
async function get<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

/** Write a single key to storage. */
async function set(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/** Remove a key from storage. */
async function remove(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

// ── API Key ───────────────────────────────────────────────────

export async function getApiKey(): Promise<string | undefined> {
  return get<string>(STORAGE_KEYS.API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await set(STORAGE_KEYS.API_KEY, key);
  await set(STORAGE_KEYS.ONBOARDED, true);
}

export async function clearApiKey(): Promise<void> {
  await remove(STORAGE_KEYS.API_KEY);
  await set(STORAGE_KEYS.ONBOARDED, false);
}

export async function isOnboarded(): Promise<boolean> {
  const val = await get<boolean>(STORAGE_KEYS.ONBOARDED);
  return val === true;
}

// ── User Preferences ─────────────────────────────────────────

export async function getPrefs(): Promise<UserPrefs> {
  const stored = await get<UserPrefs>(STORAGE_KEYS.PREFS);
  // Merge with defaults so new prefs added in future versions
  // don't break existing users' stored data.
  return { ...DEFAULT_PREFS, ...stored };
}

export async function setPrefs(updates: Partial<UserPrefs>): Promise<void> {
  const current = await getPrefs();
  await set(STORAGE_KEYS.PREFS, { ...current, ...updates });
}

// ── Chat History ──────────────────────────────────────────────

export async function getChatHistory(slug: string): Promise<ChatHistory | undefined> {
  return get<ChatHistory>(CHAT_KEY(slug));
}

export async function saveChatHistory(history: ChatHistory): Promise<void> {
  await set(CHAT_KEY(history.slug), history);
}

export async function clearChatHistory(slug: string): Promise<void> {
  await remove(CHAT_KEY(slug));
}

/**
 * Get all chat histories (for a history sidebar or stats page).
 * Finds all keys that start with "ts_chat_" and returns their values.
 */
export async function getAllChatHistories(): Promise<ChatHistory[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allItems) => {
      const histories = Object.entries(allItems)
        .filter(([key]) => key.startsWith("ts_chat_"))
        .map(([, value]) => value as ChatHistory)
        .sort((a, b) => b.lastActive.localeCompare(a.lastActive));
      resolve(histories);
    });
  });
}
