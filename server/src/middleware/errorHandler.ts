import { Request, Response, NextFunction } from "express";

/**
 * Central error handler — Express calls this when any middleware
 * calls next(error) or throws inside an async handler.
 *
 * Always returns JSON so the extension gets a parseable error object.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error(`[Error] ${err.message}`);

  // CORS errors
  if (err.message.startsWith("CORS:")) {
    res.status(403).json({ error: err.message });
    return;
  }

  // Default 500
  res.status(500).json({
    error: "An internal server error occurred. Please try again.",
  });
}
