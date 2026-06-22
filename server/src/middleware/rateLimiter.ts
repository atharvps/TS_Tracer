import rateLimit from "express-rate-limit";

/**
 * Rate limiter: max 20 requests per minute per IP.
 * This protects against abuse — a user typically sends
 * far fewer messages than this in normal use.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20,             // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment before sending another message.",
  },
});
