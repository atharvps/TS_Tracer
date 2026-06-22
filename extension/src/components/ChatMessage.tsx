/**
 * ChatMessage — Renders a single message bubble.
 * AI responses render with react-markdown + Prism syntax highlighting.
 */

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark }   from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight }  from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChatMessage as ChatMessageType } from "@types-ext/storage.ts";
import { useState } from "react";
import { useTheme } from "./ThemeContext.tsx";

interface ChatMessageProps { message: ChatMessageType }

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const isUser  = message.role === "user";
  const isError = message.isError;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── User bubble ──────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end px-3 py-1 animate-fade-up">
        <div
          className="max-w-[85%] text-sm leading-relaxed"
          style={{
            background:   "linear-gradient(135deg, var(--teal-dim), var(--emerald-dim))",
            border:       "1px solid var(--border-accent)",
            borderRadius: "14px 14px 4px 14px",
            padding:      "8px 14px",
            color:        "var(--ink-primary)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // ── Error bubble ──────────────────────────────────────────────
  if (isError) {
    return (
      <div className="px-3 py-1 animate-fade-up">
        <div
          className="text-xs"
          style={{
            background:   "rgba(239,68,68,0.08)",
            border:       "1px solid rgba(239,68,68,0.25)",
            borderRadius: "12px",
            padding:      "8px 12px",
            color:        "#f87171",
          }}
        >
          ⚠ {message.content}
        </div>
      </div>
    );
  }

  // ── Assistant bubble (markdown) ───────────────────────────────
  return (
    <div className="px-3 py-1 animate-fade-up">
      <div
        className="glass text-sm leading-relaxed prose-chat"
        style={{
          borderRadius: "4px 14px 14px 14px",
          padding:      "10px 14px",
          color:        "var(--ink-primary)",
        }}
      >
        <ReactMarkdown
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || "");
              const code  = String(children).replace(/\n$/, "");

              if (!match) {
                // Inline code
                return (
                  <code
                    style={{
                      background:   "var(--teal-dim)",
                      color:        "var(--teal)",
                      fontFamily:   "'JetBrains Mono', monospace",
                      fontSize:     "11px",
                      padding:      "1px 5px",
                      borderRadius: "4px",
                      border:       "1px solid var(--border-glass)",
                    }}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <div
                  style={{
                    borderRadius: "10px",
                    overflow:     "hidden",
                    border:       "1px solid var(--border-glass)",
                    margin:       "8px 0",
                  }}
                >
                  {/* Code header */}
                  <div
                    style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      alignItems:     "center",
                      background:     "var(--surface-3)",
                      padding:        "5px 12px",
                      borderBottom:   "1px solid var(--border-glass)",
                    }}
                  >
                    <span
                      style={{
                        fontSize:    "10px",
                        fontFamily:  "'JetBrains Mono', monospace",
                        color:       "var(--teal)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {match[1]}
                    </span>
                    <button
                      onClick={() => handleCopy(code)}
                      style={{
                        fontSize:  "10px",
                        color:     "var(--ink-muted)",
                        background: "transparent",
                        border:    "none",
                        cursor:    "pointer",
                        padding:   "2px 6px",
                        borderRadius: "4px",
                        transition: "color 0.15s",
                      }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={theme === "dark" ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin:     0,
                      borderRadius: 0,
                      fontSize:   "11px",
                      background: theme === "dark" ? "#090c14" : "#f8fafc",
                      padding:    "12px",
                    }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Timestamp */}
      <p
        className="text-[9px] mt-1 px-1"
        style={{ color: "var(--ink-muted)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
