"use client";

import { useRef } from "react";
import type { AppMode } from "@/types/state";

interface ModeTabsProps {
  activeMode: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES: { value: AppMode; label: string }[] = [
  { value: "calculator", label: "Calculator" },
  { value: "comparison", label: "Compare" },
  { value: "sensitivity", label: "Sensitivity" },
];

/** Derives the tabpanel id a given mode's tab controls. Exported so page.tsx can apply the matching id to each rendered panel. */
export function tabPanelId(mode: AppMode): string {
  return `mode-panel-${mode}`;
}

function tabId(mode: AppMode): string {
  return `mode-tab-${mode}`;
}

/**
 * Switches between the three top-level app modes. Backed by activeMode in
 * synced state — per architecture §6 (Cross-Tab Sync), the active mode
 * itself is synced across tabs, so switching modes in one tab switches it
 * everywhere.
 *
 * Implements the complete WAI-ARIA tablist pattern, not just the
 * surface-level role attributes:
 *   - aria-controls links each tab to its rendered tabpanel (see
 *     tabPanelId, used by page.tsx on the panel elements).
 *   - Roving tabindex + arrow-key navigation: only the active tab is in
 *     the normal Tab order (tabIndex 0); the others are reachable via
 *     ArrowLeft/ArrowRight once focus is inside the tablist, which is the
 *     standard expected keyboard behavior for this pattern and was
 *     explicitly flagged as deferred when this component was first built.
 */
export function ModeTabs({ activeMode, onChange }: ModeTabsProps) {
  const tabRefs = useRef<Map<AppMode, HTMLButtonElement>>(new Map());

  function focusAndSelect(mode: AppMode) {
    onChange(mode);
    tabRefs.current.get(mode)?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, currentIndex: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + MODES.length) % MODES.length;
    focusAndSelect(MODES[nextIndex].value);
  }

  return (
    <div
      role="tablist"
      aria-label="Calculator mode"
      className="flex gap-1 overflow-x-auto border-b border-rule"
    >
      {MODES.map((mode, index) => {
        const isActive = activeMode === mode.value;
        return (
          <button
            key={mode.value}
            ref={(el) => {
              if (el) tabRefs.current.set(mode.value, el);
              else tabRefs.current.delete(mode.value);
            }}
            type="button"
            role="tab"
            id={tabId(mode.value)}
            aria-controls={tabPanelId(mode.value)}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(mode.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-gold text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
