/**
 * Gemini API key validator.
 *
 * Google AI Studio currently issues keys in two formats:
 *
 * Legacy format:  AIza[A-Za-z0-9\-_]{35,}   (~39 chars total)
 *   Example:      AIzaSyB3...
 *
 * New format:     AQ.[A-Za-z0-9\-_.]{30,}   (variable length)
 *   Example:      AQ.AbCdEf...
 *
 * Both formats are accepted by the Gemini SDK — we just need to
 * allow either prefix in our format checks.
 */

// Matches both legacy "AIza..." and new "AQ...." key formats
const GEMINI_KEY_REGEX = /^(AIza|AQ\.)[A-Za-z0-9\-_.]+$/;

export function isValidGeminiKey(key: string): boolean {
  return GEMINI_KEY_REGEX.test(key.trim());
}

export function sanitizeKey(key: string): string {
  return key.trim();
}

/**
 * Detects which key format a given key uses.
 * Useful for showing a relevant hint in the UI.
 */
export function getKeyFormat(key: string): "legacy" | "new" | "unknown" {
  const trimmed = key.trim();
  if (trimmed.startsWith("AIza")) return "legacy";
  if (trimmed.startsWith("AQ.")) return "new";
  return "unknown";
}

/**
 * Returns a masked version of the key for display purposes.
 * Never shows the full key in the UI.
 * e.g. "AIzaSyBk...xQr9" or "AQ.AbCd...Ef12"
 */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length < 10) return "•••••••••";
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}
