/** ProblemHeader — Problem title, difficulty, language badge, refresh */

import { LeetCodeContext } from "@types-ext/storage.ts";

interface ProblemHeaderProps {
  context:   LeetCodeContext | null;
  onRefresh: () => void;
}

const difficultyStyle: Record<string, { color: string; bg: string }> = {
  Easy:   { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  Hard:   { color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
};

export function ProblemHeader({ context, onRefresh }: ProblemHeaderProps) {
  const diff = context?.difficulty;
  const style = diff ? (difficultyStyle[diff] ?? null) : null;

  return (
    <div
      className="px-4 py-3"
      style={{
        borderBottom: "1px solid var(--border-glass)",
        background:   "var(--surface-2)",
      }}
    >
      {!context ? (
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-mono"
              style={{ color: "var(--ink-muted)" }}
            >
              No problem detected
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--ink-muted)" }}
            >
              Open a LeetCode problem to begin
            </p>
          </div>
          <RefreshBtn onClick={onRefresh} />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold truncate leading-snug"
              style={{ color: "var(--ink-primary)" }}
            >
              {context.title || "Loading…"}
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {diff && style && (
                <span
                  className="chip"
                  style={{
                    color:       style.color,
                    background:  style.bg,
                    borderColor: style.color + "40",
                  }}
                >
                  {diff}
                </span>
              )}

              {context.language && (
                <span
                  className="chip font-mono"
                  style={{
                    color:       "var(--teal)",
                    background:  "var(--teal-dim)",
                    borderColor: "var(--border-accent)",
                  }}
                >
                  {context.language}
                </span>
              )}

              {context.userCode && (
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--teal)" }}
                >
                  ✓ code captured
                </span>
              )}
            </div>
          </div>
          <RefreshBtn onClick={onRefresh} />
        </div>
      )}
    </div>
  );
}

function RefreshBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Refresh context"
      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-btn transition-all duration-150"
      style={{
        background: "var(--teal-dim)",
        border:     "1px solid var(--border-glass)",
        color:      "var(--teal)",
        fontSize:   "14px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--teal-glow)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--teal-dim)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-glass)";
      }}
    >
      ↻
    </button>
  );
}
