"use client";

import { useEffect, type ReactNode } from "react";
import { AppStateProvider, useAppStateContext } from "@/lib/state/context";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { useTabId } from "@/hooks/useTabId";
import { parseShareableState } from "@/lib/utils/urlState";

/**
 * Applies the synced `theme` slice to <html class="dark">, so Tailwind's
 * class-based dark variant (see globals.css) picks it up globally. Lives
 * inside AppStateProvider (needs useAppStateContext), so it's split into
 * its own small component rather than inlined in AppProviders.
 *
 * KNOWN TRADEOFF: since state always starts at the default ("light") on a
 * fresh tab — there's no persistence yet, see architecture §2 — and this
 * effect runs after first paint, a tab whose synced peers are in dark mode
 * will briefly flash light before catching up. This is acceptable for the
 * MVP (in-memory-only state, per spec) and will naturally improve once V2
 * localStorage persistence allows reading the last-known theme
 * synchronously before paint.
 */
export function ThemeClassSync() {
  const { state } = useAppStateContext();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  return null;
}

/**
 * On mount, checks the URL's query params for a shared loan (see
 * lib/utils/urlState.ts) and, if present and valid, applies it as the
 * primary loan + prepayments.
 *
 * Dispatches through the normal useCalculatorState actions — the SAME
 * path a user dragging a slider would go through — rather than a
 * special-cased hydration mechanism. Two deliberate consequences of that
 * choice:
 *   1. It correctly broadcasts to other open tabs via the existing sync
 *      pipeline (Phase 8), consistent with "shared workspace": opening a
 *      shared link is itself a genuine local change worth propagating,
 *      not a special one-tab-only event.
 *   2. It naturally runs AFTER this tab's own cross-tab STATE_REQUEST
 *      catch-up has had a chance to apply (both fire on mount, but this
 *      effect is declared later in the component tree — see
 *      AppProviders), so an explicitly-opened shared link correctly takes
 *      priority over ambient state from already-open peer tabs, which is
 *      the behavior someone clicking a shared link would actually expect.
 *
 * Runs exactly once per mount (empty dep array is intentional: the URL is
 * only consulted at load time, not re-parsed on every navigation/render).
 *
 * KNOWN TRADEOFF, same shape as ThemeClassSync's: since this runs in a
 * client-side effect (after hydration, not during SSR), a shared link's
 * SERVER-RENDERED initial paint briefly shows the default loan before
 * this effect applies the URL's actual loan. The reducer's initial state
 * is seeded identically on server and client (createInitialState doesn't
 * read the URL), so there's no hydration mismatch — just a brief flash of
 * the default values before the shared ones take over. Acceptable for the
 * MVP; a future improvement could read searchParams server-side and pass
 * the parsed loan into createInitialState directly, eliminating the flash
 * entirely, at the cost of plumbing the URL through the server component
 * boundary.
 */
export function UrlStateSync() {
  const { setLoanInput, setPrepayments } = useCalculatorState();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = parseShareableState(params);
    if (shared === null) return;

    setLoanInput(shared.loan);
    if (shared.prepayments.length > 0) {
      setPrepayments(shared.prepayments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Single mount point for all client-side providers. Kept separate from
 * app/layout.tsx (a server component) since useTabId and AppStateProvider
 * both require client-side APIs (crypto.randomUUID, useReducer).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const tabId = useTabId();

  return (
    <AppStateProvider tabId={tabId}>
      <ThemeClassSync />
      <UrlStateSync />
      {children}
    </AppStateProvider>
  );
}
