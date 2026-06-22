/**
 * Popup — Extension icon click popup.
 * Uses the same cfgnormalizer-inspired glass design as the side panel.
 */

import { useState } from "react";
import { useApiKey }    from "@hooks/useApiKey.ts";
import { maskKey }      from "@lib/validators.ts";
import { ThemeProvider, useTheme } from "@components/ThemeContext.tsx";
import { ThemeToggle }  from "@components/ThemeToggle.tsx";

function PopupInner() {
  const { apiKey, isLoading, isOnboarded, saveKey, clearKey, error } = useApiKey();
  const [input,  setInput]  = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setSaving(true);
    const ok = await saveKey(input);
    if (!ok) setLocalError("Keys start with 'AIza' (legacy) or 'AQ.' (new format).");
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div
          className="w-6 h-6 rounded-btn animate-spin-slow"
          style={{
            background: "linear-gradient(135deg, var(--teal), var(--emerald))",
            mask:       "radial-gradient(circle, transparent 55%, black 55%)",
            WebkitMask: "radial-gradient(circle, transparent 55%, black 55%)",
          }}
        />
      </div>
    );
  }

  // ── Status view ────────────────────────────────────────────
  if (isOnboarded && apiKey) {
    return (
      <div className="p-4 space-y-3 animate-fade-up">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-btn flex items-center justify-center text-sm"
              style={{
                background: "linear-gradient(135deg, var(--teal), var(--emerald))",
                boxShadow:  "0 0 8px var(--teal-glow)",
              }}
            >
              ⚡
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--ink-primary)" }}>
                TS_Tracer
              </p>
              <p className="text-[10px] font-mono" style={{ color: "var(--teal)" }}>
                ● Active
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Key card */}
        <div
          className="glass-2 rounded-card px-3 py-2.5"
          style={{ border: "1px solid var(--border-glass)" }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--ink-muted)" }}
          >
            API Key
          </p>
          <p
            className="text-xs font-mono"
            style={{ color: "var(--teal)" }}
          >
            {maskKey(apiKey)}
          </p>
        </div>

        {/* Instructions */}
        <div
          className="glass-2 rounded-card px-3 py-2.5"
          style={{ border: "1px solid var(--border-glass)" }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "var(--ink-muted)" }}
          >
            How to use
          </p>
          <ol className="space-y-1" style={{ paddingLeft: "1em", color: "var(--ink-secondary)", fontSize: "11px" }}>
            <li>Open any LeetCode problem</li>
            <li>Click the ⚡ toolbar icon</li>
            <li>Side panel opens on the right</li>
          </ol>
        </div>

        {/* Change key */}
        <button
          onClick={clearKey}
          className="w-full py-2 rounded-btn text-xs transition-all duration-150"
          style={{
            background:   "transparent",
            border:       "1px solid var(--border-glass)",
            color:        "var(--ink-muted)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
            (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-glass)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-muted)";
          }}
        >
          🔑 Change API Key
        </button>
      </div>
    );
  }

  // ── Onboarding view ────────────────────────────────────────
  return (
    <div className="p-4 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-btn flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--teal), var(--emerald))", fontSize: "16px" }}
          >
            ⚡
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--ink-primary)" }}>TS_Tracer</p>
            <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>AI Setup</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <form onSubmit={handleSave} className="space-y-2">
        <label className="block text-xs font-semibold" style={{ color: "var(--ink-secondary)" }}>
          Gemini API Key
        </label>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AIza... or AQ...."
          className="input-glass w-full px-3 py-2.5 text-xs"
          style={localError || error ? { borderColor: "#ef4444" } : {}}
        />
        {(localError || error) && (
          <p className="text-[10px]" style={{ color: "#f87171" }}>
            ⚠ {localError || error}
          </p>
        )}
        <button
          type="submit"
          disabled={!input.trim() || saving}
          className="btn-teal w-full py-2.5 text-xs"
        >
          {saving ? "Saving…" : "Save & Start"}
        </button>
      </form>

      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="block text-center text-[10px] font-medium hover:underline"
        style={{ color: "var(--teal)" }}
      >
        Get free key at Google AI Studio →
      </a>
    </div>
  );
}

export function Popup() {
  return (
    <ThemeProvider>
      <PopupInner />
    </ThemeProvider>
  );
}
