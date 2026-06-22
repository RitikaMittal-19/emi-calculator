"use client";

import { useState } from "react";
import { Pagination } from "./Pagination";
import type { AmortizationRow } from "@/types/amortization";
import { formatCurrencyPrecise } from "@/lib/utils/formatCurrency";

const ROWS_PER_PAGE = 12; // one year per page — matches how loan statements are naturally read

interface AmortizationTableProps {
  schedule: AmortizationRow[];
  breakEvenMonth: number | null;
}

/**
 * Month-by-month amortization table. Resets to page 1 whenever the
 * schedule itself changes length (e.g. tenure or prepayments changed) —
 * otherwise a user on page 15 of a 240-month schedule could land on a
 * blank page after shortening the loan to 60 months via a large
 * prepayment. Detected via a derived "schedule signature" rather than a
 * useEffect, to avoid an extra render cycle.
 */
export function AmortizationTable({ schedule, breakEvenMonth }: AmortizationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [lastScheduleLength, setLastScheduleLength] = useState(schedule.length);

  // Reset pagination synchronously during render if the schedule length
  // changed since the last render — the React-recommended pattern for
  // "derived state that resets on prop change" without an effect+flicker.
  if (schedule.length !== lastScheduleLength) {
    setLastScheduleLength(schedule.length);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(schedule.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const visibleRows = schedule.slice(startIndex, startIndex + ROWS_PER_PAGE);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            Month-by-month amortization schedule, page {safePage} of {totalPages}
          </caption>
          <thead>
            <tr className="border-b border-rule-strong text-left text-xs uppercase tracking-wide text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-medium">
                Month
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Opening balance
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                EMI
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Principal
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Interest
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Prepayment
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Closing balance
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isBreakEven = row.month === breakEvenMonth;
              return (
                <tr
                  key={row.month}
                  className={`border-b border-rule font-mono tabular-nums ${
                    isBreakEven ? "bg-gold-wash" : ""
                  }`}
                >
                  <th scope="row" className="py-2 pr-3 text-left font-mono font-normal text-ink">
                    {row.month}
                    {isBreakEven ? (
                      <span className="ml-1.5 rounded-sm bg-gold-soft px-1 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-paper-raised">
                        Break-even
                      </span>
                    ) : null}
                  </th>
                  <td className="py-2 pr-3 text-right text-ink-soft">
                    {formatCurrencyPrecise(row.openingBalance)}
                  </td>
                  <td className="py-2 pr-3 text-right text-ink">
                    {formatCurrencyPrecise(row.emi)}
                  </td>
                  <td className="py-2 pr-3 text-right text-gold">
                    {formatCurrencyPrecise(row.principalComponent)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate">
                    {formatCurrencyPrecise(row.interestComponent)}
                  </td>
                  <td className="py-2 pr-3 text-right text-signal-green">
                    {row.prepayment > 0 ? formatCurrencyPrecise(row.prepayment) : "—"}
                  </td>
                  <td className="py-2 text-right text-ink-soft">
                    {formatCurrencyPrecise(row.closingBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
