# Rajinix-AI

A streaming AI chat app built on Google's Gemini API — a React front end and an
Express backend that keeps the API key server-side and stores conversations in
SQLite.

## Features

- Streaming replies (Server-Sent Events) with a stop button
- Conversations persisted per browser and restored on reload
- Sidebar chat list: create, switch, delete
- Full Markdown rendering — tables, lists, syntax-highlighted code with copy
- Rate limiting on the endpoints that spend API quota

## Quick start

```bash
npm install
cp .env.example .env     # then add your GEMINI_API_KEY
npm run dev              # React on :3000, API on :3001
```

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
See [CLIENT_SETUP.md](CLIENT_SETUP.md) for the detailed guide and troubleshooting.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the React dev server and the API together |
| `npm start` | React dev server only, on port 3000 |
| `npm run server` | API server only, on port 3001 |
| `npm test` | Jest test suite |
| `npm run build` | Production build into `build/` |

In production the API serves `build/` too, so `npm run build && npm run server`
runs the whole app as one process.

## Configuration

Everything is set through environment variables — see `.env.example`.
`GEMINI_API_KEY` is the only required one.

## Architecture

```
src/                      React app
  api.js                  REST + SSE client
  components/
    AiInteraction.jsx     chat container: history, streaming, state
    ChatSidebar.jsx       conversation list
    MarkdownMessage.jsx   Markdown + code blocks

server/                   Express API
  index.js                app wiring, rate limits, static build
  db.js                   SQLite schema and queries
  gemini.js               Gemini client and streaming
  routes/chats.js         chat CRUD + SSE endpoint
```

## API

Every request needs an `x-client-id` header — a per-browser id that scopes
conversations to whoever created them. It is not authentication.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Status, active model, whether a key is configured |
| `GET` | `/api/chats` | List conversations |
| `POST` | `/api/chats` | Create a conversation |
| `GET` | `/api/chats/:id` | Conversation with its messages |
| `DELETE` | `/api/chats/:id` | Delete a conversation |
| `POST` | `/api/chats/:id/messages` | Send a prompt, stream the reply over SSE |

The streaming endpoint emits `start`, `delta`, `done` and `error` events:

```
event: delta
data: {"text":"Hello"}
```

## Notes

- Conversations are scoped by a localStorage id, not by a login. Add real
  accounts before putting this anywhere public.
- History sent to the model is capped at the last `HISTORY_LIMIT` messages.
- SQLite lives at `DB_PATH` (default `./data/rajinix.db`) and is gitignored.
