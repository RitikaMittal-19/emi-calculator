"use client";

import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { BroadcastChannelTransport } from "@/lib/sync/BroadcastChannelTransport";
import type { SyncEngine, SyncWireMessage } from "@/lib/sync/SyncEngine";
import { actionCreators, type AppAction } from "@/lib/state/actions";
import type { AppState } from "@/types/state";

interface UseBroadcastSyncOptions {
  tabId: string;
  state: AppState;
  rawDispatch: Dispatch<AppAction>;
}

/**
 * Wires the reducer's dispatch to BroadcastChannel-based cross-tab sync.
 *
 * THE LOOP-PREVENTION RULE, made concrete: this hook exposes a single
 * `dispatch` function for the rest of the app to use (in place of the raw
 * reducer dispatch). That function does two things for every action:
 *   1. Always applies it locally via rawDispatch — every action, no matter
 *      its origin, must still update this tab's own state.
 *   2. Broadcasts it ONLY if it's a locally-originated action — i.e. NOT
 *      a message that arrived via the BroadcastChannel `subscribe`
 *      handler. Messages received from `subscribe` are applied through a
 *      SEPARATE internal path (handleRemoteAction) that calls rawDispatch
 *      directly and never touches the broadcasting dispatch — so a
 *      received action can never be re-sent, which is what would create
 *      an infinite cross-tab ping-pong loop.
 *
 * Presence actions (TAB_JOINED/TAB_HEARTBEAT/TAB_LEFT) have no `meta`
 * field (see lib/state/actions.ts) since they're not LWW-guarded, but
 * still need to reach other tabs — they're broadcast unconditionally
 * whenever dispatched through the public `dispatch` function, since by
 * construction every LOCAL caller of `dispatch` for a presence action
 * represents a genuine local event (this tab mounting, this tab's own
 * heartbeat tick, this tab unloading), never a remote echo.
 */
export function useBroadcastSync({ tabId, state, rawDispatch }: UseBroadcastSyncOptions) {
  const engineRef = useRef<SyncEngine | null>(null);
  // Keep a ref to the latest state so the STATE_REQUEST responder (set up
  // once on mount) always reads current state rather than a stale closure
  // over the state value from the render that registered the listener.
  // Updated in its own effect (not inline during render) per React's
  // rule against mutating refs in the render body.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const engine = new BroadcastChannelTransport();
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((message: SyncWireMessage) => {
      switch (message.kind) {
        case "ACTION": {
          handleRemoteAction(rawDispatch, message.action);
          break;
        }
        case "STATE_REQUEST": {
          // A new tab just mounted and is asking for the current state.
          // Don't respond to our own request (BroadcastChannel never
          // delivers to the sender anyway, but the explicit tabId check
          // makes the intent legible and is harmless defense in depth).
          if (message.requestingTabId === tabId) break;
          engine.send({
            kind: "STATE_RESPONSE",
            respondingTabId: tabId,
            state: stateRef.current,
          });
          break;
        }
        case "STATE_RESPONSE": {
          // Every open tab broadcasts STATE_RESPONSE to everyone (it's a
          // broadcast medium, there's no targeted unicast), so every
          // already-established tab also receives this. Applying it is
          // still safe even on an established tab: HYDRATE_STATE is just
          // "this is valid current state from a peer," which on an
          // already-synced tab is a same-content no-op in practice and at
          // worst a same-content overwrite — acceptable given the LWW
          // philosophy already in place everywhere else.
          rawDispatch(
            actionCreators.hydrateState(tabId, {
              theme: message.state.theme,
              activeMode: message.state.activeMode,
              primaryLoan: message.state.primaryLoan,
              comparisonScenarios: message.state.comparisonScenarios,
              activeComparisonId: message.state.activeComparisonId,
              prepayments: message.state.prepayments,
            }),
          );
          break;
        }
      }
    });

    // Announce ourselves and ask any already-open tabs to catch us up.
    engine.send({ kind: "STATE_REQUEST", requestingTabId: tabId });

    return () => {
      // Announce departure BEFORE closing the channel — this must happen
      // here, not in a separate effect (e.g. usePresence), because React
      // runs effect cleanups in DECLARATION order, not reverse order: if
      // TAB_LEFT were dispatched from a different hook's cleanup, the
      // relative order between "send TAB_LEFT" and "close this channel"
      // would depend on which hook was called first in the component body
      // — a fragile, easy-to-invert dependency. Owning both the
      // announcement and the close() in the same cleanup, in the same
      // function, makes the correct ordering structurally guaranteed
      // rather than coincidental.
      engine.send({ kind: "ACTION", action: actionCreators.tabLeft(tabId) });
      unsubscribe();
      engine.close();
      engineRef.current = null;
    };
    // Intentionally minimal dep array: this effect sets up the channel
    // exactly once per tab's lifetime. tabId is stable per useTabId's
    // contract; rawDispatch is stable per React's useReducer guarantee.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  /**
   * The public dispatch function the rest of the app should use in place
   * of the raw reducer dispatch. See the loop-prevention doc comment above
   * the hook for the full rationale.
   */
  function dispatch(action: AppAction): void {
    rawDispatch(action);

    const isPresenceAction =
      action.type === "TAB_JOINED" ||
      action.type === "TAB_HEARTBEAT" ||
      action.type === "TAB_LEFT";
    const isPrunePresence = action.type === "PRUNE_PRESENCE";

    if (isPrunePresence) {
      // Purely local timer-driven cleanup — every tab prunes its own
      // presence list independently using its own clock. Never broadcast.
      return;
    }

    if (isPresenceAction) {
      engineRef.current?.send({ kind: "ACTION", action });
      return;
    }

    // Every remaining action type carries `meta.origin`. Only broadcast
    // genuinely local-origin actions — this is the other half of loop
    // prevention: an action dispatched here with origin "remote" (which
    // only handleRemoteAction below produces) must never reach this
    // function in the first place, since handleRemoteAction calls
    // rawDispatch directly, bypassing this wrapper entirely.
    if ("meta" in action && action.meta.origin === "local") {
      engineRef.current?.send({ kind: "ACTION", action });
    }
  }

  return { dispatch };
}

/**
 * Applies an action received from another tab. Re-stamps origin to
 * "remote" unconditionally, regardless of what the sending tab labeled it
 * — the origin field describes the RECEIVING tab's relationship to the
 * action, not a fact being transmitted, so it must always be "remote" on
 * this side of the wire. This is what makes loop prevention correct even
 * if a transport bug ever caused a sender to mislabel its own message.
 *
 * Calls rawDispatch directly, deliberately bypassing the broadcasting
 * `dispatch` function above — this is the other half of the loop-
 * prevention guarantee.
 */
function handleRemoteAction(rawDispatch: Dispatch<AppAction>, action: AppAction): void {
  if ("meta" in action) {
    rawDispatch({ ...action, meta: { ...action.meta, origin: "remote" } } as AppAction);
  } else {
    // Presence actions have no meta/origin field — they're idempotent and
    // safe to apply as-is (see reducer.ts: TAB_JOINED dedupes by tabId,
    // TAB_HEARTBEAT updates-or-inserts, TAB_LEFT is a simple filter).
    rawDispatch(action);
  }
}
