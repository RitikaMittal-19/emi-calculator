"use client";

import { useAppStateContext } from "@/lib/state/context";
import { actionCreators } from "@/lib/state/actions";
import type { LoanInput } from "@/types/loan";
import type { Prepayment } from "@/types/prepayment";
import type { AppMode, ThemeMode } from "@/types/state";

/**
 * The primary public API for reading and mutating application state.
 * Wraps the raw {state, dispatch} pair from useAppStateContext with bound
 * callbacks (tabId already applied, origin defaults to "local") so
 * components never construct actions by hand — every call site that wants
 * to, say, change the loan amount just calls `setLoanInput({ principal })`.
 *
 * Deliberately NOT manually memoized (no useCallback/useMemo): this hook's
 * job is to bind a few cheap closures, called from event handlers, not a
 * hot render-loop path — manual memoization here added complexity without
 * a measurable benefit, and actively fights eslint-config-next's
 * react-hooks/preserve-manual-memoization rule (a forward-looking check
 * for the React Compiler, which this project doesn't enable yet, but whose
 * lint rule already ships in this Next.js version's default config).
 *
 * This is also the seam where the sync engine (Phase 8) hooks in: once
 * built, an effect in AppStateProvider (or a sibling hook) will broadcast
 * every locally-dispatched action over BroadcastChannel. Nothing about
 * this hook's public surface needs to change when that happens — it's an
 * internal concern of the dispatch pipeline.
 */
export function useCalculatorState() {
  const { state, dispatch } = useAppStateContext();
  const { currentTabId } = state;

  return {
    state,

    setLoanInput(payload: Parameters<typeof actionCreators.setLoanInput>[1]) {
      dispatch(actionCreators.setLoanInput(currentTabId, payload));
    },

    setTheme(theme: ThemeMode) {
      dispatch(actionCreators.setTheme(currentTabId, theme));
    },

    toggleTheme() {
      dispatch(
        actionCreators.setTheme(currentTabId, state.theme === "dark" ? "light" : "dark"),
      );
    },

    setActiveMode(mode: AppMode) {
      dispatch(actionCreators.setActiveMode(currentTabId, mode));
    },

    addPrepayment(prepayment: Prepayment) {
      dispatch(actionCreators.addPrepayment(currentTabId, prepayment));
    },

    removePrepayment(id: string) {
      dispatch(actionCreators.removePrepayment(currentTabId, id));
    },

    setPrepayments(prepayments: Prepayment[]) {
      dispatch(actionCreators.setPrepayments(currentTabId, prepayments));
    },

    addComparisonScenario(scenario: LoanInput) {
      dispatch(actionCreators.addComparisonScenario(currentTabId, scenario));
    },

    removeComparisonScenario(id: string) {
      dispatch(actionCreators.removeComparisonScenario(currentTabId, id));
    },

    updateComparisonScenario(id: string, updates: Partial<Omit<LoanInput, "id">>) {
      dispatch(actionCreators.updateComparisonScenario(currentTabId, id, updates));
    },

    setActiveComparisonId(id: string | null) {
      dispatch(actionCreators.setActiveComparisonId(currentTabId, id));
    },
  };
}
