// server/db.js — SQLite persistence for chats and messages.
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "data", "rajinix.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id         TEXT PRIMARY KEY,
    client_id  TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT 'New chat',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chats_client
    ON chats (client_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, id);
`);

const statements = {
  insertChat: db.prepare(
    `INSERT INTO chats (id, client_id, title) VALUES (?, ?, ?)`
  ),
  listChats: db.prepare(
    `SELECT id, title, created_at, updated_at
       FROM chats
      WHERE client_id = ?
      ORDER BY updated_at DESC
      LIMIT ?`
  ),
  getChat: db.prepare(
    `SELECT id, title, created_at, updated_at
       FROM chats
      WHERE id = ? AND client_id = ?`
  ),
  deleteChat: db.prepare(`DELETE FROM chats WHERE id = ? AND client_id = ?`),
  renameChat: db.prepare(
    `UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?`
  ),
  touchChat: db.prepare(
    `UPDATE chats SET updated_at = datetime('now') WHERE id = ?`
  ),
  insertMessage: db.prepare(
    `INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`
  ),
  listMessages: db.prepare(
    `SELECT id, role, content, created_at
       FROM messages
      WHERE chat_id = ?
      ORDER BY id ASC`
  ),
  recentMessages: db.prepare(
    `SELECT id, role, content
       FROM messages
      WHERE chat_id = ?
      ORDER BY id DESC
      LIMIT ?`
  ),
  countMessages: db.prepare(
    `SELECT COUNT(*) AS count FROM messages WHERE chat_id = ?`
  ),
};

function createChat(id, clientId, title = "New chat") {
  statements.insertChat.run(id, clientId, title);
  return statements.getChat.get(id, clientId);
}

const listChats = (clientId, limit = 100) =>
  statements.listChats.all(clientId, limit);

const getChat = (chatId, clientId) => statements.getChat.get(chatId, clientId);

const deleteChat = (chatId, clientId) =>
  statements.deleteChat.run(chatId, clientId).changes > 0;

const renameChat = (chatId, title) => statements.renameChat.run(title, chatId);

const touchChat = (chatId) => statements.touchChat.run(chatId);

const listMessages = (chatId) => statements.listMessages.all(chatId);

const countMessages = (chatId) => statements.countMessages.get(chatId).count;

function addMessage(chatId, role, content) {
  const { lastInsertRowid } = statements.insertMessage.run(
    chatId,
    role,
    content
  );
  touchChat(chatId);
  return lastInsertRowid;
}

// Oldest-first window of the most recent turns, so long chats stay inside the
// model's context without the lossy summarize-everything pass we used before.
const recentMessages = (chatId, limit) =>
  statements.recentMessages.all(chatId, limit).reverse();

module.exports = {
  db,
  DB_PATH,
  createChat,
  listChats,
  getChat,
  deleteChat,
  renameChat,
  touchChat,
  listMessages,
  countMessages,
  addMessage,
  recentMessages,
};
