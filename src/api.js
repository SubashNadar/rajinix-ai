// src/api.js — REST + SSE client for the Rajinix-AI backend.

const CLIENT_ID_KEY = "rajinix.clientId";

/**
 * A per-browser id so chats are scoped to whoever created them. Stored in
 * localStorage; it identifies a browser, it does not authenticate anyone.
 */
export function getClientId() {
  let clientId = null;
  try {
    clientId = window.localStorage.getItem(CLIENT_ID_KEY);
  } catch (error) {
    // Private mode or blocked storage — fall through to an in-memory id.
  }

  if (!clientId) {
    clientId =
      window.crypto?.randomUUID?.() ??
      `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      window.localStorage.setItem(CLIENT_ID_KEY, clientId);
    } catch (error) {
      // Ignore: the id still works for the lifetime of this page.
    }
  }

  return clientId;
}

const headers = () => ({
  "Content-Type": "application/json",
  "x-client-id": getClientId(),
});

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: headers(), ...options });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return response.status === 204 ? null : response.json();
}

async function errorMessage(response) {
  try {
    const body = await response.json();
    return body.error || body.message || `Request failed (${response.status})`;
  } catch (error) {
    return `Request failed (${response.status} ${response.statusText})`;
  }
}

export const listChats = () => request("/chats").then((data) => data.chats);

export const createChat = () =>
  request("/chats", { method: "POST", body: "{}" }).then((data) => data.chat);

export const getChat = (chatId) => request(`/chats/${chatId}`);

export const deleteChat = (chatId) =>
  request(`/chats/${chatId}`, { method: "DELETE" });

/**
 * Posts a prompt and streams the reply. `onDelta` fires for every text chunk;
 * the promise resolves with the full answer once the stream closes.
 */
export async function streamMessage(chatId, prompt, { onDelta, signal } = {}) {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok) throw new Error(await errorMessage(response));
  if (!response.body) throw new Error("Streaming is not supported by this browser.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; the tail may be incomplete.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const parsed = parseFrame(frame);
      if (!parsed) continue;

      if (parsed.event === "delta") {
        answer += parsed.data.text;
        onDelta?.(parsed.data.text);
      } else if (parsed.event === "error") {
        throw new Error(parsed.data.error);
      }
    }
  }

  return answer;
}

function parseFrame(frame) {
  let event = "message";
  const dataLines = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (!dataLines.length) return null;

  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch (error) {
    return null;
  }
}
