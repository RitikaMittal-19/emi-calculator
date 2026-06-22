/**
 * Core domain types for loan input and EMI calculation results.
 */

/** A single loan configuration to calculate EMI for. */
export interface LoanInput {
  /** Stable identifier — required for comparison scenarios (max 3) and React keys. */
  id: string;
  /** Principal loan amount, in rupees. Must be > 0. */
  principal: number;
  /** Annual interest rate, as a percentage (e.g. 8.5 means 8.5%). Must be >= 0. */
  annualRate: number;
  /** Loan tenure in months. Must be a positive integer. */
  tenureMonths: number;
  /** Optional display label, used in Comparison Mode scenario cards. */
  label?: string;
}

/** Top-line EMI summary for a given LoanInput, with no prepayments applied. */
export interface EmiResult {
  /** Fixed monthly installment amount, in rupees, rounded to 2 decimal places. */
  emi: number;
  /** Total interest paid over the full tenure, in rupees. */
  totalInterest: number;
  /** Total amount payable (principal + totalInterest), in rupees. */
  totalPayable: number;
  /** Echoed back for convenience so callers don't need the original LoanInput. */
  principal: number;
}
