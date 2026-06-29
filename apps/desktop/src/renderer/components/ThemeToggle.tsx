/**
 * Three-way theme toggle. Cycles light → dark → system on click.
 * Renders as a single icon button so it slots into the existing
 * header layouts without adding chrome.
 */
import { useTheme, type Theme } from "../lib/theme";

const ORDER: Theme[] = ["light", "dark", "system"];

function nextTheme(current: Theme): Theme {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length]!;
}

function iconFor(theme: Theme): string {
  if (theme === "light") return "☀️";
  if (theme === "dark") return "🌙";
  return "🖥";
}

function labelFor(theme: Theme): string {
  if (theme === "light") return "Light";
  if (theme === "dark") return "Dark";
  return "System";
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme(theme))}
      className="hover:bg-accent text-muted-foreground hover:text-foreground flex h-7 items-center gap-1 rounded px-1.5 text-xs"
      title={`Theme: ${labelFor(theme)} — click to cycle`}
      aria-label={`Switch theme (currently ${labelFor(theme)})`}
    >
      <span className="leading-none">{iconFor(theme)}</span>
    </button>
  );
}
