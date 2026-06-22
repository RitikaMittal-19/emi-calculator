"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AmortizationRow } from "@/types/amortization";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const GOLD = "#b8862e";
const SLATE = "#5b6770";

interface AmortizationChartProps {
  schedule: AmortizationRow[];
  breakEvenMonth: number | null;
}

export interface YearBucket {
  year: number;
  principal: number;
  interest: number;
}

/**
 * Aggregates a month-by-month schedule into yearly buckets for charting.
 * A 360-month (30-year) schedule plotted as individual monthly bars is
 * unreadable and slow to render; bucketing to ~30 bars instead of 360
 * keeps the chart legible while still showing the principal/interest
 * mix shift over the loan's life. The table view (AmortizationTable)
 * remains month-by-month, per spec — this aggregation is chart-only.
 */
export function aggregateByYear(schedule: AmortizationRow[]): YearBucket[] {
  const buckets = new Map<number, YearBucket>();

  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    const existing = buckets.get(year) ?? { year, principal: 0, interest: 0 };
    existing.principal += row.principalComponent + row.prepayment;
    existing.interest += row.interestComponent;
    buckets.set(year, existing);
  }

  return Array.from(buckets.values()).sort((a, b) => a.year - b.year);
}

export function AmortizationChart({ schedule, breakEvenMonth }: AmortizationChartProps) {
  const data = useMemo(() => aggregateByYear(schedule), [schedule]);
  const breakEvenYear = breakEvenMonth !== null ? Math.ceil(breakEvenMonth / 12) : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="h-72 w-full"
        role="img"
        aria-label="Yearly principal versus interest breakdown across the loan tenure"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="year"
              tickFormatter={(year) => `Y${year}`}
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              axisLine={{ stroke: "var(--rule-strong)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) =>
                value === 0 ? "0" : `${(value / 100_000).toFixed(0)}L`
              }
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              labelFormatter={(year) => `Year ${year}`}
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                background: "var(--paper-raised)",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13, color: "var(--ink-soft)" }} />
            <Bar dataKey="principal" name="Principal" stackId="amount" fill={GOLD} />
            <Bar dataKey="interest" name="Interest" stackId="amount" fill={SLATE} />
            {breakEvenYear !== null ? (
              <ReferenceLine
                x={breakEvenYear}
                stroke="var(--signal-green)"
                strokeDasharray="4 3"
                label={{
                  value: "Break-even",
                  position: "top",
                  fill: "var(--signal-green)",
                  fontSize: 11,
                }}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
