/**
 * SidePanel — Root component for the native Chrome side panel.
 * cfgnormalizer-inspired design: animated gradient background,
 * frosted glass layers, teal/emerald accent system, Plus Jakarta Sans.
 */

import { useState, useEffect, useRef } from "react";
import { useApiKey }    from "@hooks/useApiKey.ts";
import { useLeetCode }  from "@hooks/useLeetCode.ts";
import { useChat }      from "@hooks/useChat.ts";
import { UserPrefs, DEFAULT_PREFS } from "@types-ext/storage.ts";
import { ModeToggle }       from "./ModeToggle.tsx";
import { ProblemHeader }    from "./ProblemHeader.tsx";
import { QuickActions }     from "./QuickActions.tsx";
import { ChatMessage }      from "./ChatMessage.tsx";
import { ChatInput }        from "./ChatInput.tsx";
import { TypingIndicator }  from "./TypingIndicator.tsx";
import { ThemeProvider, useTheme } from "./ThemeContext.tsx";
import { ThemeToggle }      from "./ThemeToggle.tsx";

// ══════════════════════════════════════════════════════════════
// Onboarding Screen
// ══════════════════════════════════════════════════════════════

function OnboardingScreen({ onSave }: { onSave: (key: string) => Promise<boolean> }) {
  const [input,  setInput]  = useState("");
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const ok = await onSave(input);
    if (!ok) setError("Keys start with 'AIza' (legacy) or 'AQ.' (new Google AI Studio format).");
    setSaving(false);
  };

  const canSubmit = input.trim().length > 0 && !saving;

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-5 py-8 animate-slide-up"
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <img 
          src="/logo.png" 
          alt="TS_Tracer Logo" 
          className="w-20 h-20 mx-auto mb-4 animate-glow-pulse object-contain drop-shadow-lg" 
        />
        <h1
          className="text-xl font-bold"
          style={{
            background: "linear-gradient(to right, #2dd4bf, #34d399, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px"
          }}
        >
          TS_Tracer
        </h1>
        <p
          className="text-xs mt-1.5 leading-relaxed"
          style={{ color: "var(--ink-secondary)" }}
        >
          Your AI complexity coach for LeetCode.<br />
          Enter a free Gemini API key to begin.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div>
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: "var(--ink-secondary)" }}
          >
            Gemini API Key
          </label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIza... or AQ...."
            className="input-glass w-full px-4 py-3 text-sm"
            style={error ? { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.15)" } : {}}
          />
          {error && (
            <p className="text-[11px] mt-1.5" style={{ color: "#f87171" }}>
              ⚠ Invalid key format. {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-teal w-full py-3 text-sm"
          style={{ letterSpacing: "0.01em" }}
        >
          {saving ? "Saving…" : "Start Coaching →"}
        </button>
      </form>

      {/* Link */}
      <div className="mt-6 text-center">
        <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          Don't have a key?
        </p>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold hover:underline mt-0.5 inline-block"
          style={{ color: "var(--teal)" }}
        >
          Get your free key at Google AI Studio →
        </a>
      </div>

      {/* Theme toggle in corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Chat UI
// ══════════════════════════════════════════════════════════════

function ChatUI({ apiKey, onClearKey }: { apiKey: string; onClearKey: () => void }) {
  const { context, isLoading: ctxLoading, refresh } = useLeetCode();
  const [prefs,      setPrefs]      = useState<UserPrefs>(DEFAULT_PREFS);
  const [showMenu,   setShowMenu]   = useState(false);
  const messagesEndRef               = useRef<HTMLDivElement>(null);
  const menuRef                      = useRef<HTMLDivElement>(null);

  // Load prefs
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_PREFS" }, (r) => {
      if (r?.prefs) setPrefs(r.prefs);
    });
  }, []);

  const { messages, isStreaming, error, sendMessage, clearHistory } = useChat({
    context,
    prefs,
    apiKey,
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleModeToggle = (val: boolean) => {
    const updated = { ...prefs, isSocraticMode: val };
    setPrefs(updated);
    chrome.runtime.sendMessage({ type: "SET_PREFS", payload: { isSocraticMode: val } });
  };

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div
      className="flex flex-col h-screen w-full"
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <header className="sidebar-header">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="TS_Tracer Logo" 
              className="w-7 h-7 object-contain drop-shadow-md"
            />
            <div>
              <span
                className="font-bold text-sm tracking-tight"
                style={{
                  background: "linear-gradient(to right, #2dd4bf, #34d399, #38bdf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px"
                }}
              >
                TS_Tracer
              </span>
              <span
                className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded"
                style={{
                  color:      "var(--teal)",
                  background: "var(--teal-dim)",
                  border:     "1px solid var(--border-glass)",
                }}
              >
                v1.0
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Settings menu */}
            <div className="relative flex items-center justify-center" style={{ width: "28px", height: "28px" }} ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                title="Settings"
                style={{
                  width:        "28px",
                  height:       "28px",
                  borderRadius: "8px",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  background:   showMenu ? "var(--teal-dim)" : "var(--surface-3)",
                  border:       `1px solid ${showMenu ? "var(--border-accent)" : "var(--border-glass)"}`,
                  color:        showMenu ? "var(--teal)" : "var(--ink-muted)",
                  fontSize:     "14px",
                  cursor:       "pointer",
                  transition:   "all 0.15s ease",
                }}
              >
                ⚙
              </button>

              {showMenu && (
                <div
                  className="absolute top-full mt-2 glass-2 rounded-card shadow-glass animate-fade-up z-50"
                  style={{ minWidth: "170px", padding: "4px", right: 0 }}
                >
                  <MenuItem
                    icon="🗑"
                    label="Clear chat"
                    onClick={() => { clearHistory(); setShowMenu(false); }}
                  />
                  <MenuItem
                    icon="🔑"
                    label="Change API key"
                    onClick={() => { onClearKey(); setShowMenu(false); }}
                    danger
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mt-3">
          <ModeToggle
            isSocraticMode={prefs.isSocraticMode}
            onToggle={handleModeToggle}
            disabled={isStreaming}
          />
        </div>
      </header>

      {/* ── Problem header ───────────────────────────────── */}
      <ProblemHeader
        context={ctxLoading ? null : context}
        onRefresh={refresh}
      />

      {/* ── Messages ─────────────────────────────────────── */}
      <div className="sidebar-body py-2 space-y-0.5">
        {isEmpty && (
          <div
            className="flex flex-col items-center justify-center h-full text-center px-6 py-10 animate-fade-up bg-transparent"
          >
            <img 
              src="/logo.png" 
              alt="Mode Logo" 
              className="w-16 h-16 object-contain mb-4 drop-shadow-md"
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--ink-primary)" }}
            >
              {prefs.isSocraticMode ? "Socratic Mode" : "Copilot Mode"}
            </p>
            <p
              className="text-[11px] mt-1.5 leading-relaxed max-w-[190px]"
              style={{ color: "var(--ink-muted)" }}
            >
              {prefs.isSocraticMode
                ? "I'll guide you with nudging hints — no spoilers."
                : "Ask anything. I'll give you direct, optimized answers."}
            </p>

            {!context && (
              <div
                className="mt-5 px-3 py-2 rounded-card text-xs"
                style={{
                  background:  "rgba(245,158,11,0.08)",
                  border:      "1px solid rgba(245,158,11,0.25)",
                  color:       "#f59e0b",
                }}
              >
                Navigate to a LeetCode problem first
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming: show TypingIndicator only while first tokens haven't arrived */}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <TypingIndicator />
        )}

        {error && (
          <div
            className="mx-3 my-1 px-3 py-2 rounded-card text-xs animate-fade-up"
            style={{
              background: "rgba(239,68,68,0.08)",
              border:     "1px solid rgba(239,68,68,0.25)",
              color:      "#f87171",
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Actions (only on empty chat) ───────────── */}
      {isEmpty && (
        <div className="sidebar-footer">
          <QuickActions onAction={sendMessage} disabled={isStreaming || !context} />
        </div>
      )}

      {/* ── Input ────────────────────────────────────────── */}
      <div className={isEmpty ? "" : "sidebar-footer"}>
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          placeholder={
            !context
              ? "Open a LeetCode problem first…"
              : prefs.isSocraticMode
              ? "Ask your interviewer…"
              : "Ask your copilot…"
          }
        />
      </div>
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger,
}: {
  icon:    string;
  label:   string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:        "100%",
        textAlign:    "left",
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
        padding:      "7px 10px",
        borderRadius: "8px",
        fontSize:     "12px",
        fontWeight:   "500",
        color:        danger ? "#f87171" : "var(--ink-secondary)",
        background:   "transparent",
        border:       "none",
        cursor:       "pointer",
        transition:   "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = danger ? "rgba(239,68,68,0.1)" : "var(--surface-hover)";
        el.style.color      = danger ? "#ef4444" : "var(--ink-primary)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "transparent";
        el.style.color      = danger ? "#f87171" : "var(--ink-secondary)";
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// Loading screen
// ══════════════════════════════════════════════════════════════

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full" style={{ position: "relative", zIndex: 1 }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-btn animate-spin-slow"
          style={{
            background: "linear-gradient(135deg, var(--teal), var(--emerald))",
            mask:       "radial-gradient(circle, transparent 55%, black 55%)",
            WebkitMask: "radial-gradient(circle, transparent 55%, black 55%)",
          }}
        />
        <p
          className="text-xs"
          style={{ color: "var(--ink-muted)" }}
        >
          Loading TS_Tracer…
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Root — wraps everything in ThemeProvider
// ══════════════════════════════════════════════════════════════

function SidePanelInner() {
  const { apiKey, isLoading, isOnboarded, saveKey, clearKey } = useApiKey();

  if (isLoading)                  return <LoadingScreen />;
  if (!isOnboarded || !apiKey)    return <OnboardingScreen onSave={saveKey} />;
  return <ChatUI apiKey={apiKey} onClearKey={clearKey} />;
}

export function SidePanel() {
  return (
    <ThemeProvider>
      <SidePanelInner />
    </ThemeProvider>
  );
}
