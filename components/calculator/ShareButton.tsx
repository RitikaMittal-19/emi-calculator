"use client";

import { useState } from "react";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { buildShareableUrl } from "@/lib/utils/urlState";

/**
 * Copies a shareable link (current loan terms + prepayments encoded as
 * query params — see lib/utils/urlState.ts) to the clipboard. Shows a
 * brief "Copied" confirmation rather than a toast/dialog, since this is a
 * low-stakes action that doesn't need to interrupt the person.
 */
export function ShareButton() {
  const { state } = useCalculatorState();
  const { primaryLoan, prepayments } = state;
  const [justCopied, setJustCopied] = useState(false);

  async function handleShare() {
    const url = buildShareableUrl(
      `${window.location.origin}${window.location.pathname}`,
      primaryLoan,
      prepayments,
    );

    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context, older
      // browsers without navigator.clipboard) — fall back to a prompt so
      // the person can still copy the link manually rather than the
      // action silently doing nothing.
      window.prompt("Copy this link to share your loan:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-sm border border-rule px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-gold"
    >
      {justCopied ? "Copied!" : "Share"}
    </button>
  );
}
