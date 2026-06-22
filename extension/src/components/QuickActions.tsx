/** QuickActions — Pre-written prompt chips */

interface QuickActionsProps {
  onAction:  (prompt: string) => void;
  disabled:  boolean;
}

const ACTIONS = [
  { emoji: "⏱", label: "Complexity", prompt: "What is the time and space complexity of my current code? Where is the bottleneck?" },
  { emoji: "💡", label: "Hint",       prompt: "I'm stuck. Can you give me a small, nudging hint without spoiling the full answer?" },
  { emoji: "🐛", label: "Bugs",       prompt: "Can you find any bugs or edge cases my code might miss?" },
  { emoji: "🔍", label: "Approach",   prompt: "Can you explain the optimal approach for this problem at a high level?" },
];

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="px-3 pb-3 pt-2">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
        style={{ color: "var(--ink-muted)" }}
      >
        Quick Ask
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => onAction(a.prompt)}
            disabled={disabled}
            style={{
              background:   "var(--surface-3)",
              border:       "1px solid var(--border-glass)",
              color:        "var(--ink-secondary)",
              borderRadius: "8px",
              padding:      "5px 10px",
              fontSize:     "11px",
              fontWeight:   "500",
              display:      "flex",
              alignItems:   "center",
              gap:          "4px",
              cursor:       disabled ? "not-allowed" : "pointer",
              opacity:      disabled ? 0.4 : 1,
              transition:   "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--border-accent)";
              el.style.color       = "var(--teal)";
              el.style.background  = "var(--teal-dim)";
              el.style.transform   = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (disabled) return;
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--border-glass)";
              el.style.color       = "var(--ink-secondary)";
              el.style.background  = "var(--surface-3)";
              el.style.transform   = "translateY(0)";
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
