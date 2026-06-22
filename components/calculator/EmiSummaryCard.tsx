"use client";

import { useMemo } from "react";
import { calculateEmiResult } from "@/lib/calculations/emi";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";

/**
 * The headline EMI figure, presented as a stamped ledger/passbook entry
 * rather than a generic "stat card" — this is the signature element of the
 * Ledger design system (see globals.css design notes). The EMI itself is
 * set in the serif numeral face at a large size with a rule line beneath
 * it, echoing a receipt total line; principal and interest are broken out
 * beneath as a two-column ledger row using the functionally-meaningful
 * gold (principal) / slate (interest) accent colors.
 */
export function EmiSummaryCard() {
  const { state } = useCalculatorState();
  const { primaryLoan } = state;

  const result = useMemo(
    () =>
      calculateEmiResult(
        primaryLoan.principal,
        primaryLoan.annualRate,
        primaryLoan.tenureMonths,
      ),
    [primaryLoan.principal, primaryLoan.annualRate, primaryLoan.tenureMonths],
  );

  return (
    <section
      aria-labelledby="emi-summary-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-paper-raised p-6"
    >
      <h2 id="emi-summary-heading" className="font-serif text-lg text-ink">
        Monthly instalment
      </h2>

      <div>
        <p
          className="font-serif text-4xl tabular-nums tracking-tight text-ink sm:text-5xl"
          aria-live="polite"
        >
          {formatCurrency(result.emi)}
        </p>
        <div className="mt-3 h-px bg-rule-strong" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <span aria-hidden className="h-2 w-2 rounded-full bg-gold-soft" />
            Principal
          </dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatCurrency(result.principal)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <span aria-hidden className="h-2 w-2 rounded-full bg-slate-soft" />
            Total interest
          </dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatCurrency(result.totalInterest)}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-1 border-t border-rule pt-3">
          <dt className="text-ink-soft">Total amount payable</dt>
          <dd className="font-mono text-base tabular-nums text-ink">
            {formatCurrency(result.totalPayable)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
