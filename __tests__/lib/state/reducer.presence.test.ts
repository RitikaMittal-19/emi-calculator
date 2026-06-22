import { describe, expect, it } from "vitest";
import { actionCreators } from "@/lib/state/actions";
import { createInitialState } from "@/lib/state/initialState";
import { calculatorReducer } from "@/lib/state/reducer";

describe("calculatorReducer — presence", () => {
  it("seeds initial state with the current tab already present", () => {
    const state = createInitialState("tab-a");
    expect(state.presence).toHaveLength(1);
    expect(state.presence[0].tabId).toBe("tab-a");
  });

  it("adds a new tab on TAB_JOINED", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: Date.now(), joinedAt: Date.now() }),
    );
    expect(next.presence).toHaveLength(2);
    expect(next.presence.map((p) => p.tabId).sort()).toEqual(["tab-a", "tab-b"]);
  });

  it("does not duplicate a tab that's already present (idempotent TAB_JOINED)", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: Date.now(), joinedAt: Date.now() }),
    );
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: Date.now(), joinedAt: Date.now() }),
    );
    expect(state.presence).toHaveLength(2);
  });

  it("updates lastHeartbeat for a known tab on TAB_HEARTBEAT", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: 1000, joinedAt: 1000 }),
    );
    state = calculatorReducer(state, actionCreators.tabHeartbeat("tab-b", 5000));
    const tabB = state.presence.find((p) => p.tabId === "tab-b");
    expect(tabB?.lastHeartbeat).toBe(5000);
  });

  it("treats a heartbeat from an unknown tab as an implicit join", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(state, actionCreators.tabHeartbeat("tab-unknown", 5000));
    expect(next.presence.some((p) => p.tabId === "tab-unknown")).toBe(true);
  });

  it("removes a tab immediately on TAB_LEFT (clean close)", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: Date.now(), joinedAt: Date.now() }),
    );
    state = calculatorReducer(state, actionCreators.tabLeft("tab-b"));
    expect(state.presence.map((p) => p.tabId)).toEqual(["tab-a"]);
  });

  it("prunes a tab whose last heartbeat exceeds the 6-second timeout", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: 0, joinedAt: 0 }),
    );
    // 6001ms later — just over the 6000ms timeout threshold.
    state = calculatorReducer(state, actionCreators.prunePresence(6001));
    expect(state.presence.map((p) => p.tabId)).toEqual(["tab-a"]);
  });

  it("does NOT prune a tab exactly at the 6-second boundary (inclusive)", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "tab-b", lastHeartbeat: 0, joinedAt: 0 }),
    );
    state = calculatorReducer(state, actionCreators.prunePresence(6000));
    expect(state.presence.map((p) => p.tabId).sort()).toEqual(["tab-a", "tab-b"]);
  });

  it("never prunes the current tab's own entry, even if its heartbeat looks stale", () => {
    const state = createInitialState("tab-a");
    // Force the current tab's own heartbeat to look ancient.
    const stalePresent = {
      ...state,
      presence: [{ tabId: "tab-a", lastHeartbeat: 0, joinedAt: 0 }],
    };
    const next = calculatorReducer(stalePresent, actionCreators.prunePresence(999_999));
    expect(next.presence.map((p) => p.tabId)).toEqual(["tab-a"]);
  });

  it("returns the same state reference when nothing was pruned (avoids unnecessary re-renders)", () => {
    const state = createInitialState("tab-a");
    const next = calculatorReducer(state, actionCreators.prunePresence(Date.now()));
    expect(next).toBe(state);
  });

  it("prunes multiple stale tabs at once, keeping only fresh ones and the current tab", () => {
    let state = createInitialState("tab-a");
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "stale-1", lastHeartbeat: 0, joinedAt: 0 }),
    );
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "stale-2", lastHeartbeat: 0, joinedAt: 0 }),
    );
    state = calculatorReducer(
      state,
      actionCreators.tabJoined({ tabId: "fresh", lastHeartbeat: 10_000, joinedAt: 10_000 }),
    );
    state = calculatorReducer(state, actionCreators.prunePresence(10_001));
    expect(state.presence.map((p) => p.tabId).sort()).toEqual(["fresh", "tab-a"]);
  });
});
