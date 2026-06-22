import { describe, expect, it } from "vitest";
import { actionCreators } from "@/lib/state/actions";
import { createInitialState } from "@/lib/state/initialState";
import { calculatorReducer } from "@/lib/state/reducer";

describe("createInitialState", () => {
  it("seeds a valid, immediately-usable primary loan (positive principal/rate/tenure)", () => {
    const state = createInitialState("tab-a");
    expect(state.primaryLoan.principal).toBeGreaterThan(0);
    expect(state.primaryLoan.annualRate).toBeGreaterThanOrEqual(0);
    expect(state.primaryLoan.tenureMonths).toBeGreaterThan(0);
  });

  it("starts with no prepayments and no comparison scenarios", () => {
    const state = createInitialState("tab-a");
    expect(state.prepayments).toEqual([]);
    expect(state.comparisonScenarios).toEqual([]);
    expect(state.activeComparisonId).toBeNull();
  });

  it("starts in calculator mode with light theme", () => {
    const state = createInitialState("tab-a");
    expect(state.activeMode).toBe("calculator");
    expect(state.theme).toBe("light");
  });

  it("initializes every slice timestamp to 0", () => {
    const state = createInitialState("tab-a");
    expect(Object.values(state.sliceTimestamps).every((t) => t === 0)).toBe(true);
  });

  it("sets currentTabId to the provided tabId and includes it in presence", () => {
    const state = createInitialState("my-unique-tab");
    expect(state.currentTabId).toBe("my-unique-tab");
    expect(state.presence.some((p) => p.tabId === "my-unique-tab")).toBe(true);
  });

  it("produces independent state objects across calls (no shared mutable references)", () => {
    const a = createInitialState("tab-a");
    const b = createInitialState("tab-b");
    a.prepayments.push({ id: "x", month: 1, amount: 100 });
    expect(b.prepayments).toEqual([]);
  });
});

describe("calculatorReducer — prepayments", () => {
  it("adds a prepayment", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(
      state,
      actionCreators.addPrepayment("tab-a", { id: "p1", month: 12, amount: 50_000 }),
    );
    expect(next.prepayments).toHaveLength(1);
    expect(next.prepayments[0]).toMatchObject({ id: "p1", month: 12, amount: 50_000 });
  });

  it("adds multiple prepayments without disturbing existing ones", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addPrepayment("tab-a", { id: "p1", month: 12, amount: 50_000 }),
    );
    state = calculatorReducer(
      state,
      actionCreators.addPrepayment("tab-a", { id: "p2", month: 24, amount: 30_000 }),
    );
    expect(state.prepayments).toHaveLength(2);
  });

  it("removes a prepayment by id", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addPrepayment("tab-a", { id: "p1", month: 12, amount: 50_000 }),
    );
    state = calculatorReducer(state, actionCreators.removePrepayment("tab-a", "p1"));
    expect(state.prepayments).toHaveLength(0);
  });

  it("removing a non-existent prepayment id is a harmless no-op", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(
      state,
      actionCreators.removePrepayment("tab-a", "does-not-exist"),
    );
    expect(next.prepayments).toEqual([]);
  });

  it("SET_PREPAYMENTS replaces the entire list at once", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.addPrepayment("tab-a", { id: "p1", month: 12, amount: 50_000 }),
    );
    state = calculatorReducer(
      state,
      actionCreators.setPrepayments("tab-a", [
        { id: "p2", month: 6, amount: 10_000 },
        { id: "p3", month: 18, amount: 20_000 },
      ]),
    );
    expect(state.prepayments.map((p) => p.id)).toEqual(["p2", "p3"]);
  });
});
