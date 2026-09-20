# Rajinix-AI Setup Guide

A React chat app powered by Google's Gemini API, with an Express backend that
streams replies and stores conversations in SQLite.

## Prerequisites

- Node.js v18 or higher (v20+ recommended)
- npm v9 or higher
- A Google Gemini API key

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url>
cd rajinix-ai
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` and set your key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your Gemini API key:**
- Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
- Sign in with your Google account
- Create a new API key and paste it into `.env`

### 3. Run both processes

```bash
npm run dev
```

That starts the React app on [http://localhost:3000](http://localhost:3000) and
the API on [http://localhost:3001](http://localhost:3001). To run them
separately, use `npm start` in one terminal and `npm run server` in another.

Check the API is healthy:

```bash
curl http://localhost:3001/api/health
# {"status":"ok","model":"gemini-2.5-flash","apiKeyConfigured":true}
```

## Project Structure

```
rajinix-ai/
├── public/
│   ├── favicon.png
│   └── index.html
├── src/
│   ├── api.js                     # REST + SSE client
│   ├── components/
│   │   ├── AiInteraction.jsx      # Chat container
│   │   ├── AiInteraction.css      # Styles
│   │   ├── ChatSidebar.jsx        # Conversation list
│   │   └── MarkdownMessage.jsx    # Markdown + code rendering
│   ├── App.js
│   └── index.js
├── server/
│   ├── index.js                   # Express app, rate limits, static build
│   ├── db.js                      # SQLite schema and queries
│   ├── gemini.js                  # Gemini client and streaming
│   └── routes/chats.js            # Chat CRUD + SSE endpoint
├── data/                          # SQLite database (gitignored)
├── .env                           # Your environment variables (gitignored)
└── package.json
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(required)* | Your Google AI Studio key |
| `PORT` | `3001` | API server port |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model to call |
| `DB_PATH` | `./data/rajinix.db` | SQLite file location |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origins, comma-separated |
| `HISTORY_LIMIT` | `20` | Past messages replayed to the model per turn |
| `MAX_PROMPT_LENGTH` | `8000` | Longest accepted prompt, in characters |
| `GENERATE_RATE_LIMIT` | `12` | Generation requests per minute per IP |
| `TRUST_PROXY` | *(unset)* | Proxy hops to trust; set only behind a reverse proxy |

## Deploying

Build the front end and let the API serve it, so the whole app is one process:

```bash
npm run build
npm run server
```

On a platform like Render or Fly.io: set `GEMINI_API_KEY`, point `DB_PATH` at a
persistent volume (otherwise conversations vanish on redeploy), set
`CORS_ORIGIN` to your domain, and set `TRUST_PROXY=1` so rate limiting sees real
client IPs.

## Troubleshooting

### Server won't start
- Ensure `.env` exists and `GEMINI_API_KEY` has no stray spaces or quotes
- Check nothing else is on port 3001
- Reinstall dependencies: `npm install`

### "GEMINI_API_KEY is not set"
The server starts without a key but fails on generation. Add the key to `.env`
and restart. `GET /api/health` reports whether one was loaded.

### API key or quota errors
- Verify the key in Google AI Studio
- Check whether you have hit free tier limits
- If the model name is rejected, set a current one via `GEMINI_MODEL`

### Replies do not stream
Some proxies buffer responses. The server sends `X-Accel-Buffering: no`; if you
put nginx in front of it, also set `proxy_buffering off` for `/api/`.

### "Too many requests"
The generation endpoint allows `GENERATE_RATE_LIMIT` requests per minute per IP.
Raise it in `.env` for local work.

### CORS errors
Confirm the API is running and `CORS_ORIGIN` matches the front-end origin. In
development the CRA proxy in `package.json` handles this.

### Conversations disappeared
They live in the SQLite file at `DB_PATH`, and the sidebar only shows chats
created by the current browser — the id is kept in localStorage, so clearing
site data starts a fresh list.

## Testing

```bash
npm test
```

Covers the SSE client (frame assembly, split frames, error events) and an app
smoke test.

## Security Notes

- Never commit `.env`; the API key stays server-side
- The `x-client-id` header scopes chats to a browser — it is not authentication,
  so add real accounts before exposing this publicly
- Keep the rate limits on if the app is reachable from the internet

## License

ISC

## Author

Subash
