import "dotenv/config";
import express from "express";
import { corsHandler }  from "./middleware/corsHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import chatRouter       from "./routes/chat.route.js";

import path from "path";

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(corsHandler);
app.use(express.json({ limit: "1mb" }));
app.use("/public", express.static(path.join(__dirname, "../../public")));

// ── Routes ───────────────────────────────────────────────────

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ts-tracer-proxy", timestamp: new Date().toISOString() });
});

// ── Privacy Policy ───────────────────────────────────────────
// Required for Microsoft Edge Add-ons Store & Google Play Store submissions.
// Accessible at https://<render-domain>/privacy
app.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TS Tracer Privacy Policy</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0c14;
      color: #e2e8f0;
      line-height: 1.7;
      padding: 48px 24px 80px;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
    }

    /* Brand header */
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 40px;
    }
    .brand-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #14b8a6, #10b981);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 16px rgba(20,184,166,0.4);
    }
    .brand-name {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(to right, #2dd4bf, #34d399, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f0fdfa;
      margin-bottom: 8px;
    }

    .meta {
      font-size: 0.8rem;
      color: #475569;
      margin-bottom: 40px;
      font-family: "JetBrains Mono", monospace;
    }

    h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #14b8a6;
      margin-top: 36px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(20,184,166,0.15);
    }

    p { color: #94a3b8; margin-bottom: 10px; }

    ul {
      color: #94a3b8;
      padding-left: 1.4em;
      margin-bottom: 10px;
    }
    ul li { margin-bottom: 4px; }

    .highlight {
      background: rgba(20,184,166,0.08);
      border: 1px solid rgba(20,184,166,0.2);
      border-radius: 8px;
      padding: 14px 18px;
      margin: 24px 0;
      color: #94a3b8;
      font-size: 0.9rem;
    }

    a { color: #14b8a6; text-decoration: none; }
    a:hover { text-decoration: underline; }

    footer {
      margin-top: 56px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.75rem;
      color: #334155;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="brand">
      <div class="brand-icon">
        <img src="/public/icons/48.png" alt="TS Tracer Logo" style="width: 24px; height: 24px; object-fit: contain;" />
      </div>
      <span class="brand-name">TS_Tracer</span>
    </div>

    <h1>Privacy Policy</h1>
    <p class="meta">Last Updated: June 22, 2026</p>

    <div class="highlight">
      TS Tracer is an AI-powered coding assistant browser extension designed to help
      users understand time and space complexity while solving problems on LeetCode.
      This policy explains what data is handled and how.
    </div>

    <h2>Information We Collect</h2>
    <p>When you use TS Tracer, the following data is processed:</p>
    <ul>
      <li>
        <strong>User prompts and chat messages</strong> — The questions you type are
        forwarded through our proxy server to the Gemini API (Google) to generate
        a response. These messages may be temporarily present in backend infrastructure
        memory during request processing and are not intentionally stored afterward.
      </li>
      <li>
        <strong>LeetCode problem context</strong> — The title, difficulty, description,
        and your current editor code for the active LeetCode problem are included with
        your prompt to provide accurate AI assistance. This data is not intentionally
        retained beyond the duration of a single API request.
      </li>
      <li>
        <strong>Gemini API Key</strong> — Your personal Gemini API key is stored
        exclusively in your browser's local storage (<code>chrome.storage.local</code>)
        and is never transmitted to or stored on our servers. It is sent directly in
        request headers to authenticate with the Gemini API.
      </li>
    </ul>

    <h2>Information We Do Not Collect</h2>
    <ul>
      <li>We do <strong>not</strong> collect your name, email address, or any account information.</li>
      <li>We do <strong>not</strong> use cookies, tracking pixels, or fingerprinting.</li>
      <li>We do <strong>not</strong> collect analytics or usage statistics.</li>
      <li>We do <strong>not</strong> record browsing history outside of the active LeetCode problem page.</li>
      <li>We do <strong>not</strong> store your API key on our servers.</li>
      <li>We do <strong>not</strong> sell, rent, or trade any user data to third parties.</li>
    </ul>

    <h2>How We Use Information</h2>
    <p>
      Data sent through our proxy is used solely to forward your request to the
      Gemini API and stream the AI-generated response back to your browser.
      No processing, analysis, or secondary use of your prompts occurs on our
      infrastructure beyond this request-response cycle.
    </p>

    <h2>Data Storage</h2>
    <p>
      All persistent data — including your Gemini API key, chat history, and user
      preferences — is stored locally in your browser using
      <code>chrome.storage.local</code>. This data never leaves your device unless
      explicitly included in an API request (i.e., your chat messages sent to Gemini).
    </p>
    <p>
      Our backend proxy server is stateless and does not maintain a database,
      session store, or log of user requests.
    </p>

    <h2>Data Sharing</h2>
    <p>
      We do not sell, share, or disclose your data to any third party except as
      required to operate the service (forwarding your prompt to the Gemini API).
      We do not share data with advertisers, data brokers, or analytics providers.
    </p>

    <h2>Third-Party Services</h2>
    <p>TS Tracer uses the following third-party service:</p>
    <ul>
      <li>
        <strong>Google Gemini API</strong> — Your chat messages and problem context
        are sent to Google's Gemini API to generate AI responses. This transmission
        is governed by
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google's Privacy Policy
        </a>
        and the
        <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer">
          Gemini API Terms of Service
        </a>.
        By using TS Tracer, you agree to those terms.
      </li>
    </ul>

    <h2>Children's Privacy</h2>
    <p>
      TS Tracer is not directed at children under 13. We do not knowingly collect
      personal information from anyone under 13 years of age.
    </p>

    <h2>Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. The "Last Updated" date
      at the top of this page will reflect any changes. Continued use of the
      extension after changes are posted constitutes acceptance of the revised policy.
    </p>

    <h2>Contact</h2>
    <p>
      If you have questions or concerns about this Privacy Policy, please open an
      issue on our GitHub repository or contact the developer directly through the
      Microsoft Edge Add-ons Store listing page.
    </p>

    <footer>
      &copy; 2026 TS_Tracer. All rights reserved. &mdash;
      <a href="/health">Service Status</a>
    </footer>

  </div>
</body>
</html>`);
});

// Chat route
app.use("/api", chatRouter);

// ── Error handler (must be last) ─────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ TS_Tracer proxy running on http://localhost:${PORT}`);
  console.log(`   Health check:  http://localhost:${PORT}/health`);
  console.log(`   Privacy policy: http://localhost:${PORT}/privacy`);
  console.log(`   Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});
