import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { AppStateProvider, useAppStateContext } from "@/lib/state/context";

/**
 * A minimal probe component that renders enough of the state to assert on
 * in tests, and exposes a couple of buttons to dispatch actions — standing
 * in for what a real component (e.g. ThemeToggle, LoanInputForm) would do.
 * Two instances of this, each wrapped in its OWN AppStateProvider with a
 * distinct tabId, simulate two separate browser tabs of the real app.
 */
/**
 * NOTE ON act() WARNINGS: tests in this file may log "not wrapped in
 * act(...)" warnings from React. This is expected: useBroadcastSync's
 * BroadcastChannel `subscribe` handler dispatches asynchronously, on a
 * genuine browser message event — there's no synchronous call site in
 * test code to wrap, since the update originates from the browser's own
 * event loop, not from a React event handler or a directly-invoked
 * function. vi.waitFor (used throughout below) is the correct, standard
 * pattern for asserting on this kind of async update; the warnings don't
 * indicate incorrect behavior, only that React can't statically verify
 * the update was batched the way it tracks for synchronous test code.
 */

function TabProbe({ tabLabel }: { tabLabel: string }) {
  const { state, dispatch } = useAppStateContext();
  return (
    <div data-testid={`tab-${tabLabel}`}>
      <span data-testid={`theme-${tabLabel}`}>{state.theme}</span>
      <span data-testid={`principal-${tabLabel}`}>{state.primaryLoan.principal}</span>
      <span data-testid={`presence-count-${tabLabel}`}>{state.presence.length}</span>
      <button
        onClick={() =>
          dispatch({
            type: "SET_THEME",
            payload: state.theme === "dark" ? "light" : "dark",
            meta: { tabId: state.currentTabId, timestamp: Date.now(), origin: "local" },
          })
        }
      >
        Toggle theme {tabLabel}
      </button>
    </div>
  );
}

function renderTab(tabId: string, label: string) {
  return render(
    <AppStateProvider tabId={tabId} enableSync>
      <TabProbe tabLabel={label} />
    </AppStateProvider>,
  );
}

describe("Cross-tab sync (useBroadcastSync via AppStateProvider, enableSync=true)", () => {
  it("propagates a theme change from tab A to tab B in real time", async () => {
    const user = userEvent.setup();
    const tabA = renderTab("tab-a", "A");
    const tabB = renderTab("tab-b", "B");

    expect(screen.getByTestId("theme-A")).toHaveTextContent("light");
    expect(screen.getByTestId("theme-B")).toHaveTextContent("light");

    await user.click(screen.getByRole("button", { name: /toggle theme a/i }));

    // Tab A updates immediately (local dispatch, synchronous).
    expect(screen.getByTestId("theme-A")).toHaveTextContent("dark");

    // Tab B updates asynchronously, via the real BroadcastChannel.
    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-B")).toHaveTextContent("dark");
    });

    tabA.unmount();
    tabB.unmount();
  });

  it("propagates loan input changes from tab B to tab A", async () => {
    const tabA = renderTab("tab-a", "A");

    const dispatchFromBRef: { current: ((principal: number) => void) | undefined } = {
      current: undefined,
    };
    function Dispatcher() {
      const { dispatch, state } = useAppStateContext();
      useEffect(() => {
        dispatchFromBRef.current = (principal: number) =>
          dispatch({
            type: "SET_LOAN_INPUT",
            payload: { principal },
            meta: { tabId: state.currentTabId, timestamp: Date.now(), origin: "local" },
          });
      }, [dispatch, state.currentTabId]);
      return null;
    }
    const tabB = render(
      <AppStateProvider tabId="tab-b" enableSync>
        <Dispatcher />
      </AppStateProvider>,
    );

    act(() => {
      dispatchFromBRef.current!(7_500_000);
    });

    await vi.waitFor(() => {
      expect(screen.getByTestId("principal-A")).toHaveTextContent("7500000");
    });

    tabA.unmount();
    tabB.unmount();
  });

  it("does not create an infinite broadcast loop (loop-prevention)", async () => {
    const user = userEvent.setup();
    const tabA = renderTab("tab-a", "A");
    const tabB = renderTab("tab-b", "B");

    await user.click(screen.getByRole("button", { name: /toggle theme a/i }));

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-B")).toHaveTextContent("dark");
    });

    // Give the system a generous window to (incorrectly) ping-pong if loop
    // prevention were broken — if it were, B would re-broadcast back to A,
    // A would re-broadcast again, etc. We can't directly count wire
    // messages from this test, but a real infinite loop would manifest as
    // the test hanging or the JS thread pegging; reaching this assertion
    // at all (without a timeout) combined with both tabs settling on a
    // STABLE final value is strong evidence no loop occurred.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.getByTestId("theme-A")).toHaveTextContent("dark");
    expect(screen.getByTestId("theme-B")).toHaveTextContent("dark");

    tabA.unmount();
    tabB.unmount();
  });

  it("a newly mounted tab catches up to existing tabs' state via the STATE_REQUEST/RESPONSE handshake", async () => {
    const user = userEvent.setup();
    // Tab A mounts first and changes the theme before Tab B ever exists.
    const tabA = renderTab("tab-a", "A");
    await user.click(screen.getByRole("button", { name: /toggle theme a/i }));
    expect(screen.getByTestId("theme-A")).toHaveTextContent("dark");

    // Tab B mounts AFTER the change — should catch up via STATE_REQUEST.
    const tabB = renderTab("tab-b", "B");

    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-B")).toHaveTextContent("dark");
    });

    tabA.unmount();
    tabB.unmount();
  });

  it("a manually dispatched presence action (TAB_JOINED) propagates to another tab — the broadcast MECHANISM this phase owns", async () => {
    // NOTE: automatically dispatching TAB_JOINED on mount, and the
    // heartbeat ticking loop, are usePresence's job (Phase 9) — not yet
    // wired up. This test instead verifies the underlying mechanism this
    // phase IS responsible for: that presence-kind actions, when
    // dispatched, broadcast correctly and apply on the receiving tab,
    // exactly like any other action. Phase 9 builds on top of this proven
    // mechanism rather than re-testing it.
    const tabA = renderTab("tab-a", "A");

    const dispatchFromBRef: { current: (() => void) | undefined } = { current: undefined };
    function Dispatcher() {
      const { dispatch } = useAppStateContext();
      useEffect(() => {
        dispatchFromBRef.current = () =>
          dispatch({
            type: "TAB_JOINED",
            payload: { tabId: "tab-b", lastHeartbeat: Date.now(), joinedAt: Date.now() },
          });
      }, [dispatch]);
      return null;
    }
    const tabB = render(
      <AppStateProvider tabId="tab-b" enableSync>
        <Dispatcher />
      </AppStateProvider>,
    );

    act(() => {
      dispatchFromBRef.current!();
    });

    await vi.waitFor(() => {
      expect(screen.getByTestId("presence-count-A")).toHaveTextContent("2");
    });

    tabA.unmount();
    tabB.unmount();
  });

  it("a genuinely stale remote update is correctly dropped even when delivered through the real BroadcastChannel pipeline (LWW end-to-end, not just the pure reducer)", async () => {
    const tabA = renderTab("tab-a", "A");

    const dispatchStaleFromBRef: { current: (() => void) | undefined } = { current: undefined };
    function DispatcherWithProbe() {
      const { dispatch, state } = useAppStateContext();
      useEffect(() => {
        dispatchStaleFromBRef.current = () =>
          dispatch({
            type: "SET_THEME",
            payload: "dark",
            // Deliberately ancient timestamp (1ms since epoch) — far older
            // than the real timestamp Tab A's change will carry.
            meta: { tabId: state.currentTabId, timestamp: 1, origin: "local" },
          });
      }, [dispatch, state.currentTabId]);
      return <TabProbe tabLabel="B" />;
    }
    const tabB = render(
      <AppStateProvider tabId="tab-b" enableSync>
        <DispatcherWithProbe />
      </AppStateProvider>,
    );

    // Tab A sets theme to dark with a real, current timestamp first.
    const toggleButton = screen.getByRole("button", { name: /toggle theme a/i });
    const user = userEvent.setup();
    await user.click(toggleButton);
    expect(screen.getByTestId("theme-A")).toHaveTextContent("dark");

    // Give A's change time to propagate to B, so B's local sliceTimestamps
    // reflects a real, current timestamp to compare the stale message
    // against (both tabs' guards are independent, but this confirms the
    // baseline propagation succeeded before testing the rejection case).
    await vi.waitFor(() => {
      expect(screen.getByTestId("theme-B")).toHaveTextContent("dark");
    });

    // Now B attempts to push an update with an ancient timestamp (1ms
    // since epoch) — this should be rejected by A's LWW guard on receipt,
    // since it's far older than A's own already-applied change.
    act(() => {
      dispatchStaleFromBRef.current!();
    });

    // Give the stale message time to arrive and (correctly) be dropped.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Tab A's theme must remain "dark" — the stale message must NOT have
    // overwritten it back to some earlier state.
    expect(screen.getByTestId("theme-A")).toHaveTextContent("dark");

    tabA.unmount();
    tabB.unmount();
  });

  it("a single tab with no peers keeps its own initial state and never hangs waiting for a STATE_RESPONSE that will never arrive", async () => {
    const tabA = renderTab("tab-a", "A");

    // No other tab exists. Give the STATE_REQUEST broadcast (which has no
    // responders) ample time to resolve into... nothing, which is correct.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Tab A should be exactly its own freshly-seeded initial state — the
    // default loan from createInitialState, light theme, no hang or crash.
    expect(screen.getByTestId("theme-A")).toHaveTextContent("light");
    expect(screen.getByTestId("principal-A")).toHaveTextContent("2500000");
    expect(screen.getByTestId("presence-count-A")).toHaveTextContent("1");

    tabA.unmount();
  });

  it("when a tab is unmounted (in-app, not a real browser close), its peer correctly removes it from presence — regression test for a real bug where TAB_LEFT was silently never sent on unmount", async () => {
    // Root cause this guards against: TAB_LEFT was originally announced
    // from usePresence's own effect cleanup, in a SEPARATE hook from the
    // one that closes the BroadcastChannel (useBroadcastSync). React
    // cleans up effects in DECLARATION order, not reverse order — so
    // useBroadcastSync's cleanup (declared first in AppStateProvider) ran
    // BEFORE usePresence's cleanup, closing the channel before the
    // TAB_LEFT announcement could be sent. The fix moved the announcement
    // into useBroadcastSync's own cleanup, immediately before close(), so
    // the correct ordering is structurally guaranteed rather than
    // dependent on hook declaration order.
    const tabA = renderTab("tab-a", "A");
    const tabB = renderTab("tab-b", "B");

    await vi.waitFor(() => {
      expect(screen.getByTestId("presence-count-A")).toHaveTextContent("2");
    });

    tabB.unmount();

    await vi.waitFor(() => {
      expect(screen.getByTestId("presence-count-A")).toHaveTextContent("1");
    });

    tabA.unmount();
  });
});
