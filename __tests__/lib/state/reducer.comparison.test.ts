import { describe, expect, it } from "vitest";
import { actionCreators } from "@/lib/state/actions";
import { createInitialState } from "@/lib/state/initialState";
import { calculatorReducer } from "@/lib/state/reducer";
import type { LoanInput } from "@/types/loan";

function makeScenario(id: string): LoanInput {
  return { id, principal: 500_000, annualRate: 8, tenureMonths: 60, label: id };
}

describe("calculatorReducer — comparison scenarios", () => {
  it("adds a scenario", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    expect(next.comparisonScenarios).toHaveLength(1);
    expect(next.comparisonScenarios[0].id).toBe("a");
  });

  it("allows adding up to exactly 3 scenarios", () => {
    let state = createInitialState("tab-a");
    for (const id of ["a", "b", "c"]) {
      state = calculatorReducer(
        state,
        actionCreators.addComparisonScenario("tab-a", makeScenario(id)),
      );
    }
    expect(state.comparisonScenarios).toHaveLength(3);
  });

  it("rejects a 4th scenario, enforced in the reducer itself (not just the UI)", () => {
    let state = createInitialState("tab-a");
    for (const id of ["a", "b", "c"]) {
      state = calculatorReducer(
        state,
        actionCreators.addComparisonScenario("tab-a", makeScenario(id)),
      );
    }
    const beforeFourth = state;
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("d")),
    );
    expect(state.comparisonScenarios).toHaveLength(3);
    expect(state.comparisonScenarios.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(state).toBe(beforeFourth); // unchanged reference, action was a no-op
  });

  it("rejects a 4th scenario even when it arrives as a REMOTE action", () => {
    let state = createInitialState("tab-a");
    for (const id of ["a", "b", "c"]) {
      state = calculatorReducer(
        state,
        actionCreators.addComparisonScenario("tab-a", makeScenario(id)),
      );
    }
    const remoteAdd = actionCreators.addComparisonScenario(
      "tab-b",
      makeScenario("d"),
      "remote",
    );
    remoteAdd.meta.timestamp = Date.now() + 1_000_000; // not stale, just over the cap
    state = calculatorReducer(state, remoteAdd);
    expect(state.comparisonScenarios).toHaveLength(3);
  });

  it("removes a scenario by id", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    state = calculatorReducer(
      state,
      actionCreators.removeComparisonScenario("tab-a", "a"),
    );
    expect(state.comparisonScenarios).toHaveLength(0);
  });

  it("clears activeComparisonId when the active scenario is removed", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    state = calculatorReducer(
      state,
      actionCreators.setActiveComparisonId("tab-a", "a"),
    );
    expect(state.activeComparisonId).toBe("a");

    state = calculatorReducer(
      state,
      actionCreators.removeComparisonScenario("tab-a", "a"),
    );
    expect(state.activeComparisonId).toBeNull();
  });

  it("retains activeComparisonId when a DIFFERENT scenario is removed", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("b")),
    );
    state = calculatorReducer(
      state,
      actionCreators.setActiveComparisonId("tab-a", "a"),
    );

    state = calculatorReducer(
      state,
      actionCreators.removeComparisonScenario("tab-a", "b"),
    );
    // "Retain last active scenario": removing an unrelated scenario must
    // not disturb the currently active one.
    expect(state.activeComparisonId).toBe("a");
  });

  it("retains activeComparisonId across an unrelated mode switch", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    state = calculatorReducer(
      state,
      actionCreators.setActiveComparisonId("tab-a", "a"),
    );
    state = calculatorReducer(
      state,
      actionCreators.setActiveMode("tab-a", "sensitivity"),
    );
    state = calculatorReducer(
      state,
      actionCreators.setActiveMode("tab-a", "comparison"),
    );
    expect(state.activeComparisonId).toBe("a");
  });

  it("updates an existing scenario's fields without affecting others", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("a")),
    );
    state = calculatorReducer(
      state,
      actionCreators.addComparisonScenario("tab-a", makeScenario("b")),
    );
    state = calculatorReducer(
      state,
      actionCreators.updateComparisonScenario("tab-a", "a", { principal: 750_000 }),
    );
    const scenarioA = state.comparisonScenarios.find((s) => s.id === "a");
    const scenarioB = state.comparisonScenarios.find((s) => s.id === "b");
    expect(scenarioA?.principal).toBe(750_000);
    expect(scenarioB?.principal).toBe(500_000); // untouched
  });
});
