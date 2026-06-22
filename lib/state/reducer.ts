import type { AppState } from "@/types/state";
import type { StateSlice } from "@/types/sync";
import { ACTION_SLICE_MAP, type AppAction, type SingleSliceAction } from "./actions";

/** Comparison Mode supports at most 3 scenarios, enforced here (not just in the UI) per architecture §11. */
export const MAX_COMPARISON_SCENARIOS = 3;

/**
 * The core LWW guard: for any action that targets a single synced slice,
 * a REMOTE action is only applied if its timestamp is >= the slice's last
 * recorded timestamp. LOCAL actions always pass — a user's own input in
 * this tab should never be rejected by a staleness check against itself,
 * since by definition the local tab always has the freshest view of its
 * own just-typed value.
 *
 * Returns true if the action should be applied, false if it should be
 * silently dropped as stale.
 */
function shouldApplySliceUpdate(state: AppState, action: SingleSliceAction): boolean {
  if (action.meta.origin === "local") {
    return true;
  }
  const slice = ACTION_SLICE_MAP[action.type];
  return action.meta.timestamp >= state.sliceTimestamps[slice];
}

/** Returns a new sliceTimestamps map with one slice bumped to the action's timestamp. */
function bumpSliceTimestamp(
  state: AppState,
  slice: StateSlice,
  timestamp: number,
): AppState["sliceTimestamps"] {
  return { ...state.sliceTimestamps, [slice]: timestamp };
}

export function calculatorReducer(state: AppState, action: AppAction): AppState {
  // -------------------------------------------------------------------------
  // Synced, single-slice actions: route through the shared LWW guard first.
  // -------------------------------------------------------------------------
  if (action.type !== "HYDRATE_STATE" && "meta" in action) {
    const singleSliceAction = action as SingleSliceAction;
    if (!shouldApplySliceUpdate(state, singleSliceAction)) {
      return state; // stale remote action — drop silently
    }
  }

  switch (action.type) {
    case "SET_LOAN_INPUT": {
      return {
        ...state,
        primaryLoan: { ...state.primaryLoan, ...action.payload },
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "loanInput",
          action.meta.timestamp,
        ),
      };
    }

    case "SET_THEME": {
      return {
        ...state,
        theme: action.payload,
        sliceTimestamps: bumpSliceTimestamp(state, "theme", action.meta.timestamp),
      };
    }

    case "SET_ACTIVE_MODE": {
      return {
        ...state,
        activeMode: action.payload,
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "activeMode",
          action.meta.timestamp,
        ),
      };
    }

    case "ADD_PREPAYMENT": {
      return {
        ...state,
        prepayments: [...state.prepayments, action.payload],
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "prepayments",
          action.meta.timestamp,
        ),
      };
    }

    case "REMOVE_PREPAYMENT": {
      return {
        ...state,
        prepayments: state.prepayments.filter((p) => p.id !== action.payload.id),
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "prepayments",
          action.meta.timestamp,
        ),
      };
    }

    case "SET_PREPAYMENTS": {
      return {
        ...state,
        prepayments: action.payload,
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "prepayments",
          action.meta.timestamp,
        ),
      };
    }

    case "ADD_COMPARISON_SCENARIO": {
      // Enforced here, not just in the UI: a remote tab replaying an
      // ADD_COMPARISON_SCENARIO that would exceed the cap is dropped, same
      // as if the user had clicked "add" a 4th time locally.
      if (state.comparisonScenarios.length >= MAX_COMPARISON_SCENARIOS) {
        return state;
      }
      return {
        ...state,
        comparisonScenarios: [...state.comparisonScenarios, action.payload],
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "comparison",
          action.meta.timestamp,
        ),
      };
    }

    case "REMOVE_COMPARISON_SCENARIO": {
      const nextScenarios = state.comparisonScenarios.filter(
        (s) => s.id !== action.payload.id,
      );
      // "Retain last active scenario" (§4 Comparison Mode) means: if the
      // removed scenario WAS the active one, clear activeComparisonId.
      // Otherwise leave it untouched, even across this removal.
      const nextActiveId =
        state.activeComparisonId === action.payload.id
          ? null
          : state.activeComparisonId;
      return {
        ...state,
        comparisonScenarios: nextScenarios,
        activeComparisonId: nextActiveId,
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "comparison",
          action.meta.timestamp,
        ),
      };
    }

    case "UPDATE_COMPARISON_SCENARIO": {
      return {
        ...state,
        comparisonScenarios: state.comparisonScenarios.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s,
        ),
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "comparison",
          action.meta.timestamp,
        ),
      };
    }

    case "SET_ACTIVE_COMPARISON_ID": {
      return {
        ...state,
        activeComparisonId: action.payload.id,
        sliceTimestamps: bumpSliceTimestamp(
          state,
          "comparison",
          action.meta.timestamp,
        ),
      };
    }

    case "HYDRATE_STATE": {
      // Multi-slice bulk update (a new tab catching up from an existing
      // peer's full state). Each field is applied independently, and each
      // affected slice's timestamp is bumped to the hydration message's
      // timestamp — intentionally NOT gated by shouldApplySliceUpdate,
      // since hydration is, by construction, only ever sent in response to
      // a join request and represents the current authoritative state at
      // the moment of joining.
      const next: AppState = { ...state };
      const touchedSlices: StateSlice[] = [];

      if (action.payload.theme !== undefined) {
        next.theme = action.payload.theme;
        touchedSlices.push("theme");
      }
      if (action.payload.activeMode !== undefined) {
        next.activeMode = action.payload.activeMode;
        touchedSlices.push("activeMode");
      }
      if (action.payload.primaryLoan !== undefined) {
        next.primaryLoan = action.payload.primaryLoan;
        touchedSlices.push("loanInput");
      }
      if (action.payload.prepayments !== undefined) {
        next.prepayments = action.payload.prepayments;
        touchedSlices.push("prepayments");
      }
      if (
        action.payload.comparisonScenarios !== undefined ||
        action.payload.activeComparisonId !== undefined
      ) {
        if (action.payload.comparisonScenarios !== undefined) {
          next.comparisonScenarios = action.payload.comparisonScenarios.slice(
            0,
            MAX_COMPARISON_SCENARIOS,
          );
        }
        if (action.payload.activeComparisonId !== undefined) {
          next.activeComparisonId = action.payload.activeComparisonId;
        }
        touchedSlices.push("comparison");
      }

      next.sliceTimestamps = { ...state.sliceTimestamps };
      for (const slice of touchedSlices) {
        next.sliceTimestamps[slice] = action.meta.timestamp;
      }

      return next;
    }

    // -------------------------------------------------------------------
    // Presence actions — local-only, never LWW-guarded (see types/sync.ts).
    // -------------------------------------------------------------------

    case "TAB_JOINED": {
      const alreadyPresent = state.presence.some(
        (p) => p.tabId === action.payload.tabId,
      );
      if (alreadyPresent) {
        return state;
      }
      return { ...state, presence: [...state.presence, action.payload] };
    }

    case "TAB_HEARTBEAT": {
      const known = state.presence.some((p) => p.tabId === action.payload.tabId);
      if (!known) {
        // A heartbeat from a tab we haven't seen TAB_JOINED for yet (e.g.
        // this tab loaded after that one's join message was already
        // broadcast). Treat it as an implicit join rather than dropping it.
        return {
          ...state,
          presence: [
            ...state.presence,
            {
              tabId: action.payload.tabId,
              lastHeartbeat: action.payload.timestamp,
              joinedAt: action.payload.timestamp,
            },
          ],
        };
      }
      return {
        ...state,
        presence: state.presence.map((p) =>
          p.tabId === action.payload.tabId
            ? { ...p, lastHeartbeat: action.payload.timestamp }
            : p,
        ),
      };
    }

    case "TAB_LEFT": {
      return {
        ...state,
        presence: state.presence.filter((p) => p.tabId !== action.payload.tabId),
      };
    }

    case "PRUNE_PRESENCE": {
      // Tab timeout: 6 seconds (architecture §5.3). Never prunes this tab's
      // own entry, even if its heartbeat interval happens to lag — a tab is
      // always alive to itself.
      const TAB_TIMEOUT_MS = 6_000;
      const stillAlive = state.presence.filter(
        (p) =>
          p.tabId === state.currentTabId ||
          action.payload.now - p.lastHeartbeat <= TAB_TIMEOUT_MS,
      );
      if (stillAlive.length === state.presence.length) {
        return state; // nothing pruned, avoid unnecessary re-render
      }
      return { ...state, presence: stillAlive };
    }

    default: {
      // Exhaustiveness check: if a new AppAction variant is added without a
      // corresponding case above, this will fail to compile.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
