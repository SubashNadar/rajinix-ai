// src/components/MarkdownMessage.jsx — renders an assistant reply as Markdown.
import React, { Children, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// rehype-highlight wraps tokens in <span>s, so pull the plain text back out
// for the copy button.
function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <button
      type="button"
      className="copy-button"
      onClick={handleCopy}
      title="Copy code"
      aria-label="Copy code"
    >
      <svg
        className="copy-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span className="copy-text">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function CodeBlock({ children, ...props }) {
  const code = Children.toArray(children)[0];
  const language =
    /language-([\w-]+)/.exec(code?.props?.className || "")?.[1] || "code";

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="language-tag">{language}</span>
        <CopyButton text={textOf(code)} />
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
}

const components = {
  pre: CodeBlock,
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: (props) => (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  ),
};

function MarkdownMessage({ content }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
