/**
 * LeetCode DOM Scraper
 *
 * LeetCode is a React SPA with obfuscated class names that change on every deploy.
 * This scraper uses a 5-tier fallback strategy for each data point so it stays
 * resilient across LeetCode updates.
 *
 * IMPORTANT: This runs in the content script context, so it has full access
 * to the LeetCode page DOM and the global `window` object.
 */

import { LeetCodeContext } from "../types/storage";

// ── Individual scrapers ───────────────────────────────────────

function scrapeTitle(): string {
  // Tier 1: data-cy attribute (most stable)
  const byCy = document.querySelector<HTMLElement>('[data-cy="question-title"]');
  if (byCy?.textContent) return byCy.textContent.trim();

  // Tier 2: Semantic class
  const byClass = document.querySelector<HTMLElement>(".text-title-large");
  if (byClass?.textContent) return byClass.textContent.trim();

  // Tier 3: First h1 on the page
  const byH1 = document.querySelector<HTMLElement>("h1");
  if (byH1?.textContent) return byH1.textContent.trim();

  // Tier 4: Page title (always available, but includes " - LeetCode" suffix)
  return document.title.replace(" - LeetCode", "").trim();
}

function scrapeDifficulty(): string {
  // Tier 1: Known difficulty class names (LeetCode uses these for coloring)
  const easy = document.querySelector("[class*='difficulty-easy'], [class*='text-difficulty-easy']");
  if (easy) return "Easy";
  const medium = document.querySelector("[class*='difficulty-medium'], [class*='text-difficulty-medium']");
  if (medium) return "Medium";
  const hard = document.querySelector("[class*='difficulty-hard'], [class*='text-difficulty-hard']");
  if (hard) return "Hard";

  // Tier 2: Find elements containing difficulty text
  const all = document.querySelectorAll<HTMLElement>("span, div");
  for (const el of all) {
    const text = el.textContent?.trim();
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      return text;
    }
  }

  return "";
}

function scrapeDescription(): string {
  // Tier 1: Known obfuscated class (check DevTools — this changes)
  const byObfuscated = document.querySelector<HTMLElement>(".elfjS");
  if (byObfuscated?.textContent) return byObfuscated.textContent.trim();

  // Tier 2: data-key attribute
  const byDataKey = document.querySelector<HTMLElement>('[data-key="description-content"]');
  if (byDataKey?.textContent) return byDataKey.textContent.trim();

  // Tier 3: Look for the main content div in the problem view
  const byContent = document.querySelector<HTMLElement>('[class*="content__"]');
  if (byContent?.textContent) return byContent.textContent.trim();

  // Tier 4: Article tag (sometimes LeetCode wraps content in article)
  const article = document.querySelector<HTMLElement>("article");
  if (article?.textContent) return article.textContent.trim();

  return "";
}

function scrapeUserCode(): string {
  // Tier 1: Monaco Editor global — most reliable, gives exact text
  const monacoWindow = window as Window & {
    monaco?: {
      editor: {
        getModels: () => Array<{ getValue: () => string; getLanguageId: () => string }>;
      };
    };
  };

  if (monacoWindow.monaco?.editor) {
    try {
      const models = monacoWindow.monaco.editor.getModels();
      if (models.length > 0) {
        // LeetCode has multiple models (stubs, read-only, user code)
        // The user's editable code is always the longest model
        const userModel = models.reduce((a, b) =>
          a.getValue().length >= b.getValue().length ? a : b
        );
        const code = userModel.getValue();
        if (code.trim()) return code;
      }
    } catch {
      // Monaco not ready yet, fall through
    }
  }

  // Tier 2: Read the rendered view lines from CodeMirror/Monaco DOM
  const viewLines = document.querySelectorAll<HTMLElement>(".view-line");
  if (viewLines.length > 0) {
    return Array.from(viewLines)
      .map((line) => line.textContent || "")
      .join("\n")
      .trim();
  }

  // Tier 3: CodeMirror 6 (newer versions of LeetCode)
  const cmContent = document.querySelector<HTMLElement>(".cm-content");
  if (cmContent?.textContent) return cmContent.textContent.trim();

  return "";
}

function scrapeLanguage(): string {
  // Tier 1: Ant Design select (LeetCode's language dropdown)
  const antSelect = document.querySelector<HTMLElement>(".ant-select-selection-item");
  if (antSelect?.textContent) return antSelect.textContent.trim().toLowerCase();

  // Tier 2: URL parameter (?lang=python3)
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get("lang");
  if (langParam) return langParam.toLowerCase();

  return "python";
}

function getSlugFromUrl(): string {
  // URL format: https://leetcode.com/problems/two-sum/
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match?.[1] ?? "";
}

// ── Main scrape function ──────────────────────────────────────

export function scrapeLeetCode(): LeetCodeContext | null {
  const slug = getSlugFromUrl();
  if (!slug) return null; // Not on a problem page

  return {
    slug,
    title: scrapeTitle(),
    difficulty: scrapeDifficulty(),
    description: scrapeDescription(),
    userCode: scrapeUserCode(),
    language: scrapeLanguage(),
    scrapedAt: new Date().toISOString(),
  };
}
