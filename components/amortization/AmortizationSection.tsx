"use client";

import { useState } from "react";
import { AmortizationTable } from "./AmortizationTable";
import { AmortizationChart } from "./AmortizationChart";
import { TableChartToggle, type AmortizationView } from "./TableChartToggle";
import { useAmortizationSchedule } from "@/hooks/useAmortizationSchedule";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { amortizationScheduleToCsv, triggerCsvDownload } from "@/lib/utils/csvExport";

/**
 * Composes the full Amortization Schedule feature: derives the schedule
 * from the primary loan + prepayments via useAmortizationSchedule, then
 * renders either the paginated table or the yearly stacked chart based on
 * local view state. Break-even, interest-saved, and tenure-reduction
 * figures are surfaced as a summary strip above both views, since they're
 * meaningful regardless of which view is active.
 */
export function AmortizationSection() {
  const { state } = useCalculatorState();
  const { primaryLoan, prepayments } = state;
  const [view, setView] = useState<AmortizationView>("table");

  const result = useAmortizationSchedule(
    primaryLoan.principal,
    primaryLoan.annualRate,
    primaryLoan.tenureMonths,
    prepayments,
  );

  function handleExport() {
    const csv = amortizationScheduleToCsv(result.schedule);
    // Self-describing filename: principal in lakhs, rate, tenure — so a
    // person with several exported files open can tell them apart without
    // opening each one.
    const filename = `amortization-${primaryLoan.principal}-${primaryLoan.annualRate}pct-${primaryLoan.tenureMonths}mo.csv`;
    triggerCsvDownload(csv, filename);
  }

  return (
    <section
      aria-labelledby="amortization-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-paper-raised p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="amortization-heading" className="font-serif text-lg text-ink">
          Amortization schedule
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-sm border border-rule px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-gold"
          >
            Export CSV
          </button>
          <TableChartToggle view={view} onChange={setView} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-rule pb-5 text-sm sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-ink-soft">Break-even month</dt>
          <dd className="font-mono tabular-nums text-ink">
            {result.breakEvenMonth ?? "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-ink-soft">Actual tenure</dt>
          <dd className="font-mono tabular-nums text-ink">
            {result.actualTenureMonths} mo
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-ink-soft">Total interest paid</dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatCurrency(result.totalInterestPaid)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-ink-soft">Interest saved</dt>
          <dd className="font-mono tabular-nums text-signal-green">
            {result.interestSaved > 0 ? formatCurrency(result.interestSaved) : "—"}
          </dd>
        </div>
      </dl>

      {view === "table" ? (
        <AmortizationTable schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />
      ) : (
        <AmortizationChart schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />
      )}
    </section>
  );
}
