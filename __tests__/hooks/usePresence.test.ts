import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePresence } from "@/hooks/usePresence";
import type { AppAction } from "@/lib/state/actions";

function countCallsOfType(dispatch: ReturnType<typeof vi.fn>, type: AppAction["type"]): number {
  return dispatch.mock.calls.filter((call) => (call[0] as AppAction).type === type).length;
}

describe("usePresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches TAB_JOINED immediately on mount", () => {
    const dispatch = vi.fn();
    renderHook(() => usePresence({ tabId: "tab-a", dispatch, enabled: true }));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TAB_JOINED",
        payload: expect.objectContaining({ tabId: "tab-a" }),
      }),
    );
  });

  it("dispatches TAB_HEARTBEAT every 2 seconds", () => {
    const dispatch = vi.fn();
    renderHook(() => usePresence({ tabId: "tab-a", dispatch, enabled: true }));
    dispatch.mockClear(); // clear the initial TAB_JOINED call

    vi.advanceTimersByTime(2_000);
    expect(countCallsOfType(dispatch, "TAB_HEARTBEAT")).toBe(1);

    vi.advanceTimersByTime(2_000);
    expect(countCallsOfType(dispatch, "TAB_HEARTBEAT")).toBe(2);

    vi.advanceTimersByTime(2_000);
    expect(countCallsOfType(dispatch, "TAB_HEARTBEAT")).toBe(3);
  });

  it("does not dispatch a heartbeat before 2 seconds have elapsed", () => {
    const dispatch = vi.fn();
    renderHook(() => usePresence({ tabId: "tab-a", dispatch, enabled: true }));
    dispatch.mockClear();

    vi.advanceTimersByTime(1_999);
    // The independent 1s prune timer WILL have fired once in this window —
    // that's correct and expected, not a heartbeat. Only heartbeats are
    // under test here.
    expect(countCallsOfType(dispatch, "TAB_HEARTBEAT")).toBe(0);
  });

  it("dispatches PRUNE_PRESENCE periodically (independent of the heartbeat interval)", () => {
    const dispatch = vi.fn();
    renderHook(() => usePresence({ tabId: "tab-a", dispatch, enabled: true }));
    dispatch.mockClear();

    vi.advanceTimersByTime(1_000);
    expect(countCallsOfType(dispatch, "PRUNE_PRESENCE")).toBeGreaterThanOrEqual(1);
  });

  it("does NOT dispatch TAB_LEFT on unmount itself — that responsibility belongs to useBroadcastSync's cleanup (see hook doc comment)", () => {
    // This is intentional, not an oversight: TAB_LEFT-on-unmount must be
    // announced in the SAME cleanup function that closes the
    // BroadcastChannel, since React cleans up effects in declaration
    // order, not reverse order. If usePresence announced TAB_LEFT in its
    // own separate cleanup, whether it fired before or after the channel
    // closed would depend on hook declaration order in the parent
    // component — exactly the bug this test guards against regressing to.
    // usePresence's unmount responsibility is just clearing its own
    // timers/listener; useBroadcastSync has its own dedicated test
    // confirming it announces TAB_LEFT before closing.
    const dispatch = vi.fn();
    const { unmount } = renderHook(() =>
      usePresence({ tabId: "tab-a", dispatch, enabled: true }),
    );
    dispatch.mockClear();

    unmount();

    const tabLeftCalls = dispatch.mock.calls.filter(
      (call) => (call[0] as { type: string }).type === "TAB_LEFT",
    );
    expect(tabLeftCalls).toHaveLength(0);
  });

  it("clears both intervals on unmount (no further dispatches after unmounting)", () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() =>
      usePresence({ tabId: "tab-a", dispatch, enabled: true }),
    );
    unmount();
    dispatch.mockClear();

    vi.advanceTimersByTime(10_000);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does nothing at all when enabled is false — no TAB_JOINED, no timers", () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() =>
      usePresence({ tabId: "tab-a", dispatch, enabled: false }),
    );

    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(dispatch).not.toHaveBeenCalled();

    unmount();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("registers a beforeunload listener that dispatches TAB_LEFT, and removes it on unmount", () => {
    const dispatch = vi.fn();
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      usePresence({ tabId: "tab-a", dispatch, enabled: true }),
    );

    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    // Simulate the browser firing beforeunload (e.g. real tab close).
    dispatch.mockClear();
    window.dispatchEvent(new Event("beforeunload"));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TAB_LEFT", payload: { tabId: "tab-a" } }),
    );

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
