/** Animated typing indicator — shown while waiting for first token */

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-fade-up">
      <div
        className="flex items-center gap-2 glass rounded-card px-4 py-2.5"
        style={{ maxWidth: "80%" }}
      >
        <span
          className="text-[11px] font-mono"
          style={{ color: "var(--ink-muted)" }}
        >
          thinking
        </span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{
                background:     "var(--teal)",
                animationDelay: `${i * 0.18}s`,
                boxShadow:      "0 0 6px var(--teal-glow)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
