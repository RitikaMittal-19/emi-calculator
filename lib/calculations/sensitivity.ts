import {
  RATE_DELTAS,
  TENURE_DELTAS,
  type SensitivityCell,
  type SensitivityMatrix,
} from "@/types/sensitivity";
import { calculateEmi } from "./emi";

/**
 * Generates the sensitivity analysis matrix for a single active loan:
 * a grid of EMI values across rate deltas (±1/2/3%) and tenure deltas
 * (±6/12/24 months), per architecture §11 — this is intentionally scoped
 * to one loan only, not generated per comparison scenario.
 *
 * Edge handling:
 * - Effective rate is clamped to >= 0 (a sufficiently negative delta on a
 *   low base rate cannot produce a negative interest rate).
 * - Effective tenure is clamped to >= 1 month (a sufficiently negative
 *   delta on a short base tenure cannot produce a zero or negative tenure).
 * - The (rateDelta: 0, tenureDelta: 0) cell always reflects the loan's
 *   actual current rate/tenure exactly, and is flagged via
 *   isCurrentSelection for UI highlighting.
 */
export function generateSensitivityMatrix(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): SensitivityMatrix {
  const cells: SensitivityCell[] = [];

  for (const rateDelta of RATE_DELTAS) {
    for (const tenureDelta of TENURE_DELTAS) {
      const effectiveRate = Math.max(0, annualRate + rateDelta);
      const effectiveTenureMonths = Math.max(1, tenureMonths + tenureDelta);

      cells.push({
        rateDelta,
        tenureDelta,
        effectiveRate,
        effectiveTenureMonths,
        emi: calculateEmi(principal, effectiveRate, effectiveTenureMonths),
        isCurrentSelection: rateDelta === 0 && tenureDelta === 0,
      });
    }
  }

  return {
    rateDeltas: RATE_DELTAS,
    tenureDeltas: TENURE_DELTAS,
    cells,
  };
}
