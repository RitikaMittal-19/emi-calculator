"use client";

import { PrepaymentForm } from "./PrepaymentForm";
import { PrepaymentList } from "./PrepaymentList";
import { useAmortizationSchedule } from "@/hooks/useAmortizationSchedule";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";

/**
 * Composes the full Prepayment Planner feature. The "current schedule"
 * passed to PrepaymentForm for balance-lookup validation is the schedule
 * INCLUDING all prepayments added so far — derived once here via
 * useAmortizationSchedule and threaded down, so the form never recomputes
 * its own separate (and potentially inconsistent) view of the schedule.
 *
 * The interest-saved / reduced-tenure summary updates live as prepayments
 * are added or removed, since it's derived from the same memoized
 * schedule that drives AmortizationSection elsewhere on the page.
 */
export function PrepaymentPlanner() {
  const { state, addPrepayment, removePrepayment } = useCalculatorState();
  const { primaryLoan, prepayments } = state;

  const result = useAmortizationSchedule(
    primaryLoan.principal,
    primaryLoan.annualRate,
    primaryLoan.tenureMonths,
    prepayments,
  );

  function handleAdd(month: number, amount: number) {
    addPrepayment({ id: crypto.randomUUID(), month, amount });
  }

  return (
    <section
      aria-labelledby="prepayment-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-paper-raised p-5"
    >
      <h2 id="prepayment-heading" className="font-serif text-lg text-ink">
        Prepayment planner
      </h2>

      <PrepaymentForm
        tenureMonths={primaryLoan.tenureMonths}
        schedule={result.schedule}
        onAdd={handleAdd}
      />

      {prepayments.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-sm bg-signal-green-wash p-3 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-ink-soft">Interest saved</dt>
            <dd className="font-mono tabular-nums text-signal-green">
              {formatCurrency(result.interestSaved)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-ink-soft">Tenure reduced by</dt>
            <dd className="font-mono tabular-nums text-signal-green">
              {result.tenureReducedByMonths} mo
            </dd>
          </div>
        </dl>
      ) : null}

      <PrepaymentList prepayments={prepayments} onRemove={removePrepayment} />
    </section>
  );
}
