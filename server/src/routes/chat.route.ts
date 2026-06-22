import { Router } from "express";
import { validate, ChatRequestSchema } from "../middleware/validate.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";
import { chatController } from "../controllers/chat.controller.js";

const router = Router();

/**
 * POST /api/chat
 *
 * Middleware chain:
 * 1. chatRateLimiter  — reject if too many requests
 * 2. validate(schema) — reject if body doesn't match schema
 * 3. chatController   — extract key, stream Gemini response
 */
router.post(
  "/chat",
  chatRateLimiter,
  validate(ChatRequestSchema),
  chatController
);

export default router;
