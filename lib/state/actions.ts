import type { LoanInput } from "@/types/loan";
import type { Prepayment } from "@/types/prepayment";
import type { AppMode, ThemeMode } from "@/types/state";
import type { ActionOrigin, StateSlice, TabPresence } from "@/types/sync";

/**
 * Every action that touches a synced slice carries `meta`, which doubles as
 * the wire format for BroadcastChannel messages (see lib/sync, added in a
 * later phase). Actions that are purely local (presence) don't need `meta`
 * since they're never broadcast as LWW-guarded slice updates.
 */
interface SyncedActionMeta {
  tabId: string;
  timestamp: number;
  origin: ActionOrigin;
}

// ---------------------------------------------------------------------------
// loanInput slice
// ---------------------------------------------------------------------------

interface SetLoanInputAction {
  type: "SET_LOAN_INPUT";
  payload: Partial<Pick<LoanInput, "principal" | "annualRate" | "tenureMonths">>;
  meta: SyncedActionMeta;
}

// ---------------------------------------------------------------------------
// theme slice
// ---------------------------------------------------------------------------

interface SetThemeAction {
  type: "SET_THEME";
  payload: ThemeMode;
  meta: SyncedActionMeta;
}

// ---------------------------------------------------------------------------
// activeMode slice
// ---------------------------------------------------------------------------

interface SetActiveModeAction {
  type: "SET_ACTIVE_MODE";
  payload: AppMode;
  meta: SyncedActionMeta;
}

// ---------------------------------------------------------------------------
// prepayments slice
// ---------------------------------------------------------------------------

interface AddPrepaymentAction {
  type: "ADD_PREPAYMENT";
  payload: Prepayment;
  meta: SyncedActionMeta;
}

interface RemovePrepaymentAction {
  type: "REMOVE_PREPAYMENT";
  payload: { id: string };
  meta: SyncedActionMeta;
}

interface SetPrepaymentsAction {
  type: "SET_PREPAYMENTS";
  payload: Prepayment[];
  meta: SyncedActionMeta;
}

// ---------------------------------------------------------------------------
// comparison slice (comparisonScenarios + activeComparisonId together,
// since they change in lockstep and both belong to the same logical
// "comparison" sync slice)
// ---------------------------------------------------------------------------

interface AddComparisonScenarioAction {
  type: "ADD_COMPARISON_SCENARIO";
  payload: LoanInput;
  meta: SyncedActionMeta;
}

interface RemoveComparisonScenarioAction {
  type: "REMOVE_COMPARISON_SCENARIO";
  payload: { id: string };
  meta: SyncedActionMeta;
}

interface UpdateComparisonScenarioAction {
  type: "UPDATE_COMPARISON_SCENARIO";
  payload: { id: string; updates: Partial<Omit<LoanInput, "id">> };
  meta: SyncedActionMeta;
}

interface SetActiveComparisonIdAction {
  type: "SET_ACTIVE_COMPARISON_ID";
  payload: { id: string | null };
  meta: SyncedActionMeta;
}

// ---------------------------------------------------------------------------
// presence (local-only, never LWW-guarded — see types/sync.ts)
// ---------------------------------------------------------------------------

interface TabJoinedAction {
  type: "TAB_JOINED";
  payload: TabPresence;
}

interface TabHeartbeatAction {
  type: "TAB_HEARTBEAT";
  payload: { tabId: string; timestamp: number };
}

interface TabLeftAction {
  type: "TAB_LEFT";
  payload: { tabId: string };
}

interface PrunePresenceAction {
  type: "PRUNE_PRESENCE";
  /** Current time to prune against, passed explicitly for testability rather than calling Date.now() inside the reducer. */
  payload: { now: number };
}

// ---------------------------------------------------------------------------
// bulk hydration (used when a tab receives full state from a sync peer,
// e.g. on mount — added in a later phase, declared now so the union is
// complete and reducer.ts doesn't need a breaking change later)
// ---------------------------------------------------------------------------

interface HydrateStateAction {
  type: "HYDRATE_STATE";
  payload: {
    theme?: ThemeMode;
    activeMode?: AppMode;
    primaryLoan?: LoanInput;
    comparisonScenarios?: LoanInput[];
    activeComparisonId?: string | null;
    prepayments?: Prepayment[];
  };
  meta: SyncedActionMeta;
}

export type AppAction =
  | SetLoanInputAction
  | SetThemeAction
  | SetActiveModeAction
  | AddPrepaymentAction
  | RemovePrepaymentAction
  | SetPrepaymentsAction
  | AddComparisonScenarioAction
  | RemoveComparisonScenarioAction
  | UpdateComparisonScenarioAction
  | SetActiveComparisonIdAction
  | TabJoinedAction
  | TabHeartbeatAction
  | TabLeftAction
  | PrunePresenceAction
  | HydrateStateAction;

/** Actions that touch a synced slice and must be checked against sliceTimestamps (everything except local-only presence actions). */
export type SyncedAppAction = Exclude<
  AppAction,
  TabJoinedAction | TabHeartbeatAction | TabLeftAction | PrunePresenceAction
>;

/**
 * Actions that touch exactly one synced slice and go through the standard
 * single-slice LWW guard in reducer.ts. HYDRATE_STATE is deliberately
 * excluded — it's a multi-slice bulk action (used when a new tab catches
 * up from an existing peer) and is handled as a special case in the
 * reducer that updates every affected slice's timestamp individually.
 */
export type SingleSliceAction = Exclude<SyncedAppAction, HydrateStateAction>;

/** Maps each single-slice synced action type to the StateSlice it belongs to, for the LWW guard in reducer.ts. */
export const ACTION_SLICE_MAP: Record<SingleSliceAction["type"], StateSlice> = {
  SET_LOAN_INPUT: "loanInput",
  SET_THEME: "theme",
  SET_ACTIVE_MODE: "activeMode",
  ADD_PREPAYMENT: "prepayments",
  REMOVE_PREPAYMENT: "prepayments",
  SET_PREPAYMENTS: "prepayments",
  ADD_COMPARISON_SCENARIO: "comparison",
  REMOVE_COMPARISON_SCENARIO: "comparison",
  UPDATE_COMPARISON_SCENARIO: "comparison",
  SET_ACTIVE_COMPARISON_ID: "comparison",
};

// =============================================================================
// Action creators
//
// Every synced action's `meta` (tabId, timestamp, origin) is stamped here
// rather than left to call sites, so it's impossible to accidentally
// construct a synced action with a missing/stale timestamp. `origin`
// defaults to "local" since the overwhelming majority of dispatches
// originate from user interaction in this tab; the sync layer (added in a
// later phase) is responsible for re-stamping origin: "remote" when
// re-dispatching an action received over BroadcastChannel.
// =============================================================================

function makeMeta(tabId: string, origin: ActionOrigin = "local"): SyncedActionMeta {
  return { tabId, timestamp: Date.now(), origin };
}

export const actionCreators = {
  setLoanInput(
    tabId: string,
    payload: SetLoanInputAction["payload"],
    origin: ActionOrigin = "local",
  ): SetLoanInputAction {
    return { type: "SET_LOAN_INPUT", payload, meta: makeMeta(tabId, origin) };
  },

  setTheme(
    tabId: string,
    payload: ThemeMode,
    origin: ActionOrigin = "local",
  ): SetThemeAction {
    return { type: "SET_THEME", payload, meta: makeMeta(tabId, origin) };
  },

  setActiveMode(
    tabId: string,
    payload: AppMode,
    origin: ActionOrigin = "local",
  ): SetActiveModeAction {
    return { type: "SET_ACTIVE_MODE", payload, meta: makeMeta(tabId, origin) };
  },

  addPrepayment(
    tabId: string,
    payload: Prepayment,
    origin: ActionOrigin = "local",
  ): AddPrepaymentAction {
    return { type: "ADD_PREPAYMENT", payload, meta: makeMeta(tabId, origin) };
  },

  removePrepayment(
    tabId: string,
    id: string,
    origin: ActionOrigin = "local",
  ): RemovePrepaymentAction {
    return {
      type: "REMOVE_PREPAYMENT",
      payload: { id },
      meta: makeMeta(tabId, origin),
    };
  },

  setPrepayments(
    tabId: string,
    payload: Prepayment[],
    origin: ActionOrigin = "local",
  ): SetPrepaymentsAction {
    return { type: "SET_PREPAYMENTS", payload, meta: makeMeta(tabId, origin) };
  },

  addComparisonScenario(
    tabId: string,
    payload: LoanInput,
    origin: ActionOrigin = "local",
  ): AddComparisonScenarioAction {
    return {
      type: "ADD_COMPARISON_SCENARIO",
      payload,
      meta: makeMeta(tabId, origin),
    };
  },

  removeComparisonScenario(
    tabId: string,
    id: string,
    origin: ActionOrigin = "local",
  ): RemoveComparisonScenarioAction {
    return {
      type: "REMOVE_COMPARISON_SCENARIO",
      payload: { id },
      meta: makeMeta(tabId, origin),
    };
  },

  updateComparisonScenario(
    tabId: string,
    id: string,
    updates: UpdateComparisonScenarioAction["payload"]["updates"],
    origin: ActionOrigin = "local",
  ): UpdateComparisonScenarioAction {
    return {
      type: "UPDATE_COMPARISON_SCENARIO",
      payload: { id, updates },
      meta: makeMeta(tabId, origin),
    };
  },

  setActiveComparisonId(
    tabId: string,
    id: string | null,
    origin: ActionOrigin = "local",
  ): SetActiveComparisonIdAction {
    return {
      type: "SET_ACTIVE_COMPARISON_ID",
      payload: { id },
      meta: makeMeta(tabId, origin),
    };
  },

  hydrateState(
    tabId: string,
    payload: HydrateStateAction["payload"],
    origin: ActionOrigin = "remote",
  ): HydrateStateAction {
    return { type: "HYDRATE_STATE", payload, meta: makeMeta(tabId, origin) };
  },

  tabJoined(payload: TabPresence): TabJoinedAction {
    return { type: "TAB_JOINED", payload };
  },

  tabHeartbeat(tabId: string, timestamp: number = Date.now()): TabHeartbeatAction {
    return { type: "TAB_HEARTBEAT", payload: { tabId, timestamp } };
  },

  tabLeft(tabId: string): TabLeftAction {
    return { type: "TAB_LEFT", payload: { tabId } };
  },

  prunePresence(now: number = Date.now()): PrunePresenceAction {
    return { type: "PRUNE_PRESENCE", payload: { now } };
  },
};
