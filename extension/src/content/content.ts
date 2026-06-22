/**
 * Content Script — Runs ONLY on leetcode.com/problems/* pages.
 *
 * BUG FIXES applied in this version:
 *  [BUG-5] Selectors for title/description are now a full waterfall with
 *          try/catch around each so one broken selector can't crash the rest.
 *
 *  [BUG-6] Monaco API access: window.monaco is undefined inside isolated
 *          content script worlds. We now read code via the DOM (.view-line)
 *          which is always accessible. The monaco path is kept as a bonus
 *          attempt via a MAIN world script (see note below).
 *
 *  [BUG-7] The debounce guard `context.slug === lastSlug && !context.userCode`
 *          was silently swallowing all updates after first scrape (even code
 *          changes), because userCode was often empty from the Monaco guard.
 *          Fix: track lastSentPayload hash and send whenever content changes.
 *
 *  [BUG-8] The pathObserver was observing document.body with subtree:false
 *          which means it never fires on LeetCode's SPA navigation.
 *          Fix: use a polling check on window.location.href instead.
 */

const LOG = "[TS-ContentScript]";

// ── Simple hash for change detection ─────────────────────────
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

let lastPayloadHash = 0;

// ── Tier-1: Title ─────────────────────────────────────────────
function scrapeTitle(): string {
  try {
    // Tier 1: data-cy attribute (old LeetCode)
    const byCy = document.querySelector<HTMLElement>('[data-cy="question-title"]');
    if (byCy?.textContent?.trim()) return byCy.textContent.trim();

    // Tier 2: large title class (current LeetCode as of 2024)
    const byClass = document.querySelector<HTMLElement>(".text-title-large");
    if (byClass?.textContent?.trim()) return byClass.textContent.trim();

    // Tier 3: any element with the word "title" in class
    const byTitleClass = document.querySelector<HTMLElement>('[class*="title"]');
    if (byTitleClass?.textContent?.trim()) {
      const text = byTitleClass.textContent.trim();
      // Sanity check: title shouldn't be a paragraph
      if (text.length < 120) return text;
    }

    // Tier 4: first h1 on page
    const h1 = document.querySelector<HTMLElement>("h1");
    if (h1?.textContent?.trim()) return h1.textContent.trim();

    // Tier 5: browser tab title
    return document.title.replace(" - LeetCode", "").trim();
  } catch (e) {
    console.warn(LOG, "scrapeTitle error:", e);
    return document.title.replace(" - LeetCode", "").trim();
  }
}

// ── Tier-2: Difficulty ────────────────────────────────────────
function scrapeDifficulty(): string {
  try {
    // Tier 1: text-difficulty-* class pattern
    for (const level of ["easy", "medium", "hard"]) {
      const el = document.querySelector(
        `[class*="text-difficulty-${level}"], [class*="difficulty-${level}"]`
      );
      if (el) return level.charAt(0).toUpperCase() + level.slice(1);
    }

    // Tier 2: scan all spans for exact text match
    const spans = Array.from(document.querySelectorAll<HTMLElement>("span, div"));
    for (const el of spans) {
      const text = el.textContent?.trim();
      if (text === "Easy" || text === "Medium" || text === "Hard") {
        // Verify it's small (not a block of text that happens to contain the word)
        if ((el.childNodes?.length ?? 0) <= 2) return text;
      }
    }
  } catch (e) {
    console.warn(LOG, "scrapeDifficulty error:", e);
  }
  return "";
}

// ── Tier-3: Description ───────────────────────────────────────
function scrapeDescription(): string {
  try {
    // Tier 1: Current LeetCode obfuscated class (changes periodically)
    // The description panel always has a data-track-load attribute
    const byTrack = document.querySelector<HTMLElement>('[data-track-load="description_content"]');
    if (byTrack?.textContent?.trim()) return byTrack.textContent.trim();

    // Tier 2: Obfuscated class names containing "elfjS" (circa 2023-2024)
    const byObfuscated = document.querySelector<HTMLElement>(".elfjS");
    if (byObfuscated?.textContent?.trim()) return byObfuscated.textContent.trim();

    // Tier 3: data-key attribute
    const byDataKey = document.querySelector<HTMLElement>('[data-key="description-content"]');
    if (byDataKey?.textContent?.trim()) return byDataKey.textContent.trim();

    // Tier 4: Any element with "content" in class inside the description tab
    const descTab = document.querySelector<HTMLElement>('[data-label="Description"]');
    if (descTab) {
      const contentEl = descTab.querySelector<HTMLElement>('[class*="content"]');
      if (contentEl?.textContent?.trim()) return contentEl.textContent.trim();
    }

    // Tier 5: First article element (LeetCode often uses article for problem body)
    const article = document.querySelector<HTMLElement>("article");
    if (article?.textContent?.trim()) return article.textContent.trim();

    // Tier 6: Broadest fallback — any div with class containing "description"
    const descDiv = document.querySelector<HTMLElement>('[class*="description"]');
    if (descDiv?.textContent?.trim() && descDiv.textContent.length > 30) {
      return descDiv.textContent.trim();
    }
  } catch (e) {
    console.warn(LOG, "scrapeDescription error:", e);
  }
  return "";
}

// ── Tier-4: User Code ─────────────────────────────────────────
// NOTE: window.monaco is NOT accessible from isolated content script worlds.
// We read the visible DOM instead — this is always reliable.
function scrapeUserCode(): string {
  try {
    // Tier 1: Monaco editor's rendered .view-lines (current LeetCode)
    const viewLines = document.querySelectorAll<HTMLElement>(".view-lines .view-line");
    if (viewLines.length > 0) {
      return Array.from(viewLines)
        .map((line) => line.textContent ?? "")
        .join("\n")
        .trim();
    }

    // Tier 2: CodeMirror 6 (some LeetCode beta pages)
    const cmContent = document.querySelector<HTMLElement>(".cm-content");
    if (cmContent?.textContent?.trim()) return cmContent.textContent.trim();

    // Tier 3: Generic editor textarea
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.monaco-editor textarea, [class*="editor"] textarea'
    );
    if (textarea?.value?.trim()) return textarea.value.trim();

    // Tier 4: Any pre element with code (last resort)
    const pre = document.querySelector<HTMLElement>("pre code");
    if (pre?.textContent?.trim()) return pre.textContent.trim();
  } catch (e) {
    console.warn(LOG, "scrapeUserCode error:", e);
  }
  return "";
}

// ── Tier-5: Language ──────────────────────────────────────────
function scrapeLanguage(): string {
  try {
    // Look for the text inside the language selector button next to the Auto/Format buttons
    const langButton = document.querySelector('button[id*="languages"], [class*="language-select"]');
    if (langButton) {
      return langButton.textContent?.trim().toLowerCase() || 'unknown';
    }
    
    // Fallback search: look through elements matching common language text structures
    const buttons = Array.from(document.querySelectorAll('button'));
    const foundLang = buttons.find(b => {
      const txt = b.textContent?.trim().toLowerCase() || '';
      return ['c++', 'java', 'python', 'python3', 'javascript', 'typescript', 'c', 'go', 'rust'].includes(txt);
    });
    
    if (foundLang) return foundLang.textContent?.trim().toLowerCase() || 'unknown';
  } catch (e) {
    console.error(LOG, "Error scraping language:", e);
  }
  return 'unknown';
}

// ── Slug ──────────────────────────────────────────────────────
function getSlug(): string {
  const match = window.location.pathname.match(/\/problems\/([^/?#]+)/);
  return match?.[1] ?? "";
}

// ── Core: Scrape & Send ───────────────────────────────────────
function scrapeAndSend(): void {
  const slug = getSlug();
  if (!slug) {
    console.log(LOG, "No problem slug found — not on a problem page.");
    return;
  }

  const context = {
    slug,
    title:       scrapeTitle(),
    difficulty:  scrapeDifficulty(),
    description: scrapeDescription(),
    userCode:    scrapeUserCode(),
    language:    scrapeLanguage(),
    scrapedAt:   new Date().toISOString(),
  };

  // BUG-7 FIX: Use content hash to detect any change, not just slug change
  const payloadStr = `${slug}|${context.title}|${context.userCode}|${context.description.slice(0, 100)}`;
  const hash = hashString(payloadStr);

  if (hash === lastPayloadHash) {
    console.log(LOG, "Context unchanged — skipping send.");
    return;
  }
  lastPayloadHash = hash;

  console.log(LOG, "Sending context:", {
    slug:        context.slug,
    title:       context.title,
    difficulty:  context.difficulty,
    hasCode:     context.userCode.length > 0,
    descLength:  context.description.length,
    language:    context.language,
  });

  chrome.runtime.sendMessage({ type: "LEETCODE_CONTEXT", payload: context })
    .then(() => console.log(LOG, "Context delivered to service worker."))
    .catch((err) => {
      // SW may be inactive on first load — this resolves itself on next scrape
      console.warn(LOG, "Could not deliver context (SW may be sleeping):", err?.message);
    });
}

// ── Debounce ──────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedScrape(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scrapeAndSend, 600);
}

// ── Monaco Editor Observer ────────────────────────────────────
const editorObserver = new MutationObserver(debouncedScrape);

function attachEditorObserver(): void {
  const container = document.querySelector(".monaco-editor, .cm-editor");
  if (container) {
    editorObserver.observe(container, {
      childList:     true,
      subtree:       true,
      characterData: true,
    });
    console.log(LOG, "Editor MutationObserver attached.");
  } else {
    console.log(LOG, "Editor container not found yet — will retry.");
  }
}

// ── BUG-8 FIX: SPA Navigation via polling ─────────────────────
// LeetCode uses React Router — the URL changes without a page reload.
// pathObserver on document.body fires too rarely; href polling is reliable.
let lastHref = window.location.href;

setInterval(() => {
  const currentHref = window.location.href;
  if (currentHref !== lastHref) {
    lastHref = currentHref;
    lastPayloadHash = 0; // Force re-send on problem switch
    console.log(LOG, "SPA navigation detected — new URL:", currentHref);
    // Give React time to render the new problem
    setTimeout(scrapeAndSend, 2000);
    // Try to re-attach the editor observer for the new problem
    setTimeout(attachEditorObserver, 3000);
  }
}, 1000);

// ── Initial scrape sequence ───────────────────────────────────
// Multiple attempts because LeetCode's React app renders asynchronously
console.log(LOG, "Content script loaded on:", window.location.href);
setTimeout(scrapeAndSend, 1000);   // First attempt
setTimeout(scrapeAndSend, 2500);   // Retry after React settles
setTimeout(attachEditorObserver, 2000);
setTimeout(attachEditorObserver, 5000); // Retry editor attach
