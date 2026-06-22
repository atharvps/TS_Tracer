/**
 * Shared TypeScript interfaces for all parts of the extension.
 * Import these everywhere — they are the single source of truth
 * for the shape of data stored in chrome.storage.local.
 */

// ── Core Data Types ──────────────────────────────────────────

export interface ChatMessage {
  id: string;           // crypto.randomUUID()
  role: "user" | "assistant";
  content: string;
  timestamp: string;    // ISO 8601 date string
  isError?: boolean;    // true if this message represents an error
}

export interface ChatHistory {
  slug: string;          // LeetCode problem slug, e.g. "two-sum"
  problemTitle: string;
  difficulty: string;    // "Easy" | "Medium" | "Hard" | ""
  lastActive: string;    // ISO timestamp of last message
  messages: ChatMessage[];
}

export interface UserPrefs {
  isSocraticMode: boolean;  // true = Socratic, false = Copilot
  theme: "dark" | "light";  // reserved for future use
  model: string;             // e.g. "gemini-2.0-flash"
  proxyUrl: string;          // URL of the Express proxy server
}

// ── Context scraped from LeetCode ───────────────────────────

export interface LeetCodeContext {
  slug: string;
  title: string;
  difficulty: string;
  description: string;
  userCode: string;
  language: string;
  scrapedAt: string; // ISO timestamp
}

// ── Storage key constants ────────────────────────────────────
// Using constants avoids typos when reading/writing to storage.

export const STORAGE_KEYS = {
  API_KEY: "ts_api_key",
  ONBOARDED: "ts_onboarded",
  PREFS: "ts_prefs",
} as const;

export const CHAT_KEY = (slug: string) => `ts_chat_${slug}` as const;

// ── Default values ───────────────────────────────────────────

export const DEFAULT_PREFS: UserPrefs = {
  isSocraticMode: true,
  theme: "dark",
  // gemini-1.5-flash: free tier = 15 RPM, 1 M TPM, 1500 RPD
  // gemini-2.0-flash: free tier limit is 0 for new projects → always 429
  model: "gemini-3.1-flash",
  proxyUrl: "https://ts-tracer-proxy.onrender.com",
};

// ── Message types for chrome.runtime.sendMessage ─────────────

export type ExtensionMessage =
  | { type: "LEETCODE_CONTEXT"; payload: LeetCodeContext }
  | { type: "GET_CONTEXT" }
  | { type: "GET_API_KEY" }
  | { type: "SET_API_KEY"; payload: { key: string } }
  | { type: "CLEAR_API_KEY" }
  | { type: "GET_CHAT_HISTORY"; payload: { slug: string } }
  | { type: "SAVE_MESSAGE"; payload: { slug: string; problemTitle: string; difficulty: string; message: ChatMessage } }
  | { type: "CLEAR_HISTORY"; payload: { slug: string } }
  | { type: "GET_PREFS" }
  | { type: "SET_PREFS"; payload: Partial<UserPrefs> };
