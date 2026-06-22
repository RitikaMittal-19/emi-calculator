/**
 * Types for the sensitivity analysis grid: a matrix of EMI values across
 * rate deltas (±1/2/3%) and tenure deltas (±6/12/24 months), scoped to the
 * single active loan (not per comparison scenario — see architecture §11).
 */

/** Supported rate deltas, in percentage points, applied to the base annual rate. */
export const RATE_DELTAS = [-3, -2, -1, 0, 1, 2, 3] as const;
export type RateDelta = (typeof RATE_DELTAS)[number];

/** Supported tenure deltas, in months, applied to the base tenure. */
export const TENURE_DELTAS = [-24, -12, -6, 0, 6, 12, 24] as const;
export type TenureDelta = (typeof TENURE_DELTAS)[number];

/** A single cell in the sensitivity matrix. */
export interface SensitivityCell {
  rateDelta: RateDelta;
  tenureDelta: TenureDelta;
  /** Effective annual rate for this cell (base rate + rateDelta), clamped to >= 0. */
  effectiveRate: number;
  /** Effective tenure for this cell (base tenure + tenureDelta), clamped to >= 1 month. */
  effectiveTenureMonths: number;
  /** Resulting EMI for this rate/tenure combination. */
  emi: number;
  /** True if this cell corresponds to the loan's actual current rate and tenure (delta 0,0). */
  isCurrentSelection: boolean;
}

/** Full sensitivity matrix: one row per rate delta, one column per tenure delta. */
export interface SensitivityMatrix {
  rateDeltas: readonly RateDelta[];
  tenureDeltas: readonly TenureDelta[];
  /** Flat list of cells; consumers can filter/group by rateDelta or tenureDelta as needed. */
  cells: SensitivityCell[];
}
