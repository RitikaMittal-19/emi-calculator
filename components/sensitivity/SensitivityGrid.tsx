"use client";

import { useMemo } from "react";
import { generateSensitivityMatrix } from "@/lib/calculations/sensitivity";
import type { SensitivityCell } from "@/types/sensitivity";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function formatDelta(delta: number, unit: string): string {
  if (delta === 0) return `Current`;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${unit}`;
}

/**
 * Sensitivity Analysis Grid for the active single loan (NOT generated per
 * comparison scenario — see architecture §11). Renders generateSensitivityMatrix's
 * flat cells[] as a real 7x7 <table>: rows are rate deltas, columns are
 * tenure deltas, each cell is the resulting EMI for that combination.
 *
 * Two layers of visual encoding, both serving real analytical purposes:
 *   1. The (0,0) "current selection" cell gets a strong gold highlight —
 *      it's the anchor every other cell is being compared against.
 *   2. Every other cell's background intensity scales with how much
 *      cheaper/more expensive its EMI is relative to the current
 *      selection, so the cheapest corner of the grid is visible at a
 *      glance without reading every number.
 */
export function SensitivityGrid() {
  const { state } = useCalculatorState();
  const { primaryLoan } = state;

  const matrix = useMemo(
    () =>
      generateSensitivityMatrix(
        primaryLoan.principal,
        primaryLoan.annualRate,
        primaryLoan.tenureMonths,
      ),
    [primaryLoan.principal, primaryLoan.annualRate, primaryLoan.tenureMonths],
  );

  const cellLookup = useMemo(() => {
    const map = new Map<string, SensitivityCell>();
    for (const cell of matrix.cells) {
      map.set(`${cell.rateDelta}:${cell.tenureDelta}`, cell);
    }
    return map;
  }, [matrix.cells]);

  const currentCell = cellLookup.get("0:0");
  const currentEmi = currentCell?.emi ?? 0;

  // Used to scale background intensity: the largest absolute EMI deviation
  // from the current selection across the whole grid, so the color scale
  // is relative to THIS loan's own range rather than an arbitrary fixed
  // rupee threshold that might not mean anything for a very large or very
  // small loan.
  const maxDeviation = useMemo(() => {
    let max = 0;
    for (const cell of matrix.cells) {
      max = Math.max(max, Math.abs(cell.emi - currentEmi));
    }
    return max || 1; // avoid divide-by-zero if every cell is identical
  }, [matrix.cells, currentEmi]);

  function cellBackground(cell: SensitivityCell): string {
    if (cell.isCurrentSelection) return "";
    const deviation = cell.emi - currentEmi;
    const intensity = Math.min(1, Math.abs(deviation) / maxDeviation);
    if (deviation < 0) {
      // Cheaper than current — green wash, scaled by intensity.
      return `rgba(47, 93, 58, ${(intensity * 0.18).toFixed(3)})`;
    }
    if (deviation > 0) {
      // More expensive — red wash, scaled by intensity.
      return `rgba(138, 51, 36, ${(intensity * 0.14).toFixed(3)})`;
    }
    return "";
  }

  return (
    <section
      aria-labelledby="sensitivity-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-paper-raised p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="sensitivity-heading" className="font-serif text-lg text-ink">
          Sensitivity analysis
        </h2>
        <p className="text-sm text-ink-soft">
          How your EMI changes with shifts in rate and tenure. The highlighted
          cell is your current loan.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            EMI sensitivity grid: rows are interest rate adjustments, columns
            are tenure adjustments. The current loan&apos;s rate and tenure is
            highlighted.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-rule-strong p-2 text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                Rate \ Tenure
              </th>
              {matrix.tenureDeltas.map((tenureDelta) => (
                <th
                  key={tenureDelta}
                  scope="col"
                  className={`border-b border-rule-strong p-2 text-right font-mono text-xs font-medium tabular-nums ${
                    tenureDelta === 0 ? "text-gold" : "text-ink-soft"
                  }`}
                >
                  {formatDelta(tenureDelta, "mo")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rateDeltas.map((rateDelta) => (
              <tr key={rateDelta}>
                <th
                  scope="row"
                  className={`border-b border-rule p-2 text-left font-mono text-xs font-medium tabular-nums ${
                    rateDelta === 0 ? "text-gold" : "text-ink-soft"
                  }`}
                >
                  {formatDelta(rateDelta, "%")}
                </th>
                {matrix.tenureDeltas.map((tenureDelta) => {
                  const cell = cellLookup.get(`${rateDelta}:${tenureDelta}`);
                  if (!cell) return <td key={tenureDelta} className="border-b border-rule p-2" />;
                  return (
                    <SensitivityCellDisplay
                      key={tenureDelta}
                      cell={cell}
                      background={cellBackground(cell)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-4 text-xs text-ink-soft">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full border-2 border-gold" />
          Current loan
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-signal-green" />
          Cheaper EMI
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-signal-red" />
          More expensive EMI
        </li>
      </ul>
    </section>
  );
}

interface SensitivityCellDisplayProps {
  cell: SensitivityCell;
  background: string;
}

function SensitivityCellDisplay({ cell, background }: SensitivityCellDisplayProps) {
  const label = `Rate ${formatDelta(cell.rateDelta, "%")}, tenure ${formatDelta(
    cell.tenureDelta,
    " months",
  )}: EMI ${formatCurrency(cell.emi)}${cell.isCurrentSelection ? " (current loan)" : ""}`;

  return (
    <td
      className={`border-b border-rule p-2 text-right font-mono tabular-nums ${
        cell.isCurrentSelection
          ? "border-2 border-gold bg-gold-wash font-semibold text-ink"
          : "text-ink"
      }`}
      style={cell.isCurrentSelection ? undefined : { backgroundColor: background }}
      aria-label={label}
    >
      {formatCurrency(cell.emi)}
    </td>
  );
}
