// server/index.js — Express API in front of Gemini.
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

const chatsRouter = require("./routes/chats");
const { MODEL_NAME } = require("./gemini");
const { DB_PATH } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const BUILD_DIR = path.join(__dirname, "..", "build");

// Only trust proxy headers when we are actually behind one; trusting them
// blindly lets a client spoof its IP and walk past the rate limiter.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

app.use(cors({ origin: CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "1mb" }));

const jsonRateLimit = (options) =>
  rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: "Too many requests. Please slow down." }),
    ...options,
  });

// A generous ceiling for reads, a tight one for the calls that cost API quota.
app.use("/api", jsonRateLimit({ windowMs: 60_000, limit: 120 }));
app.use(
  "/api/chats/:id/messages",
  jsonRateLimit({ windowMs: 60_000, limit: Number(process.env.GENERATE_RATE_LIMIT || 12) })
);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: MODEL_NAME,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.use("/api/chats", chatsRouter);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// In production the API also serves the built React app, so the whole thing
// deploys as one process.
if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(BUILD_DIR, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("Rajinix-AI API is running."));
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  if (res.headersSent) return res.end();
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Rajinix-AI API listening on http://localhost:${PORT}`);
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`Database: ${DB_PATH}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY is not set — generation will fail.");
  }
});

module.exports = app;
