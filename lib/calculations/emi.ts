import type { EmiResult } from "@/types/loan";

/**
 * Rounds a rupee amount to 2 decimal places, guarding against floating-point
 * artifacts like 1234.5599999999999. Using a small epsilon nudge before
 * rounding avoids the classic 0.1 + 0.2 problem at the precision we operate at.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the fixed monthly EMI for a loan using the standard
 * reducing-balance amortization formula:
 *
 *   EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * where:
 *   P = principal
 *   r = monthly interest rate (annualRate / 12 / 100)
 *   n = tenure in months
 *
 * Special-cased for annualRate === 0, since the formula above divides by
 * zero when r = 0 (the loan is simply principal spread evenly over tenure).
 *
 * @throws RangeError if principal <= 0, tenureMonths <= 0, or annualRate < 0.
 */
export function calculateEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): number {
  if (principal <= 0) {
    throw new RangeError("principal must be greater than 0");
  }
  if (tenureMonths <= 0 || !Number.isInteger(tenureMonths)) {
    throw new RangeError("tenureMonths must be a positive integer");
  }
  if (annualRate < 0) {
    throw new RangeError("annualRate must be >= 0");
  }

  if (annualRate === 0) {
    return roundCurrency(principal / tenureMonths);
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);

  return roundCurrency(emi);
}

/**
 * Calculates top-line EMI summary figures (EMI, total interest, total
 * payable) for a loan with NO prepayments applied. For prepayment-aware
 * figures, use generateAmortizationSchedule instead — this function is the
 * fast path for the main calculator's headline numbers.
 */
export function calculateEmiResult(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): EmiResult {
  const emi = calculateEmi(principal, annualRate, tenureMonths);
  const totalPayable = roundCurrency(emi * tenureMonths);
  const totalInterest = roundCurrency(totalPayable - principal);

  return {
    emi,
    totalInterest,
    totalPayable,
    principal,
  };
}
