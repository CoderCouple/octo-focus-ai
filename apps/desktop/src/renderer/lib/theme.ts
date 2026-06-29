/**
 * Tiny theme manager. Persists the user's preference in
 * `localStorage["octofocus:theme"]` and applies it by toggling
 * `data-theme` on the document element. The CSS reads
 * `:root[data-theme="light"]` / `:root[data-theme="dark"]` overrides
 * and falls back to the @media (prefers-color-scheme: dark) default
 * when `data-theme="system"` (or unset).
 *
 * Three options: `light` · `dark` · `system`. Default is `system`.
 */
import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "octofocus:theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(next: Theme) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    setThemeState(next);
  }

  return { theme, setTheme };
}

/** Read once at boot so the document already has the right value
 *  before React mounts — avoids a flash of the wrong colours. */
export function bootstrapTheme(): void {
  applyTheme(readStoredTheme());
}
