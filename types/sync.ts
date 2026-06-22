/**
 * Types for cross-tab synchronization (BroadcastChannel-based) and tab
 * presence tracking. See architecture doc §5 for the full design.
 */

/**
 * The logical slices of AppState that are independently LWW-guarded.
 * Using per-slice timestamps (rather than one global timestamp) avoids the
 * classic naive-LWW failure mode where an edit to one slice in Tab A can
 * silently clobber an unrelated edit to a different slice in Tab B if they
 * happen within the same broadcast cycle.
 *
 * Deliberately excludes "presence" — tab presence is not a last-write-wins
 * value, it's a union of independently-reported heartbeats, and is handled
 * by separate reducer logic (see lib/sync/presence.ts in a later phase).
 */
export type StateSlice =
  | "loanInput"
  | "theme"
  | "prepayments"
  | "comparison"
  | "activeMode";

/** Where an action originated: typed by the user in this tab, or received via BroadcastChannel. */
export type ActionOrigin = "local" | "remote";

/**
 * Metadata attached to every sync-relevant reducer action. This is also
 * the wire format broadcast over BroadcastChannel — see lib/sync/SyncEngine
 * (added in a later phase) for the transport layer that serializes this.
 */
export interface SyncMeta {
  tabId: string;
  timestamp: number;
  slice: StateSlice;
  origin: ActionOrigin;
}

/** A single tab's presence record, tracked via periodic heartbeats. */
export interface TabPresence {
  tabId: string;
  lastHeartbeat: number;
  joinedAt: number;
}
