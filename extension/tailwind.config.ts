import type { Config } from "tailwindcss";

/**
 * TS_Tracer Design System — Inspired by cfgnormalizer.vercel.app
 *
 * Aesthetic: Minimalist glassmorphism with animated teal/emerald gradient
 * backgrounds, frosted-glass panels, neon-teal accents, and JetBrains Mono.
 *
 * All semantic colors are CSS-variable-based so dark/light switching
 * works with a single `data-theme="light"` attribute on <html>.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,html}"],

  // Tailwind dark mode driven by a CSS class on <html>
  darkMode: "class",

  theme: {
    extend: {
      // ── CSS Variable–linked color tokens ──────────────────────
      // These map to --var definitions in sidepanel.css
      colors: {
        // Backgrounds (glass layers)
        "surface":        "var(--surface)",
        "surface-2":      "var(--surface-2)",
        "surface-3":      "var(--surface-3)",
        "surface-hover":  "var(--surface-hover)",

        // Borders
        "border-glass":   "var(--border-glass)",
        "border-accent":  "var(--border-accent)",

        // Primary teal accent (Socratic mode)
        "teal":           "var(--teal)",
        "teal-hover":     "var(--teal-hover)",
        "teal-dim":       "var(--teal-dim)",
        "teal-glow":      "var(--teal-glow)",

        // Emerald accent (Copilot mode / success)
        "emerald":        "var(--emerald)",
        "emerald-hover":  "var(--emerald-hover)",
        "emerald-dim":    "var(--emerald-dim)",
        "emerald-glow":   "var(--emerald-glow)",

        // Text
        "ink-primary":    "var(--ink-primary)",
        "ink-secondary":  "var(--ink-secondary)",
        "ink-muted":      "var(--ink-muted)",

        // Status chips
        "easy":           "#10b981",
        "medium":         "#f59e0b",
        "hard":           "#ef4444",
      },

      // ── Typography ────────────────────────────────────────────
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },

      // ── Border radius ─────────────────────────────────────────
      borderRadius: {
        "panel": "20px",
        "card":  "12px",
        "btn":   "10px",
        "chip":  "8px",
      },

      // ── Box shadows ───────────────────────────────────────────
      boxShadow: {
        "glass":       "0 8px 32px 0 rgba(0,0,0,0.35)",
        "glass-light": "0 12px 40px 0 rgba(20,184,166,0.12)",
        "teal-glow":   "0 0 20px 0 rgba(20,184,166,0.4)",
        "btn-teal":    "0 4px 15px 0 rgba(20,184,166,0.35)",
      },

      // ── Keyframes & Animations ────────────────────────────────
      keyframes: {
        "bg-shift": {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 80%, 100%": { opacity: "0.2", transform: "scale(0.75)" },
          "40%":           { opacity: "1",   transform: "scale(1)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(20,184,166,0.3)" },
          "50%":      { boxShadow: "0 0 20px rgba(20,184,166,0.7)" },
        },
      },
      animation: {
        "bg-shift":   "bg-shift 12s ease infinite",
        "fade-up":    "fade-up 0.3s ease-out",
        "slide-up":   "slide-up 0.45s cubic-bezier(0.16,1,0.3,1)",
        "pulse-dot":  "pulse-dot 1.4s ease-in-out infinite",
        "spin-slow":  "spin-slow 2s linear infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
