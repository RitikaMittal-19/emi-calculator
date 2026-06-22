"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AppAction } from "./actions";
import { createInitialState } from "./initialState";
import { calculatorReducer } from "./reducer";
import { useBroadcastSync } from "@/hooks/useBroadcastSync";
import { usePresence } from "@/hooks/usePresence";
import type { AppState } from "@/types/state";

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

interface AppStateProviderProps {
  children: ReactNode;
  /**
   * The stable per-tab identifier this provider's state is rooted on.
   * Passed in explicitly (rather than generated inside the provider) so ID
   * generation stays owned by useTabId and this component remains
   * trivially testable with a fixed ID.
   */
  tabId: string;
  /**
   * Whether to wire up BroadcastChannel cross-tab sync. Defaults to true
   * for real app usage. Tests that only care about isolated reducer
   * behavior (the majority of the existing test suite, written in Phases
   * 2–7 before sync existed) pass false to keep the provider a pure,
   * side-effect-free in-memory reducer — avoiding real BroadcastChannel
   * instances (and their async message timing) in tests that have nothing
   * to do with cross-tab behavior.
   */
  enableSync?: boolean;
}

/**
 * Root state provider for the entire application. Wraps useReducer +
 * Context per architecture §4.1 — this is intentionally the ONLY piece of
 * global state in the app; no Redux/Zustand, per the hooks-only constraint.
 *
 * When enableSync is true (the default), the dispatch function exposed to
 * consumers is useBroadcastSync's wrapped dispatch — every locally-
 * originated action is also broadcast to other tabs over BroadcastChannel,
 * and incoming remote actions are applied without being re-broadcast. See
 * useBroadcastSync's doc comment for the full loop-prevention rationale.
 */
export function AppStateProvider({
  children,
  tabId,
  enableSync = true,
}: AppStateProviderProps) {
  const [state, rawDispatch] = useReducer(
    calculatorReducer,
    tabId,
    createInitialState,
  );

  const { dispatch: syncedDispatch } = useBroadcastSync({
    tabId,
    state,
    rawDispatch,
  });

  const dispatch = enableSync ? syncedDispatch : rawDispatch;

  // Presence (join/heartbeat/leave/prune) always uses the SYNCED dispatch
  // regardless of which dispatch consumers receive via Context — presence
  // actions are meaningless if they never reach other tabs. Gated by the
  // same enableSync flag: when sync is off (most existing tests), there's
  // no cross-tab concept to track presence for, and we don't want a
  // background heartbeat interval running in tests that don't need it.
  usePresence({ tabId, dispatch: syncedDispatch, enabled: enableSync });

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Low-level access to the raw { state, dispatch } pair. Most components
 * should prefer the higher-level useCalculatorState hook, which exposes
 * ergonomic action-bound callbacks instead of a raw dispatch. This hook
 * exists for that hook to build on, and for tests.
 */
export function useAppStateContext(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error("useAppStateContext must be used within an AppStateProvider");
  }
  return context;
}
