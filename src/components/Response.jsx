import "./AiInteraction.css";
export const parseAIResponse = (responseText) => {
  // Split response into paragraphs while preserving code blocks
  const segments = [];
  let remainingText = responseText;

  // Process until we've handled all text
  while (remainingText.length > 0) {
    // Check for code blocks first
    const codeBlockMatch = remainingText.match(/```(\w*)\n([\s\S]+?)```/);

    if (codeBlockMatch) {
      // Add text before code block if it exists
      const textBeforeCode = remainingText
        .substring(0, codeBlockMatch.index)
        .trim();
      if (textBeforeCode) {
        segments.push({ type: "text", content: textBeforeCode });
      }

      // Add the code block
      segments.push({
        type: "code",
        language: codeBlockMatch[1] || "plaintext",
        content: codeBlockMatch[2].trim(),
      });

      // Update remaining text
      remainingText = remainingText.substring(
        codeBlockMatch.index + codeBlockMatch[0].length
      );
    } else {
      // No more code blocks, add remaining text
      segments.push({ type: "text", content: remainingText.trim() });
      remainingText = "";
    }
  }

  return (
    <div className="ai-response">
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          return (
            <div key={index} className="code-block">
              <pre className={`language-${segment.language}`}>
                <div className="code-header">
                  <span className="language-tag">
                    {segment.language || "code"}
                  </span>
                  <button
                    className="copy-button"
                    onClick={() =>
                      navigator.clipboard.writeText(segment.content)
                    }
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
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span className="copy-text">Copy</span>
                  </button>
                </div>
                <code>{segment.content}</code>
              </pre>
            </div>
          );
        }

        // Process text segments for markdown-like formatting
        const lines = segment.content.split("\n");
        return (
          <div key={index} className="text-segment">
            {lines.map((line, lineIndex) => {
              // Handle headings (## or **)
              if (line.match(/^#{1,6}\s/)) {
                const level = line.match(/^#+/)[0].length;
                const HeadingTag = `h${Math.min(level, 6)}`;
                return (
                  <HeadingTag key={lineIndex}>
                    {line.replace(/^#+\s/, "")}
                  </HeadingTag>
                );
              }

              // Handle bold text (**text**)
              const boldMatch = line.match(/\*\*(.+?)\*\*/);
              if (boldMatch) {
                const parts = line.split(/\*\*(.+?)\*\*/);
                return (
                  <p key={lineIndex}>
                    {parts.map((part, partIndex) =>
                      partIndex % 2 === 1 ? (
                        <strong key={partIndex}>{part}</strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                );
              }

              // Regular paragraph
              return <p key={lineIndex}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};
