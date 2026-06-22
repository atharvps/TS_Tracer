/**
 * ThemeContext — Global dark/light mode state.
 *
 * Persists the user's preference to chrome.storage.local so it
 * survives panel closes. Applies the "light" CSS class to <html>
 * which triggers all CSS variable overrides defined in sidepanel.css.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:       "dark",
  toggleTheme: () => {},
});

const STORAGE_KEY = "ts_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Load saved theme on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Theme | undefined;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        applyTheme(saved);
      }
    });

    // Keep in sync if another panel changes it
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEY]) {
        const t = changes[STORAGE_KEY].newValue as Theme;
        setTheme(t);
        applyTheme(t);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      chrome.storage.local.set({ [STORAGE_KEY]: next });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Toggles the "light" class on <html> — all CSS vars update instantly */
function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
}
