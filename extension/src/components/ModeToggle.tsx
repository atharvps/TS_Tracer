/** ModeToggle — Socratic vs Copilot mode pill */

interface ModeToggleProps {
  isSocraticMode: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export function ModeToggle({ isSocraticMode, onToggle, disabled }: ModeToggleProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-btn"
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-glass)",
      }}
    >
      <ModeBtn
        active={isSocraticMode}
        icon="🎓"
        label="Socratic"
        title="Guided hints — never spoils the answer"
        onClick={() => onToggle(true)}
        disabled={disabled}
        color="teal"
      />
      <ModeBtn
        active={!isSocraticMode}
        icon="⚡"
        label="Copilot"
        title="Direct answers and optimized code"
        onClick={() => onToggle(false)}
        disabled={disabled}
        color="emerald"
      />
    </div>
  );
}

function ModeBtn({
  active, icon, label, title, onClick, disabled, color,
}: {
  active: boolean;
  icon: string;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  color: "teal" | "emerald";
}) {
  const gradients = {
    teal: "linear-gradient(135deg, var(--teal) 0%, #0ea5e9 100%)",
    emerald: "linear-gradient(135deg, var(--emerald) 0%, var(--teal) 100%)",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? gradients[color] : "transparent",
        color: active ? "#fff" : "var(--ink-muted)",
        boxShadow: active ? `0 2px 10px var(--${color}-glow)` : "none",
        borderRadius: "8px",
        padding: "5px 10px",
        fontSize: "11px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: "12px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
