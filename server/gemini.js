// server/gemini.js — thin wrapper around the Gemini SDK.
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// How many past messages get replayed to the model on each turn.
const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT || 20);

const SYSTEM_INSTRUCTION =
  "You are Rajinix, a helpful AI assistant. Answer clearly and accurately. " +
  "Use Markdown for structure, and fenced code blocks with a language tag " +
  "whenever you show code.";

let model = null;

function getModel() {
  if (model) return model;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel(
    { model: MODEL_NAME, systemInstruction: SYSTEM_INSTRUCTION },
    // GEMINI_BASE_URL lets tests point the SDK at a local stub.
    process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined
  );
  return model;
}

// Stored rows -> the shape the SDK wants.
const toContents = (messages) =>
  messages.map(({ role, content }) => ({
    role,
    parts: [{ text: content }],
  }));

/**
 * Streams a reply for the given conversation, yielding text deltas as they
 * arrive. `messages` is oldest-first and already includes the new user turn.
 */
async function* streamReply(messages) {
  const result = await getModel().generateContentStream({
    contents: toContents(messages),
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// First line of the opening prompt, trimmed — good enough for a sidebar label
// and it costs no extra API call.
function titleFromPrompt(prompt) {
  const firstLine = prompt.trim().split("\n")[0].trim();
  if (firstLine.length <= 60) return firstLine || "New chat";
  return `${firstLine.slice(0, 57).trimEnd()}...`;
}

module.exports = {
  MODEL_NAME,
  HISTORY_LIMIT,
  streamReply,
  titleFromPrompt,
  getModel,
};
