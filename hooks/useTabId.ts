"use client";

import { useState } from "react";

/**
 * Generates a stable, unique identifier for this browser tab on first
 * render and memoizes it for the lifetime of the tab (i.e. for as long as
 * this component tree stays mounted — a full page reload gets a new ID,
 * which is correct: a reloaded tab is, for sync purposes, a new tab).
 *
 * Uses useState's lazy initializer (not useMemo/useEffect) so the ID is
 * generated exactly once, synchronously, before first render — components
 * reading it (like AppStateProvider, which seeds initial state from it)
 * never see an undefined/placeholder value.
 *
 * The heartbeat broadcast loop that uses this ID lives in usePresence
 * (wired into AppStateProvider), not in this hook — this hook's only
 * responsibility is ID generation, kept deliberately minimal and trivially
 * testable in isolation.
 */
export function useTabId(): string {
  const [tabId] = useState(() => crypto.randomUUID());
  return tabId;
}
