import type { AppAction } from "@/lib/state/actions";
import type { AppState } from "@/types/state";

/**
 * Wire messages that flow over the sync channel. Two kinds:
 *   1. ACTION — a reducer action to be re-dispatched on the receiving tab
 *      (with origin re-stamped to "remote" — see BroadcastChannelTransport).
 *      Covers both LWW-guarded synced actions AND presence actions
 *      (TAB_JOINED/TAB_HEARTBEAT/TAB_LEFT), which have no `meta` but still
 *      need to reach other tabs.
 *   2. STATE_REQUEST / STATE_RESPONSE — the catch-up handshake. A newly
 *      mounted tab broadcasts STATE_REQUEST; every other open tab responds
 *      with STATE_RESPONSE containing its current full state, which the
 *      requesting tab applies via a HYDRATE_STATE action. If multiple tabs
 *      respond, the requesting tab's own LWW guard (well, HYDRATE_STATE's
 *      unconditional-apply semantics — see reducer.ts) means the LAST
 *      response received wins; this is an accepted simplification for the
 *      MVP rather than picking "the most authoritative" response, since
 *      with last-write-wins as the chosen conflict model throughout, the
 *      most-recently-arrived state is consistent with that same philosophy.
 */
export type SyncWireMessage =
  | { kind: "ACTION"; action: AppAction }
  | { kind: "STATE_REQUEST"; requestingTabId: string }
  | { kind: "STATE_RESPONSE"; respondingTabId: string; state: AppState };

/**
 * Transport-agnostic sync contract. BroadcastChannelTransport is the only
 * implementation today, but this interface is what lets a future leader-
 * election layer (or any other transport) be swapped in without touching
 * useBroadcastSync or any component — see architecture §5.1.
 */
export interface SyncEngine {
  send(message: SyncWireMessage): void;
  subscribe(handler: (message: SyncWireMessage) => void): () => void;
  close(): void;
}
