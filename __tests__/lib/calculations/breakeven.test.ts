import { describe, expect, it } from "vitest";
import { findBreakEvenMonth } from "@/lib/calculations/breakeven";
import type { AmortizationRow } from "@/types/amortization";

/** Minimal helper to build a row fixture without repeating every field. */
function row(overrides: Partial<AmortizationRow> & { month: number }): AmortizationRow {
  return {
    openingBalance: 0,
    emi: 0,
    principalComponent: 0,
    interestComponent: 0,
    prepayment: 0,
    closingBalance: 0,
    ...overrides,
  };
}

describe("findBreakEvenMonth", () => {
  it("returns the first month where cumulative principal >= cumulative interest", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 100, interestComponent: 900 }),
      row({ month: 2, principalComponent: 200, interestComponent: 800 }),
      row({ month: 3, principalComponent: 800, interestComponent: 200 }),
      // Cumulative after month 3: principal=1100, interest=1900 -> not yet
      row({ month: 4, principalComponent: 900, interestComponent: 100 }),
      // Cumulative after month 4: principal=2000, interest=2000 -> break-even
    ];
    expect(findBreakEvenMonth(schedule)).toBe(4);
  });

  it("includes prepayments as part of cumulative principal", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 100, interestComponent: 900, prepayment: 850 }),
      // Cumulative: principal+prepay = 950, interest = 900 -> break-even at month 1
    ];
    expect(findBreakEvenMonth(schedule)).toBe(1);
  });

  it("returns null when cumulative principal never catches cumulative interest", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 50, interestComponent: 950 }),
      row({ month: 2, principalComponent: 60, interestComponent: 940 }),
      row({ month: 3, principalComponent: 70, interestComponent: 930 }),
    ];
    expect(findBreakEvenMonth(schedule)).toBeNull();
  });

  it("returns null for an empty schedule", () => {
    expect(findBreakEvenMonth([])).toBeNull();
  });

  it("returns month 1 when principal already exceeds interest in the first row", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 900, interestComponent: 100 }),
    ];
    expect(findBreakEvenMonth(schedule)).toBe(1);
  });

  it("treats exact equality as break-even (>=, not strictly >)", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 500, interestComponent: 500 }),
    ];
    expect(findBreakEvenMonth(schedule)).toBe(1);
  });
});
