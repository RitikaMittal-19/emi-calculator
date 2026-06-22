"use client";

import { useCalculatorState } from "@/hooks/useCalculatorState";

/**
 * Sun/moon icon pair, drawn inline rather than pulled from an icon
 * library — two small icons don't justify a dependency, and inline SVG
 * lets them inherit currentColor cleanly for both themes.
 */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
      />
    </svg>
  );
}

/**
 * Toggles between light and dark theme. Backed by useCalculatorState's
 * toggleTheme, which dispatches through the same synced-state pipeline as
 * every other action — once Phase 8's sync engine is in play (it is, as
 * of this codebase), the resulting SET_THEME action broadcasts to every
 * other open tab automatically, and ThemeClassSync (app/providers.tsx)
 * applies the change to <html> in each of them. No theme-specific sync
 * logic needed here at all.
 */
export function ThemeToggle() {
  const { state, toggleTheme } = useCalculatorState();
  const isDark = state.theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-gold hover:text-ink"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
