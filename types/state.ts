import type { LoanInput } from "./loan";
import type { Prepayment } from "./prepayment";
import type { StateSlice, TabPresence } from "./sync";

export type ThemeMode = "light" | "dark";
export type AppMode = "calculator" | "comparison" | "sensitivity";

/**
 * The single root state shape for the entire application, owned by the
 * top-level useReducer (see lib/state/reducer.ts). Every field here is
 * either:
 *   (a) part of the cross-tab synced surface (loanInput, theme, prepayments,
 *       comparison, activeMode) — guarded by sliceTimestamps for LWW, or
 *   (b) purely local to this tab (currentTabId, presence) — never subject
 *       to the LWW guard, since presence is a union of independent
 *       per-tab reports, not a single agreed-upon value.
 */
export interface AppState {
  /**
   * Last-applied timestamp per synced slice, used to reject stale remote
   * actions (see reducer.ts applySliceUpdate). Local actions always apply
   * regardless of this map — only remote actions are checked against it.
   */
  sliceTimestamps: Record<StateSlice, number>;

  theme: ThemeMode;
  activeMode: AppMode;

  /** The primary loan being calculated/amortized in Calculator mode. */
  primaryLoan: LoanInput;

  /** Up to 3 scenarios for Comparison mode. Enforced by the reducer, not just the UI. */
  comparisonScenarios: LoanInput[];

  /** Which comparison scenario is currently focused/expanded; persists across mode switches. */
  activeComparisonId: string | null;

  /** One-time lump-sum prepayments applied to primaryLoan. */
  prepayments: Prepayment[];

  /** This tab's own stable identifier. Never synced — every tab has its own. */
  currentTabId: string;

  /** Live presence of all tabs currently believed to be open, including this one. */
  presence: TabPresence[];
}
