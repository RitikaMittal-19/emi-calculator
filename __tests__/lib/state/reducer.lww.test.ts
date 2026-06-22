import { describe, expect, it } from "vitest";
import { actionCreators } from "@/lib/state/actions";
import { createInitialState } from "@/lib/state/initialState";
import { calculatorReducer } from "@/lib/state/reducer";

describe("calculatorReducer — LWW guard", () => {
  it("always applies a local action regardless of slice timestamp", () => {
    const state = createInitialState("tab-a");
    const action = actionCreators.setTheme("tab-a", "dark", "local");

    const next = calculatorReducer(state, action);

    expect(next.theme).toBe("dark");
    expect(next.sliceTimestamps.theme).toBe(action.meta.timestamp);
  });

  it("applies a remote action when its timestamp is newer than the slice's current timestamp", () => {
    let state = createInitialState("tab-a");
    // First, a local update bumps the theme slice timestamp.
    state = calculatorReducer(state, actionCreators.setTheme("tab-a", "dark", "local"));

    // A remote action with a strictly later timestamp should apply.
    const remoteAction = actionCreators.setTheme("tab-b", "light", "remote");
    remoteAction.meta.timestamp = state.sliceTimestamps.theme + 1000;

    const next = calculatorReducer(state, remoteAction);
    expect(next.theme).toBe("light");
  });

  it("drops a remote action whose timestamp is OLDER than the slice's current timestamp (stale)", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(state, actionCreators.setTheme("tab-a", "dark", "local"));
    const currentTimestamp = state.sliceTimestamps.theme;

    const staleRemoteAction = actionCreators.setTheme("tab-b", "light", "remote");
    staleRemoteAction.meta.timestamp = currentTimestamp - 1000; // older

    const next = calculatorReducer(state, staleRemoteAction);

    // State is untouched — theme remains "dark", the local value wins.
    expect(next.theme).toBe("dark");
    expect(next).toBe(state); // same reference: reducer returned state unchanged
  });

  it("applies a remote action with an EQUAL timestamp (>=, not strictly >)", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(state, actionCreators.setTheme("tab-a", "dark", "local"));
    const currentTimestamp = state.sliceTimestamps.theme;

    const remoteAction = actionCreators.setTheme("tab-b", "light", "remote");
    remoteAction.meta.timestamp = currentTimestamp; // exactly equal

    const next = calculatorReducer(state, remoteAction);
    expect(next.theme).toBe("light");
  });

  it("tracks LWW independently PER SLICE — a stale update to one slice does not affect another", () => {
    let state = createInitialState("tab-a");
    // Bump theme's timestamp far into the future locally.
    const futureThemeAction = actionCreators.setTheme("tab-a", "dark", "local");
    futureThemeAction.meta.timestamp = Date.now() + 1_000_000;
    state = calculatorReducer(state, futureThemeAction);

    // A remote loanInput update with a normal "now" timestamp (which would
    // be "stale" relative to the theme slice) must still apply, because
    // loanInput has its own independent timestamp starting at 0.
    const loanAction = actionCreators.setLoanInput(
      "tab-b",
      { principal: 999_999 },
      "remote",
    );

    const next = calculatorReducer(state, loanAction);
    expect(next.primaryLoan.principal).toBe(999_999);
    expect(next.theme).toBe("dark"); // untouched, still applied correctly
  });

  it("HYDRATE_STATE is not gated by the per-slice LWW guard (always applies)", () => {
    let state = createInitialState("tab-a");
    // Push loanInput's timestamp far into the future.
    const futureLoanAction = actionCreators.setLoanInput(
      "tab-a",
      { principal: 1 },
      "local",
    );
    futureLoanAction.meta.timestamp = Date.now() + 1_000_000;
    state = calculatorReducer(state, futureLoanAction);

    // HYDRATE_STATE with an "older" timestamp should still apply, since
    // hydration represents authoritative catch-up state, not a regular
    // conflicting edit.
    const hydrateAction = actionCreators.hydrateState("tab-b", {
      primaryLoan: { id: "primary", principal: 42, annualRate: 5, tenureMonths: 12 },
    });
    hydrateAction.meta.timestamp = Date.now();

    const next = calculatorReducer(state, hydrateAction);
    expect(next.primaryLoan.principal).toBe(42);
  });
});
