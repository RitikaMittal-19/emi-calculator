/**
 * Types for the month-by-month amortization schedule, including the effect
 * of one-time lump-sum prepayments.
 */

/** A single row of the amortization schedule, representing one month. */
export interface AmortizationRow {
  /** 1-indexed month number. */
  month: number;
  /** Outstanding principal balance at the start of this month, before this month's payment. */
  openingBalance: number;
  /**
   * The EMI actually paid this month. Equal to the loan's fixed EMI for all
   * months except possibly the final month, where it's reduced to exactly
   * close out the remaining balance (avoids floating-point overpayment).
   */
  emi: number;
  /** Portion of `emi` that goes toward principal. */
  principalComponent: number;
  /** Portion of `emi` that goes toward interest. */
  interestComponent: number;
  /** Any lump-sum prepayment applied this month, in addition to the EMI. Defaults to 0. */
  prepayment: number;
  /** Outstanding principal balance after this month's EMI and prepayment are applied. */
  closingBalance: number;
}

/** Full result of generating an amortization schedule for a loan (with optional prepayments). */
export interface AmortizationResult {
  /** One row per month, in chronological order, until the loan is fully repaid. */
  schedule: AmortizationRow[];
  /**
   * First month where cumulative principal paid >= cumulative interest paid,
   * or null if the loan never reaches that point within its tenure (e.g.
   * very short tenure, or very high rate where interest always dominates).
   */
  breakEvenMonth: number | null;
  /**
   * Actual number of months until the loan is fully repaid. May be less
   * than the original `tenureMonths` if prepayments closed the loan early.
   */
  actualTenureMonths: number;
  /** Total interest actually paid across the full (possibly shortened) schedule. */
  totalInterestPaid: number;
  /**
   * Interest saved compared to the same loan with no prepayments at all.
   * Always >= 0. Equal to 0 if no prepayments were supplied.
   */
  interestSaved: number;
  /**
   * Months saved compared to the original tenure due to prepayments.
   * Equal to `tenureMonths - actualTenureMonths`. Always >= 0.
   */
  tenureReducedByMonths: number;
}
