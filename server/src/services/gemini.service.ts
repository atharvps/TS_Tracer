import {
  GoogleGenerativeAI,
  Content,
  GenerateContentStreamResult,
} from "@google/generative-ai";
import { Response } from "express";
import { ChatRequest } from "../middleware/validate.js";
import { getSystemPrompt } from "../prompts/system.js";

/**
 * Parses the retryDelay seconds from a Gemini 429 error object.
 * The SDK throws a GoogleGenerativeAIError whose message embeds the full
 * JSON body — we pull retryDelay out of it so we can forward it to the client.
 */
function parseRetryDelay(err: unknown): number | null {
  try {
    const msg = err instanceof Error ? err.message : "";
    // Look for "retryDelay":"33s" or "retryDelay":"33.46s"
    const match = msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
    if (match) return Math.ceil(parseFloat(match[1]));
  } catch {
    // ignore parse failures
  }
  return null;
}

/**
 * Returns true if the error is a Gemini quota / rate-limit error (HTTP 429).
 */
function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded")
  );
}

/**
 * Streams a Gemini response back to the client using Server-Sent Events (SSE).
 *
 * Error handling:
 *  - 429 rate-limit → sends { error, code: "RATE_LIMIT", retryAfter } so the
 *    client can show a countdown instead of a generic red message.
 *  - All other errors → sends { error } and closes the stream.
 */
export async function streamGeminiResponse(
  apiKey: string,
  body: ChatRequest,
  res: Response
): Promise<void> {
  // 1. Initialize the Gemini client (stateless — one instance per request)
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  // 2. System prompt based on Socratic vs. Copilot mode
  const systemInstruction = getSystemPrompt(body.isSocraticMode);

  // 3. Build problem context string prepended to the conversation
  const { title, difficulty, description, userCode, language } = body.problemContext;

  const contextMessage = `
PROBLEM: ${title} [${difficulty}]

PROBLEM DESCRIPTION:
${description}

CANDIDATE'S CURRENT CODE (${language}):
\`\`\`${language}
${userCode || "// No code written yet"}
\`\`\`
`.trim();

  // 4. Build Gemini Content history
  const history: Content[] = [
    {
      role: "user",
      parts: [{ text: contextMessage }],
    },
    {
      role: "model",
      parts: [
        {
          text: "I've reviewed the problem and the current code. I'm ready to help. What's your question?",
        },
      ],
    },
    ...body.messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: msg.content }],
    })),
  ];

  const latestMessage = body.messages[body.messages.length - 1].content;

  // 5. Set SSE headers BEFORE writing anything
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Prevents Nginx/Render buffering
  res.flushHeaders();

  try {
    // 6. Start chat and stream
    const chat = model.startChat({
      history,
      systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
    });

    const result: GenerateContentStreamResult =
      await chat.sendMessageStream(latestMessage);

    for await (const chunk of result.stream) {
      const token = chunk.text();
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (err) {
    // ── Rate limit / quota exceeded ─────────────────────────────
    if (isRateLimitError(err)) {
      const retryAfter = parseRetryDelay(err);
      const message = retryAfter
        ? `Rate limit hit. Gemini says: retry in ${retryAfter}s. (Model: ${body.model})`
        : `Rate limit hit. Please wait a moment before trying again. (Model: ${body.model})`;

      console.warn(`[TS-Server] 429 Rate limit on model '${body.model}'. retryAfter=${retryAfter}s`);

      res.write(
        `data: ${JSON.stringify({
          error:      message,
          code:       "RATE_LIMIT",
          retryAfter: retryAfter ?? 60,
          model:      body.model,
        })}\n\n`
      );
      res.end();
      return;
    }

    // ── Invalid API key ─────────────────────────────────────────
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      res.write(
        `data: ${JSON.stringify({
          error: "Invalid API key. Please re-enter your Gemini key in settings.",
          code:  "INVALID_KEY",
        })}\n\n`
      );
      res.end();
      return;
    }

    // ── Generic / unexpected error ──────────────────────────────
    const errorMessage = err instanceof Error ? err.message : "Gemini API error.";
    console.error("[TS-Server] Stream error:", errorMessage);
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
}
