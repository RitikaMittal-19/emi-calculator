import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStateProvider, useAppStateContext } from "@/lib/state/context";
import { actionCreators } from "@/lib/state/actions";

function wrapper({ children }: { children: ReactNode }) {
  // enableSync={false}: these tests verify the Context/Provider contract
  // (dispatch updates state, error boundary behavior) independent of
  // cross-tab sync. Sync-enabled behavior has its own dedicated tests in
  // __tests__/lib/sync/.
  return (
    <AppStateProvider tabId="test-tab" enableSync={false}>
      {children}
    </AppStateProvider>
  );
}

describe("AppStateProvider + useAppStateContext", () => {
  it("provides initial state seeded with the given tabId", () => {
    const { result } = renderHook(() => useAppStateContext(), { wrapper });
    expect(result.current.state.currentTabId).toBe("test-tab");
    expect(result.current.state.theme).toBe("light");
  });

  it("dispatch updates state and triggers a re-render with the new value", () => {
    const { result } = renderHook(() => useAppStateContext(), { wrapper });

    act(() => {
      result.current.dispatch(actionCreators.setTheme("test-tab", "dark"));
    });

    expect(result.current.state.theme).toBe("dark");
  });

  it("multiple dispatches accumulate correctly across re-renders", () => {
    const { result } = renderHook(() => useAppStateContext(), { wrapper });

    act(() => {
      result.current.dispatch(
        actionCreators.addPrepayment("test-tab", { id: "p1", month: 6, amount: 10_000 }),
      );
    });
    act(() => {
      result.current.dispatch(
        actionCreators.addPrepayment("test-tab", { id: "p2", month: 12, amount: 20_000 }),
      );
    });

    expect(result.current.state.prepayments).toHaveLength(2);
  });

  it("throws a clear error when used outside of AppStateProvider", () => {
    // Suppress the expected React error boundary console noise for this
    // specific negative test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAppStateContext());
    }).toThrow(/must be used within an AppStateProvider/);
    consoleSpy.mockRestore();
  });
});
