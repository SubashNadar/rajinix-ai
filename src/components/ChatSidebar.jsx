// src/components/ChatSidebar.jsx — list of saved conversations.
import React from "react";

function ChatSidebar({ chats, activeChatId, onSelect, onNewChat, onDelete }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand">Rajinix-AI</span>
        <button type="button" className="new-chat-button" onClick={onNewChat}>
          + New
        </button>
      </div>

      <nav className="chat-list" aria-label="Conversations">
        {chats.length === 0 && (
          <p className="chat-list-empty">No conversations yet.</p>
        )}

        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-list-item${chat.id === activeChatId ? " active" : ""}`}
          >
            <button
              type="button"
              className="chat-list-title"
              onClick={() => onSelect(chat.id)}
              title={chat.title}
            >
              {chat.title}
            </button>
            <button
              type="button"
              className="chat-delete-button"
              onClick={() => onDelete(chat.id)}
              title="Delete conversation"
              aria-label={`Delete ${chat.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default ChatSidebar;
