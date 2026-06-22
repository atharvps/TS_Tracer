import "dotenv/config";
import express from "express";
import { corsHandler } from "./middleware/corsHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import chatRouter from "./routes/chat.route.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
// 1. CORS — must be first so preflight OPTIONS requests are handled
app.use(corsHandler);

// 2. Parse JSON bodies (limit to 1mb to avoid large payload abuse)
app.use(express.json({ limit: "1mb" }));

// ── Routes ──────────────────────────────────────────────────
// Health check — use this to verify the server is running
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ts-tracer-proxy", timestamp: new Date().toISOString() });
});

// Chat route
app.use("/api", chatRouter);

// ── Error handler (must be last) ────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ TS_Tracer proxy running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});
