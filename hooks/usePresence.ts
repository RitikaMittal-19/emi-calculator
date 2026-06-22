"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import { actionCreators, type AppAction } from "@/lib/state/actions";

const HEARTBEAT_INTERVAL_MS = 2_000;
// Checked more frequently than the 6s timeout itself so a stale tab is
// pruned promptly rather than lingering for up to one full extra interval.
const PRUNE_CHECK_INTERVAL_MS = 1_000;

interface UsePresenceOptions {
  tabId: string;
  dispatch: Dispatch<AppAction>;
  /** Whether to actually run presence tracking. Mirrors AppStateProvider's enableSync — presence is meaningless without cross-tab sync, and tests that disable sync shouldn't also spin up heartbeat timers. */
  enabled: boolean;
}

/**
 * Manages this tab's presence lifecycle:
 *   - On mount: broadcasts TAB_JOINED so other already-open tabs learn
 *     about this one. (This tab's OWN presence entry is already seeded by
 *     createInitialState — see lib/state/initialState.ts — so this
 *     broadcast is purely for the benefit of peers, not self-registration.)
 *   - Every 2s: broadcasts TAB_HEARTBEAT to signal "still alive."
 *   - On real browser tab/window close (beforeunload): broadcasts
 *     TAB_LEFT for prompt, clean removal — the 6s heartbeat-timeout prune
 *     is the FALLBACK for crashes/kills, not the primary mechanism.
 *   - Every 1s, locally: dispatches PRUNE_PRESENCE (never broadcast — see
 *     useBroadcastSync, PRUNE_PRESENCE is explicitly excluded from
 *     broadcasting since every tab prunes independently using its own
 *     clock) to drop any peer whose last heartbeat exceeds the 6s timeout.
 *
 * NOTE: the IN-APP unmount case (e.g. this provider's subtree unmounting,
 * as opposed to a real tab close) is deliberately NOT handled here —
 * useBroadcastSync's own cleanup announces TAB_LEFT right before closing
 * the channel. Both responsibilities had to live together: React cleans
 * up effects in DECLARATION order, not reverse order, so if TAB_LEFT were
 * announced from a separate hook's cleanup, whether it fired before or
 * after the channel closed would depend on which hook happened to be
 * called first in the component body — a fragile coincidence rather than
 * a guarantee. This was an actual bug caught during development: the
 * original version had usePresence announce departure in its own cleanup,
 * which silently never reached other tabs because useBroadcastSync's
 * cleanup (declared earlier in AppStateProvider) closed the channel
 * first.
 *
 * All presence actions go through the same `dispatch` used everywhere
 * else — see useBroadcastSync's loop-prevention doc comment for why
 * presence actions are always broadcast when dispatched locally, never
 * re-broadcast when received remotely.
 */
export function usePresence({ tabId, dispatch, enabled }: UsePresenceOptions) {
  useEffect(() => {
    if (!enabled) return;

    dispatch(
      actionCreators.tabJoined({
        tabId,
        lastHeartbeat: Date.now(),
        joinedAt: Date.now(),
      }),
    );

    const heartbeatId = setInterval(() => {
      dispatch(actionCreators.tabHeartbeat(tabId));
    }, HEARTBEAT_INTERVAL_MS);

    const pruneId = setInterval(() => {
      dispatch(actionCreators.prunePresence(Date.now()));
    }, PRUNE_CHECK_INTERVAL_MS);

    // beforeunload covers the actual browser tab/window close case, which
    // a React unmount effect cleanup does NOT reliably fire for (the JS
    // context can be torn down by the browser before React gets to run
    // cleanup). The IN-APP unmount case (e.g. this provider's subtree
    // unmounting for some other reason) is handled by useBroadcastSync's
    // OWN cleanup instead of here — see the comment there for why: it
    // must own both "announce TAB_LEFT" and "close the channel" together,
    // since React cleans up effects in declaration order (not reverse),
    // making cross-hook cleanup ordering fragile otherwise.
    function announceDeparture() {
      dispatch(actionCreators.tabLeft(tabId));
    }
    window.addEventListener("beforeunload", announceDeparture);

    return () => {
      clearInterval(heartbeatId);
      clearInterval(pruneId);
      window.removeEventListener("beforeunload", announceDeparture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, enabled]);
}
