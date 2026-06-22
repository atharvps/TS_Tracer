/**
 * ThemeToggle — Animated pill toggle between dark ☾ and light ☀️ modes.
 * Styled exactly like cfgnormalizer.vercel.app's header toggle.
 */

import { useTheme } from "./ThemeContext.tsx";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle flex-shrink-0"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <span
        className="absolute left-[5px] top-1/2 -translate-y-1/2 text-[10px] transition-opacity duration-300"
        style={{ opacity: isDark ? 0.6 : 0 }}
      >
        ☾
      </span>
      <span
        className="absolute right-[5px] top-1/2 -translate-y-1/2 text-[10px] transition-opacity duration-300"
        style={{ opacity: isDark ? 0 : 0.7 }}
      >
        ☀
      </span>
      {/* Sliding thumb */}
      <div className="theme-toggle-thumb" />
    </button>
  );
}
