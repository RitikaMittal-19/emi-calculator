"use client";

import { useId, useState, type FormEvent } from "react";
import { validatePrepayment } from "@/lib/calculations/amortization";
import type { AmortizationRow } from "@/types/amortization";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface PrepaymentFormProps {
  tenureMonths: number;
  /** The CURRENT schedule (reflecting any already-added prepayments), used to look up the real outstanding balance at the chosen month for validation. */
  schedule: AmortizationRow[];
  onAdd: (month: number, amount: number) => void;
}

/**
 * Form for adding a single one-time lump-sum prepayment. Validation runs
 * against the loan's ACTUAL outstanding balance at the chosen month — read
 * directly off the live schedule (which already reflects any previously
 * added prepayments) rather than recomputed from scratch, so two
 * prepayments in sequence are validated against an accurate, up-to-date
 * balance rather than the original loan terms.
 */
export function PrepaymentForm({ tenureMonths, schedule, onAdd }: PrepaymentFormProps) {
  const monthId = useId();
  const amountId = useId();

  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function getOutstandingBalanceAtMonth(targetMonth: number): number | null {
    const row = schedule.find((r) => r.month === targetMonth);
    // openingBalance is the balance BEFORE that month's EMI is deducted —
    // the correct ceiling for "how much could you possibly prepay this
    // month," since a prepayment is applied on top of (after) the regular
    // EMI for that month in generateAmortizationSchedule.
    return row ? row.openingBalance : null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const monthNum = Number(month);
    const amountNum = Number(amount);

    if (month.trim() === "" || !Number.isFinite(monthNum)) {
      setError("Enter a valid month.");
      return;
    }
    if (amount.trim() === "" || !Number.isFinite(amountNum)) {
      setError("Enter a valid amount.");
      return;
    }

    // Run the structural checks (month/amount bounds, integer month) FIRST,
    // using a placeholder balance that can never trigger the balance-check
    // branch. This must happen before the schedule lookup below: if the
    // month is out of tenure entirely, the schedule won't have a row for
    // it either, and without this ordering that gets misreported as "loan
    // already repaid early" instead of the correct "exceeds loan tenure".
    const structuralCheck = validatePrepayment(
      { month: monthNum, amount: amountNum },
      Number.POSITIVE_INFINITY,
      tenureMonths,
    );
    if (!structuralCheck.valid) {
      setError(structuralCheck.error ?? "Invalid prepayment.");
      return;
    }

    const outstandingBalance = getOutstandingBalanceAtMonth(monthNum);
    if (outstandingBalance === null) {
      // Month IS within tenure (passed the structural check above), but
      // the loan has already fully closed out before reaching it — e.g.
      // an earlier large prepayment ended the schedule early. There's
      // nothing left to prepay against.
      setError(
        `The loan is already fully repaid before month ${monthNum}; there's no balance left to prepay.`,
      );
      return;
    }

    const validation = validatePrepayment(
      { month: monthNum, amount: amountNum },
      outstandingBalance,
      tenureMonths,
    );

    if (!validation.valid) {
      setError(validation.error ?? "Invalid prepayment.");
      return;
    }

    onAdd(monthNum, amountNum);
    setMonth("");
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={monthId} className="text-sm font-medium text-ink-soft">
            Month
          </label>
          <input
            id={monthId}
            type="number"
            inputMode="numeric"
            min={1}
            max={tenureMonths}
            placeholder={`1–${tenureMonths}`}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-sm border border-rule bg-paper px-2 py-1.5 text-sm tabular-nums text-ink focus-visible:border-gold"
            aria-describedby={error ? `${monthId}-error` : undefined}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={amountId} className="text-sm font-medium text-ink-soft">
            Amount
          </label>
          <input
            id={amountId}
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-sm border border-rule bg-paper px-2 py-1.5 text-sm tabular-nums text-ink focus-visible:border-gold"
          />
        </div>

        <button
          type="submit"
          className="rounded-sm bg-gold-soft px-4 py-1.5 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90"
        >
          Add prepayment
        </button>
      </div>

      {error ? (
        <p id={`${monthId}-error`} role="alert" className="text-sm text-signal-red">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-ink-soft">
        Same-month prepayments are combined automatically. Max amount is the
        outstanding balance at that month{schedule[0] ? ` (currently up to ${formatCurrency(schedule[0].openingBalance)} in month 1)` : ""}.
      </p>
    </form>
  );
}
