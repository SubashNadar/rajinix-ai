// server/routes/chats.js — chat CRUD plus the streaming completion endpoint.
const { randomUUID } = require("node:crypto");
const express = require("express");

const store = require("../db");
const { streamReply, titleFromPrompt, HISTORY_LIMIT } = require("../gemini");

const MAX_PROMPT_LENGTH = Number(process.env.MAX_PROMPT_LENGTH || 8000);
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const router = express.Router();

/**
 * Every request carries an `x-client-id` the browser generates once and keeps
 * in localStorage. It scopes chats to a browser so two people no longer share
 * one conversation; it is NOT authentication, since anyone can send any id.
 * Real accounts are the next step if this is ever exposed publicly.
 */
router.use((req, res, next) => {
  const clientId = req.get("x-client-id");
  if (!clientId || !CLIENT_ID_PATTERN.test(clientId)) {
    return res.status(400).json({ error: "A valid x-client-id header is required." });
  }
  req.clientId = clientId;
  next();
});

// Loads the chat named in the path, or 404s.
function loadChat(req, res, next) {
  const chat = store.getChat(req.params.id, req.clientId);
  if (!chat) return res.status(404).json({ error: "Chat not found." });
  req.chat = chat;
  next();
}

router.get("/", (req, res) => {
  res.json({ chats: store.listChats(req.clientId) });
});

router.post("/", (req, res) => {
  const title =
    typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim().slice(0, 120)
      : "New chat";
  res.status(201).json({ chat: store.createChat(randomUUID(), req.clientId, title) });
});

router.get("/:id", loadChat, (req, res) => {
  res.json({ chat: req.chat, messages: store.listMessages(req.chat.id) });
});

router.delete("/:id", loadChat, (req, res) => {
  store.deleteChat(req.chat.id, req.clientId);
  res.status(204).end();
});

router.post("/:id/messages", loadChat, async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required in the request body." });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res
      .status(413)
      .json({ error: `Prompt is too long (limit ${MAX_PROMPT_LENGTH} characters).` });
  }

  const isFirstMessage = store.countMessages(req.chat.id) === 0;
  store.addMessage(req.chat.id, "user", prompt);
  if (isFirstMessage) store.renameChat(req.chat.id, titleFromPrompt(prompt));

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // keeps nginx-style proxies from buffering the stream
  });
  res.flushHeaders?.();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // The browser closing the tab should stop us mid-stream, not leave the
  // request hanging — we keep whatever text arrived before that.
  let clientGone = false;
  res.on("close", () => {
    clientGone = true;
  });

  send("start", { chatId: req.chat.id, title: store.getChat(req.chat.id, req.clientId).title });

  let answer = "";
  try {
    for await (const delta of streamReply(
      store.recentMessages(req.chat.id, HISTORY_LIMIT)
    )) {
      if (clientGone) break;
      answer += delta;
      send("delta", { text: delta });
    }

    if (answer) store.addMessage(req.chat.id, "model", answer);
    if (!clientGone) send("done", { text: answer, truncated: false });
  } catch (error) {
    console.error("Streaming failed:", error);
    // Partial text is still worth keeping so a reload shows what the user saw.
    if (answer) store.addMessage(req.chat.id, "model", answer);
    if (!clientGone) {
      send("error", {
        error: "Failed to get a response from the AI service.",
        partial: Boolean(answer),
      });
    }
  } finally {
    res.end();
  }
});

module.exports = router;
