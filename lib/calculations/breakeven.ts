import type { AmortizationRow } from "@/types/amortization";

/**
 * Finds the first month in an amortization schedule where cumulative
 * principal paid (including prepayments) is >= cumulative interest paid.
 *
 * Operates on an already-generated schedule rather than recomputing one,
 * so it can be reused independently (e.g. if a caller already has a
 * schedule in hand and just wants the break-even point without
 * regenerating it).
 *
 * Returns null if the schedule never reaches that crossover point — this
 * is expected and valid for long-tenure, low-rate loans where interest
 * dominates for most or all of the tenure.
 */
export function findBreakEvenMonth(schedule: AmortizationRow[]): number | null {
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (const row of schedule) {
    cumulativePrincipal += row.principalComponent + row.prepayment;
    cumulativeInterest += row.interestComponent;

    if (cumulativePrincipal >= cumulativeInterest) {
      return row.month;
    }
  }

  return null;
}
