// src/components/AiInteraction.jsx — chat container: history, streaming, state.
import React, { useCallback, useEffect, useRef, useState } from "react";

import ChatSidebar from "./ChatSidebar";
import MarkdownMessage from "./MarkdownMessage";
import * as api from "../api";
import "./AiInteraction.css";

function AiInteraction() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const answerRef = useRef("");
  const scrollRef = useRef(null);

  // Restore the most recent conversation on load.
  useEffect(() => {
    let cancelled = false;

    api
      .listChats()
      .then((loaded) => {
        if (cancelled) return;
        setChats(loaded);
        setActiveChatId((current) => current ?? loaded[0]?.id ?? null);
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the selected conversation's messages.
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;

    api
      .getChat(activeChatId)
      .then((data) => !cancelled && setMessages(data.messages))
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // Keep the newest text in view while it streams in.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, streamingText]);

  const refreshChats = useCallback(
    () => api.listChats().then(setChats).catch(() => {}),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const text = prompt.trim();
    if (!text || isStreaming) return;

    setError(null);
    setPrompt("");
    answerRef.current = "";
    setStreamingText("");

    try {
      let chatId = activeChatId;
      if (!chatId) {
        const chat = await api.createChat();
        chatId = chat.id;
        setChats((current) => [chat, ...current]);
        setActiveChatId(chatId);
      }

      setMessages((current) => [
        ...current,
        { id: `local-user-${Date.now()}`, role: "user", content: text },
      ]);

      setIsStreaming(true);
      abortRef.current = new AbortController();

      await api.streamMessage(chatId, text, {
        signal: abortRef.current.signal,
        onDelta: (delta) => {
          answerRef.current += delta;
          setStreamingText(answerRef.current);
        },
      });

      commitAnswer();
      refreshChats();
    } catch (err) {
      if (err.name === "AbortError") {
        // Stopped on purpose — keep whatever had already arrived.
        commitAnswer();
        refreshChats();
      } else {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  };

  function commitAnswer() {
    const answer = answerRef.current;
    if (!answer) return;

    setMessages((current) => [
      ...current,
      { id: `local-model-${Date.now()}`, role: "model", content: answer },
    ]);
    answerRef.current = "";
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setActiveChatId(null);
    setMessages([]);
    setError(null);
  };

  const handleSelectChat = (chatId) => {
    if (chatId === activeChatId) return;
    abortRef.current?.abort();
    setActiveChatId(chatId);
    setError(null);
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await api.deleteChat(chatId);
      setChats((current) => current.filter((chat) => chat.id !== chatId));
      if (chatId === activeChatId) handleNewChat();
    } catch (err) {
      setError(err.message);
    }
  };

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className="app-shell">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={handleSelectChat}
        onNewChat={handleNewChat}
        onDelete={handleDeleteChat}
      />

      <main className="chat-panel">
        <div className="message-scroll" ref={scrollRef}>
          {showEmptyState && (
            <div className="empty-state">
              <h2>Hello, I'm Rajinix-AI</h2>
              <p>Ask me anything to start a conversation.</p>
            </div>
          )}

          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-role">
                {message.role === "user" ? "You" : "Rajinix-AI"}
              </div>
              <div className="message-content">
                {message.role === "user" ? (
                  <p className="user-text">{message.content}</p>
                ) : (
                  <MarkdownMessage content={message.content} />
                )}
              </div>
            </article>
          ))}

          {isStreaming && (
            <article className="message model">
              <div className="message-role">Rajinix-AI</div>
              <div className="message-content">
                {streamingText ? (
                  <MarkdownMessage content={streamingText} />
                ) : (
                  <span className="thinking">Thinking...</span>
                )}
                <span className="cursor" aria-hidden="true" />
              </div>
            </article>
          )}
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="prompt-form">
          <textarea
            className="prompt-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt... (Enter to send, Shift+Enter for a new line)"
            rows={3}
          />
          {isStreaming ? (
            <button
              type="button"
              className="submit-button stop"
              onClick={() => abortRef.current?.abort()}
            >
              Stop
            </button>
          ) : (
            <button type="submit" className="submit-button" disabled={!prompt.trim()}>
              Send
            </button>
          )}
        </form>
      </main>
    </div>
  );
}

export default AiInteraction;
