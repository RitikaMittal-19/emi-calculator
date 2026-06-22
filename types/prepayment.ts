/**
 * One-time lump-sum prepayment types. Recurring prepayments are explicitly
 * out of scope (see project architecture doc, §2).
 */

/** A single one-time lump-sum prepayment toward a loan's outstanding principal. */
export interface Prepayment {
  /** Stable identifier — used for React keys and deletion in the planner UI. */
  id: string;
  /** 1-indexed month the prepayment is applied in. Must be between 1 and the loan's tenure. */
  month: number;
  /**
   * Lump-sum amount, in rupees. Must be > 0 and must not exceed the
   * outstanding principal balance at that month (validated against the
   * schedule, not statically — see validatePrepayment).
   */
  amount: number;
}

/** Result of validating a prepayment against a loan's current amortization state. */
export interface PrepaymentValidationResult {
  valid: boolean;
  /** Human-readable reason the prepayment was rejected, if `valid` is false. */
  error?: string;
}
