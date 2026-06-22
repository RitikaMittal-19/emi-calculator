import type { AppState } from "@/types/state";
import type { StateSlice } from "@/types/sync";

/**
 * The default loan shown on first load, before the user has changed
 * anything. Chosen to be a realistic, round-number home-loan example so the
 * calculator never starts on a degenerate (zero or empty) state — every
 * downstream calculation (EMI, amortization, sensitivity) needs valid
 * positive inputs to avoid throwing on initial render.
 */
const DEFAULT_PRIMARY_LOAN = {
  id: "primary",
  principal: 2_500_000,
  annualRate: 8.5,
  tenureMonths: 240,
} as const;

const ALL_SLICES: StateSlice[] = [
  "loanInput",
  "theme",
  "prepayments",
  "comparison",
  "activeMode",
];

/**
 * Builds the initial AppState for a fresh tab. Takes `tabId` as a parameter
 * (rather than generating one internally) so the caller — useTabId, in a
 * later phase — owns ID generation and this function stays a pure,
 * easily-testable builder.
 *
 * sliceTimestamps all start at 0 (the epoch baseline), meaning genuinely
 * any real timestamp from any tab will be treated as newer and win the LWW
 * check the first time a sync message arrives.
 */
export function createInitialState(tabId: string): AppState {
  const sliceTimestamps = Object.fromEntries(
    ALL_SLICES.map((slice) => [slice, 0]),
  ) as Record<StateSlice, number>;

  return {
    sliceTimestamps,
    theme: "light",
    activeMode: "calculator",
    primaryLoan: { ...DEFAULT_PRIMARY_LOAN },
    comparisonScenarios: [],
    activeComparisonId: null,
    prepayments: [],
    currentTabId: tabId,
    presence: [
      { tabId, lastHeartbeat: Date.now(), joinedAt: Date.now() },
    ],
  };
}
