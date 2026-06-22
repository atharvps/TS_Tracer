/** ChatInput — Auto-growing textarea with glowing send button */

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend:       (message: string) => void;
  disabled:     boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue]   = useState("");
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="px-3 pb-3 pt-2">
      <div
        className="flex items-end gap-2 rounded-card px-3 py-2 transition-all duration-200"
        style={{
          background:  "var(--surface-3)",
          border:      `1px solid ${canSend ? "var(--border-accent)" : "var(--border-glass)"}`,
          boxShadow:   canSend ? "0 0 0 3px var(--teal-dim)" : "none",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Ask TS_Tracer… (Enter to send)"}
          rows={1}
          style={{
            flex:        1,
            resize:      "none",
            background:  "transparent",
            color:       "var(--ink-primary)",
            fontSize:    "13px",
            outline:     "none",
            fontFamily:  "'Plus Jakarta Sans', sans-serif",
            lineHeight:  "1.55",
            maxHeight:   "120px",
            overflowY:   "auto",
            border:      "none",
            cursor:      disabled ? "not-allowed" : "text",
          }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            flexShrink:  0,
            width:       "30px",
            height:      "30px",
            borderRadius: "8px",
            display:     "flex",
            alignItems:  "center",
            justifyContent: "center",
            border:      "none",
            cursor:      canSend ? "pointer" : "not-allowed",
            transition:  "all 0.2s ease",
            background:  canSend
              ? "var(--teal)"
              : "var(--surface-hover)",
            boxShadow:   "none",
            transform:   "scale(1)",
          }}
          title="Send (Enter)"
        >
          {disabled ? (
            <span
              style={{
                width:       "12px",
                height:      "12px",
                borderRadius: "50%",
                border:      "2px solid var(--ink-muted)",
                borderTopColor: "transparent",
                animation:   "spin-slow 1s linear infinite",
                display:     "block",
              }}
            />
          ) : (
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>

      <p
        className="text-center mt-1"
        style={{ fontSize: "9px", color: "var(--ink-muted)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        Shift+Enter for newline · Enter to send
      </p>
    </div>
  );
}
