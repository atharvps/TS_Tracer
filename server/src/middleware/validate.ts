import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

/**
 * Zod validation middleware factory.
 * Usage: router.post("/chat", validate(chatSchema), chatController)
 *
 * If the body doesn't match the schema, it sends a 400 with
 * a clear error message instead of crashing the server.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request body.",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace req.body with the validated + typed data
    req.body = result.data;
    next();
  };
}

// ---- Request body schema for POST /api/chat ----

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
});

export const ChatRequestSchema = z.object({
  // Chat history (last N messages for context)
  messages: z.array(ChatMessageSchema).min(1).max(50),
  // LeetCode problem context scraped from the page
  problemContext: z.object({
    title: z.string().max(200),
    difficulty: z.string().max(20),
    description: z.string().max(8000),
    userCode: z.string().max(10000),
    language: z.string().max(50),
  }),
  // Which AI mode to use
  isSocraticMode: z.boolean(),
  // Gemini model to use
  model: z.string().default("gemini-2.0-flash"),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
