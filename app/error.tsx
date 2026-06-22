"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router's error boundary convention: automatically wraps
 * page.tsx and catches any render-time error in that subtree (e.g. if a
 * future bug or a malformed cross-tab HYDRATE_STATE payload ever produced
 * an invalid loan value that reached calculateEmi's RangeError throws —
 * see lib/calculations/emi.ts). Without this, such an error would
 * white-screen the entire app; with it, the person sees a recoverable
 * message instead.
 *
 * "reset" re-renders the segment without a full page reload, retrying
 * whatever previously threw — appropriate for transient state-derived
 * errors. The in-memory-only state (no persistence, per architecture §2)
 * means an unrecoverable case still has a fast, safe path: the page
 * reload button below gets back to a clean slate.
 */
export default function ErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surfaced to the console for debugging; in a real production
    // deployment this is also where an error-reporting call would go.
    console.error("EMI Calculator encountered an error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-serif text-xl text-ink">Something went wrong</p>
      <p className="text-sm text-ink-soft">
        The calculator hit an unexpected error. Your other open tabs are unaffected.
      </p>

      {process.env.NODE_ENV === "development" ? (
        <pre className="w-full overflow-x-auto rounded-sm border border-rule bg-paper-raised p-3 text-left text-xs text-signal-red">
          {error.message}
        </pre>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-sm bg-gold-soft px-4 py-1.5 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-sm border border-rule px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-gold"
        >
          Reload page
        </button>
      </div>
    </main>
  );
}
