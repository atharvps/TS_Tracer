import { Request, Response } from "express";
import { ChatRequest } from "../middleware/validate.js";
import { streamGeminiResponse } from "../services/gemini.service.js";

/**
 * POST /api/chat controller
 *
 * This is the only controller we need. It:
 * 1. Extracts the Gemini API key from the Authorization header
 * 2. Validates the key format (basic check)
 * 3. Delegates to the Gemini streaming service
 */
export async function chatController(
  req: Request,
  res: Response
): Promise<void> {
  // 1. Extract API key from "Authorization: Bearer <key>" header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Missing API key. Include it as: Authorization: Bearer <your-gemini-key>",
    });
    return;
  }

  const apiKey = authHeader.slice(7).trim(); // Remove "Bearer " prefix

  // 2. Basic key format check.
  // Accepts both legacy "AIza..." keys and the new "AQ...." format
  // issued by Google AI Studio as of mid-2026.
  const isLegacyKey = apiKey.startsWith("AIza") && apiKey.length >= 30;
  const isNewKey = apiKey.startsWith("AQ.") && apiKey.length >= 20;

  if (!isLegacyKey && !isNewKey) {
    res.status(401).json({
      error:
        "Invalid Gemini API key format. Keys should start with 'AIza' (legacy) or 'AQ.' (new format).",
    });
    return;
  }

  // 3. Stream the response (the service handles SSE headers and piping)
  const body = req.body as ChatRequest;
  await streamGeminiResponse(apiKey, body, res);
}
