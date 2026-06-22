"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { calculateEmiResult } from "@/lib/calculations/emi";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const GOLD = "#b8862e";
const SLATE = "#5b6770";

/**
 * Donut chart breaking down total payable into principal vs interest,
 * using the same gold (principal) / slate (interest) color coding as
 * EmiSummaryCard's legend dots, so the visual language stays consistent
 * across the whole calculator panel rather than each component picking
 * its own palette.
 */
export function PrincipalInterestChart() {
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

  const data = useMemo(
    () => [
      { name: "Principal", value: result.principal, color: GOLD },
      { name: "Total interest", value: result.totalInterest, color: SLATE },
    ],
    [result.principal, result.totalInterest],
  );

  return (
    <section
      aria-labelledby="breakdown-chart-heading"
      className="flex flex-col gap-4 rounded-md border border-rule bg-paper-raised p-5"
    >
      <h2 id="breakdown-chart-heading" className="font-serif text-lg text-ink">
        Principal vs interest
      </h2>

      <div
        className="h-56 w-full"
        role="img"
        aria-label={`Principal ${formatCurrency(result.principal)} versus total interest ${formatCurrency(result.totalInterest)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--paper-raised)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                background: "var(--paper-raised)",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono tabular-nums text-ink">
              {formatCurrency(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
