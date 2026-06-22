"use client";

import { useCalculatorState } from "@/hooks/useCalculatorState";

/**
 * Displays the live count of currently-open tabs, derived directly from
 * state.presence — which usePresence (wired into AppStateProvider) keeps
 * current via join/heartbeat/leave broadcasts and local stale-entry
 * pruning. No polling, no local timer logic here at all — this component
 * is a pure, reactive view over already-correct state.
 */
export function ActiveTabsBadge() {
  const { state } = useCalculatorState();
  const count = state.presence.length;
  const label = count === 1 ? "1 tab open" : `${count} tabs open`;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft"
      role="status"
      aria-label={`${label}, synced live across tabs`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal-green" />
      <span className="font-mono tabular-nums">{count}</span>
      <span>{count === 1 ? "tab" : "tabs"}</span>
    </div>
  );
}
