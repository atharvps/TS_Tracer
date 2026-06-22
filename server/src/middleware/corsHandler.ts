import cors from "cors";

/**
 * CORS handler for Chrome Extension origins.
 *
 * Standard CORS origin checks break for Chrome extensions because
 * their origin looks like: chrome-extension://abcdef123456...
 * This custom handler explicitly allows those origins.
 */
export const corsHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Allow all Chrome and Edge extension origins during development
    // In production, optionally restrict to your specific extension ID
    if (origin.startsWith("chrome-extension://") || origin.startsWith("extension://")) {
      return callback(null, true);
    }

    // Allow localhost for development testing
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
  },
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Provider"],
  credentials: false,
});
