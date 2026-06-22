import type { LoanInput } from "@/types/loan";
import type { Prepayment } from "@/types/prepayment";

/**
 * Query param keys, kept deliberately short — these end up in a URL a
 * person might paste into a chat app or email, so a compact query string
 * matters more here than verbose self-documenting names.
 *   p  = principal
 *   r  = annualRate
 *   t  = tenureMonths
 *   pp = prepayments, encoded as "month:amount" pairs joined by "," —
 *        e.g. "12:50000,24:30000" for two prepayments.
 */
const PARAM_KEYS = {
  principal: "p",
  rate: "r",
  tenure: "t",
  prepayments: "pp",
} as const;

export interface ShareableState {
  loan: Pick<LoanInput, "principal" | "annualRate" | "tenureMonths">;
  prepayments: Prepayment[];
}

/**
 * Encodes the primary loan and its prepayments into a URLSearchParams
 * instance. Deliberately excludes theme, activeMode, and comparison
 * scenarios — a shared link is about "here's a loan to look at," not a
 * full snapshot of someone else's UI state (their dark-mode preference or
 * which tab they happened to be on isn't useful to the recipient, and
 * including it would only bloat the URL).
 */
export function encodeShareableState(
  loan: Pick<LoanInput, "principal" | "annualRate" | "tenureMonths">,
  prepayments: Prepayment[],
): URLSearchParams {
  const params = new URLSearchParams();
  params.set(PARAM_KEYS.principal, String(loan.principal));
  params.set(PARAM_KEYS.rate, String(loan.annualRate));
  params.set(PARAM_KEYS.tenure, String(loan.tenureMonths));

  if (prepayments.length > 0) {
    const encoded = prepayments.map((p) => `${p.month}:${p.amount}`).join(",");
    params.set(PARAM_KEYS.prepayments, encoded);
  }

  return params;
}

/**
 * Builds a full shareable URL for the given loan/prepayments, rooted at
 * the provided origin (so this stays pure and testable — callers pass
 * window.location.origin + pathname rather than this function reaching
 * into globals itself).
 */
export function buildShareableUrl(
  baseUrl: string,
  loan: Pick<LoanInput, "principal" | "annualRate" | "tenureMonths">,
  prepayments: Prepayment[],
): string {
  const params = encodeShareableState(loan, prepayments);
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parses loan + prepayment state back out of a URLSearchParams instance.
 * Returns null if the essential loan params (principal/rate/tenure) are
 * missing or non-numeric — a partial/garbled URL should be treated as "no
 * shared state" rather than silently hydrating with NaN or zero values
 * that would then fail calculateEmi's own validation downstream.
 *
 * Malformed individual prepayment entries (wrong format, non-numeric)
 * are skipped individually rather than invalidating the whole parse —
 * one bad entry in a hand-edited URL shouldn't discard an otherwise-valid
 * loan and the rest of the prepayments.
 */
export function parseShareableState(params: URLSearchParams): ShareableState | null {
  const principalRaw = params.get(PARAM_KEYS.principal);
  const rateRaw = params.get(PARAM_KEYS.rate);
  const tenureRaw = params.get(PARAM_KEYS.tenure);

  if (principalRaw === null || rateRaw === null || tenureRaw === null) {
    return null;
  }

  const principal = Number(principalRaw);
  const annualRate = Number(rateRaw);
  const tenureMonths = Number(tenureRaw);

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRate) ||
    !Number.isFinite(tenureMonths) ||
    principal <= 0 ||
    annualRate < 0 ||
    tenureMonths <= 0
  ) {
    return null;
  }

  const prepayments: Prepayment[] = [];
  const prepaymentsRaw = params.get(PARAM_KEYS.prepayments);
  if (prepaymentsRaw) {
    const entries = prepaymentsRaw.split(",");
    for (const [index, entry] of entries.entries()) {
      const [monthStr, amountStr] = entry.split(":");
      const month = Number(monthStr);
      const amount = Number(amountStr);
      if (
        Number.isFinite(month) &&
        Number.isFinite(amount) &&
        month > 0 &&
        amount > 0
      ) {
        prepayments.push({ id: `url-${index}`, month, amount });
      }
      // else: silently skip this one malformed entry, per the doc comment above.
    }
  }

  return {
    loan: { principal, annualRate, tenureMonths },
    prepayments,
  };
}
