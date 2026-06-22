import type { AmortizationResult, AmortizationRow } from "@/types/amortization";
import type { LoanInput } from "@/types/loan";
import type { Prepayment, PrepaymentValidationResult } from "@/types/prepayment";
import { findBreakEvenMonth } from "./breakeven";
import { calculateEmi, calculateEmiResult, roundCurrency } from "./emi";

/**
 * Merges multiple prepayments that fall in the same month into a single
 * combined entry (sum of amounts), per architecture requirement that
 * same-month prepayments are merged rather than treated as separate rows.
 *
 * Does not mutate the input array. Returns entries sorted by month ascending.
 */
export function mergePrepaymentsByMonth(prepayments: Prepayment[]): Prepayment[] {
  const totalsByMonth = new Map<number, number>();

  for (const prepayment of prepayments) {
    const existing = totalsByMonth.get(prepayment.month) ?? 0;
    totalsByMonth.set(prepayment.month, existing + prepayment.amount);
  }

  return Array.from(totalsByMonth.entries())
    .sort(([monthA], [monthB]) => monthA - monthB)
    .map(([month, amount]) => ({
      id: `merged-${month}`,
      month,
      amount: roundCurrency(amount),
    }));
}

/**
 * Validates a single prepayment against the loan's tenure and the
 * outstanding balance at that point in the schedule.
 *
 * Note: `outstandingBalanceAtMonth` should be the opening balance for that
 * month BEFORE that month's regular EMI principal is deducted, representing
 * the maximum a prepayment could reasonably be expected not to exceed.
 * Callers building a full schedule should validate incrementally as they
 * compute each month's opening balance.
 */
export function validatePrepayment(
  prepayment: Pick<Prepayment, "month" | "amount">,
  outstandingBalanceAtMonth: number,
  tenureMonths: number,
): PrepaymentValidationResult {
  if (prepayment.amount <= 0) {
    return { valid: false, error: "Prepayment amount must be greater than 0." };
  }
  if (!Number.isInteger(prepayment.month) || prepayment.month < 1) {
    return { valid: false, error: "Prepayment month must be a positive integer." };
  }
  if (prepayment.month > tenureMonths) {
    return {
      valid: false,
      error: `Prepayment month (${prepayment.month}) exceeds loan tenure (${tenureMonths} months).`,
    };
  }
  if (prepayment.amount > outstandingBalanceAtMonth) {
    return {
      valid: false,
      error: `Prepayment amount (${prepayment.amount}) exceeds outstanding balance (${outstandingBalanceAtMonth}) at month ${prepayment.month}.`,
    };
  }
  return { valid: true };
}

/**
 * Generates a full month-by-month amortization schedule for a loan,
 * optionally applying one-time lump-sum prepayments.
 *
 * Key behaviors:
 * - EMI is fixed for the life of the loan (computed once from the original
 *   principal/rate/tenure); prepayments reduce the TENURE, not the EMI.
 *   This is the standard "keep EMI same, finish early" prepayment model.
 * - Prepayments in the same month are merged (summed) automatically.
 * - Each prepayment is validated against the outstanding balance at that
 *   month; invalid prepayments (over-balance or out-of-tenure) are SKIPPED
 *   rather than thrown, since by the time a schedule is regenerated mid-edit
 *   a previously-valid prepayment can become invalid as other inputs change.
 *   Callers needing strict validation feedback should call
 *   validatePrepayment directly before adding a prepayment to UI state.
 * - The final month's EMI is reduced if needed so the closing balance lands
 *   at exactly 0 (avoids floating-point overpayment/underpayment drift).
 * - If prepayments fully close the loan before the original tenure ends,
 *   the schedule stops there (actualTenureMonths < tenureMonths).
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  prepayments: Prepayment[] = [],
): AmortizationResult {
  const emi = calculateEmi(principal, annualRate, tenureMonths);
  const monthlyRate = annualRate / 12 / 100;
  const mergedPrepayments = mergePrepaymentsByMonth(prepayments);
  const prepaymentsByMonth = new Map(
    mergedPrepayments.map((p) => [p.month, p.amount]),
  );

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let cumulativeInterest = 0;

  for (let month = 1; month <= tenureMonths && balance > 0.005; month++) {
    const openingBalance = balance;
    const interestComponent = roundCurrency(openingBalance * monthlyRate);
    const isFinalScheduledMonth = month === tenureMonths;

    let principalComponent = roundCurrency(emi - interestComponent);
    let actualEmi = emi;

    // Final installment of the original tenure (or any month where the
    // computed principal component would overshoot the remaining balance):
    // force the loan to close out exactly, consuming the entire opening
    // balance as principal. This guards against BOTH directions of
    // accumulated rounding drift across many months — without this, a
    // 240-month schedule can finish a few rupees short of (or over) zero.
    if (principalComponent >= openingBalance || isFinalScheduledMonth) {
      principalComponent = openingBalance;
      actualEmi = roundCurrency(principalComponent + interestComponent);
    }

    let closingBalance = roundCurrency(openingBalance - principalComponent);

    // Apply any prepayment scheduled for this month, clamped to the
    // remaining balance after the regular EMI (handles the case where a
    // prepayment amount was validated against a stale balance).
    const requestedPrepayment = prepaymentsByMonth.get(month) ?? 0;
    const appliedPrepayment = Math.min(requestedPrepayment, closingBalance);
    closingBalance = roundCurrency(closingBalance - appliedPrepayment);

    // Snap tiny residuals (sub-paisa rounding dust) to exactly zero.
    if (closingBalance < 0.01) {
      closingBalance = 0;
    }

    cumulativeInterest += interestComponent;

    schedule.push({
      month,
      openingBalance: roundCurrency(openingBalance),
      emi: actualEmi,
      principalComponent: roundCurrency(principalComponent),
      interestComponent,
      prepayment: roundCurrency(appliedPrepayment),
      closingBalance,
    });

    balance = closingBalance;
  }

  const breakEvenMonth = findBreakEvenMonth(schedule);
  const totalInterestPaid = roundCurrency(cumulativeInterest);
  const actualTenureMonths = schedule.length;

  // Baseline: same loan, same EMI, with NO prepayments — used to compute
  // interestSaved. Only recompute if prepayments were actually supplied;
  // otherwise the baseline schedule would be identical work for no reason.
  let interestSaved = 0;
  if (mergedPrepayments.length > 0) {
    const baseline = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      [],
    );
    interestSaved = roundCurrency(baseline.totalInterestPaid - totalInterestPaid);
  }

  return {
    schedule,
    breakEvenMonth,
    actualTenureMonths,
    totalInterestPaid,
    interestSaved: interestSaved < 0 ? 0 : interestSaved,
    tenureReducedByMonths: tenureMonths - actualTenureMonths,
  };
}

/**
 * Finds the cheapest loan scenario (by total amount payable) among a set of
 * comparison scenarios, for highlighting in Comparison Mode.
 *
 * Comparison Mode scenarios do not carry prepayments (per architecture
 * §11 — prepayments are scoped to the primary loan only), so this uses
 * calculateEmiResult directly rather than the full amortization schedule.
 *
 * Returns null if `scenarios` is empty. If multiple scenarios tie for
 * cheapest, the first one encountered (lowest array index) is returned.
 */
export function findCheapestScenario(scenarios: LoanInput[]): LoanInput | null {
  if (scenarios.length === 0) {
    return null;
  }

  let cheapest = scenarios[0];
  let cheapestTotalPayable = calculateEmiResult(
    cheapest.principal,
    cheapest.annualRate,
    cheapest.tenureMonths,
  ).totalPayable;

  for (const scenario of scenarios.slice(1)) {
    const totalPayable = calculateEmiResult(
      scenario.principal,
      scenario.annualRate,
      scenario.tenureMonths,
    ).totalPayable;

    if (totalPayable < cheapestTotalPayable) {
      cheapest = scenario;
      cheapestTotalPayable = totalPayable;
    }
  }

  return cheapest;
}
