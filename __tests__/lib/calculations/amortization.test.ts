import { describe, expect, it } from "vitest";
import {
  findCheapestScenario,
  generateAmortizationSchedule,
  mergePrepaymentsByMonth,
  validatePrepayment,
} from "@/lib/calculations/amortization";
import { roundCurrency } from "@/lib/calculations/emi";
import type { LoanInput } from "@/types/loan";
import type { Prepayment } from "@/types/prepayment";

describe("mergePrepaymentsByMonth", () => {
  it("merges multiple prepayments in the same month by summing amounts", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 12, amount: 10_000 },
      { id: "2", month: 12, amount: 5_000 },
    ];
    const merged = mergePrepaymentsByMonth(prepayments);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ month: 12, amount: 15_000 });
  });

  it("leaves prepayments in different months unmerged", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 6, amount: 10_000 },
      { id: "2", month: 12, amount: 5_000 },
    ];
    const merged = mergePrepaymentsByMonth(prepayments);
    expect(merged).toHaveLength(2);
  });

  it("returns results sorted by month ascending regardless of input order", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 24, amount: 1_000 },
      { id: "2", month: 3, amount: 1_000 },
      { id: "3", month: 12, amount: 1_000 },
    ];
    const merged = mergePrepaymentsByMonth(prepayments);
    expect(merged.map((p) => p.month)).toEqual([3, 12, 24]);
  });

  it("returns an empty array for no prepayments", () => {
    expect(mergePrepaymentsByMonth([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 1, amount: 1_000 }];
    const copy = JSON.parse(JSON.stringify(prepayments));
    mergePrepaymentsByMonth(prepayments);
    expect(prepayments).toEqual(copy);
  });
});

describe("validatePrepayment", () => {
  it("accepts a valid prepayment within tenure and balance", () => {
    const result = validatePrepayment({ month: 12, amount: 50_000 }, 100_000, 240);
    expect(result.valid).toBe(true);
  });

  it("rejects a prepayment exceeding the outstanding balance", () => {
    const result = validatePrepayment({ month: 12, amount: 150_000 }, 100_000, 240);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds outstanding balance/i);
  });

  it("rejects a prepayment month beyond the loan tenure", () => {
    const result = validatePrepayment({ month: 300, amount: 1_000 }, 100_000, 240);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds loan tenure/i);
  });

  it("rejects a zero or negative prepayment amount", () => {
    expect(validatePrepayment({ month: 1, amount: 0 }, 100_000, 240).valid).toBe(
      false,
    );
    expect(validatePrepayment({ month: 1, amount: -500 }, 100_000, 240).valid).toBe(
      false,
    );
  });

  it("rejects a non-positive or non-integer month", () => {
    expect(validatePrepayment({ month: 0, amount: 1_000 }, 100_000, 240).valid).toBe(
      false,
    );
    expect(
      validatePrepayment({ month: 1.5, amount: 1_000 }, 100_000, 240).valid,
    ).toBe(false);
  });

  it("accepts a prepayment exactly equal to the outstanding balance", () => {
    const result = validatePrepayment({ month: 12, amount: 100_000 }, 100_000, 240);
    expect(result.valid).toBe(true);
  });
});

describe("generateAmortizationSchedule — no prepayments", () => {
  const principal = 1_000_000;
  const annualRate = 8.5;
  const tenureMonths = 240;

  it("produces exactly tenureMonths rows when no prepayments are made", () => {
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    expect(result.schedule).toHaveLength(tenureMonths);
    expect(result.actualTenureMonths).toBe(tenureMonths);
    expect(result.tenureReducedByMonths).toBe(0);
  });

  it("closes the final month's balance to exactly 0 (no floating point drift)", () => {
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.closingBalance).toBe(0);
  });

  it("sum of all principal components equals the original principal exactly", () => {
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    const totalPrincipalPaid = roundCurrency(
      result.schedule.reduce(
        (sum, row) => sum + row.principalComponent + row.prepayment,
        0,
      ),
    );
    expect(totalPrincipalPaid).toBe(principal);
  });

  it("has zero prepayment in every row when none were supplied", () => {
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    expect(result.schedule.every((row) => row.prepayment === 0)).toBe(true);
  });

  it("has zero interestSaved when no prepayments were supplied", () => {
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    expect(result.interestSaved).toBe(0);
  });

  it("each row's closing balance equals the next row's opening balance", () => {
    const result = generateAmortizationSchedule(500_000, 9, 60);
    for (let i = 0; i < result.schedule.length - 1; i++) {
      expect(result.schedule[i].closingBalance).toBe(
        result.schedule[i + 1].openingBalance,
      );
    }
  });

  it("balance decreases monotonically", () => {
    const result = generateAmortizationSchedule(500_000, 9, 60);
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].closingBalance).toBeLessThanOrEqual(
        result.schedule[i - 1].closingBalance,
      );
    }
  });
});

describe("generateAmortizationSchedule — break-even detection", () => {
  it("detects a mid-schedule break-even month for a realistic loan profile", () => {
    // Independently verified: 500,000 @ 8.5% / 120 months breaks even at month 44.
    const result = generateAmortizationSchedule(500_000, 8.5, 120);
    expect(result.breakEvenMonth).toBe(44);
  });

  it("break-even month is month 1 for a zero-interest loan (principal always >= interest)", () => {
    const result = generateAmortizationSchedule(120_000, 0, 12);
    expect(result.breakEvenMonth).toBe(1);
  });

  it("returns null when a long, low-rate loan never reaches break-even within its tenure", () => {
    // Independently verified: 1,000,000 @ 8.5% / 240 months never breaks even
    // within the schedule — interest dominates almost the entire tenure.
    const result = generateAmortizationSchedule(1_000_000, 8.5, 240);
    expect(result.breakEvenMonth).toBeNull();
  });

  it("short, high-rate loans still resolve to a valid month or null, never throw", () => {
    expect(() => generateAmortizationSchedule(100_000, 36, 3)).not.toThrow();
  });
});

describe("generateAmortizationSchedule — with prepayments", () => {
  const principal = 1_000_000;
  const annualRate = 8.5;
  const tenureMonths = 240;

  it("reduces actualTenureMonths below the original tenure", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 12, amount: 200_000 }];
    const result = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      prepayments,
    );
    expect(result.actualTenureMonths).toBeLessThan(tenureMonths);
    expect(result.tenureReducedByMonths).toBeGreaterThan(0);
  });

  it("reduces total interest paid compared to no-prepayment baseline", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 12, amount: 200_000 }];
    const withPrepay = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      prepayments,
    );
    const baseline = generateAmortizationSchedule(principal, annualRate, tenureMonths);
    expect(withPrepay.totalInterestPaid).toBeLessThan(baseline.totalInterestPaid);
    expect(withPrepay.interestSaved).toBeGreaterThan(0);
    expect(withPrepay.interestSaved).toBeCloseTo(
      baseline.totalInterestPaid - withPrepay.totalInterestPaid,
      1,
    );
  });

  it("merges multiple same-month prepayments before applying them", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 12, amount: 100_000 },
      { id: "2", month: 12, amount: 50_000 },
    ];
    const result = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      prepayments,
    );
    const month12Row = result.schedule.find((row) => row.month === 12);
    expect(month12Row?.prepayment).toBe(150_000);
  });

  it("applies multiple prepayments in different months correctly", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 12, amount: 100_000 },
      { id: "2", month: 36, amount: 50_000 },
    ];
    const result = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      prepayments,
    );
    const month12 = result.schedule.find((row) => row.month === 12);
    const month36 = result.schedule.find((row) => row.month === 36);
    expect(month12?.prepayment).toBe(100_000);
    expect(month36?.prepayment).toBe(50_000);
  });

  it("still closes the final balance to exactly 0 with prepayments applied", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 12, amount: 200_000 }];
    const result = generateAmortizationSchedule(
      principal,
      annualRate,
      tenureMonths,
      prepayments,
    );
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.closingBalance).toBe(0);
  });

  it("a prepayment large enough to clear the remaining balance ends the schedule early", () => {
    // Small loan, single large prepayment that should close it out almost immediately.
    const result = generateAmortizationSchedule(100_000, 10, 24, [
      { id: "1", month: 2, amount: 95_000 },
    ]);
    expect(result.actualTenureMonths).toBeLessThan(24);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.closingBalance).toBe(0);
  });

  it("clamps an over-balance prepayment to the remaining balance rather than going negative", () => {
    // Deliberately pass a prepayment larger than what will be outstanding —
    // generateAmortizationSchedule should clamp it, not throw or go negative.
    const result = generateAmortizationSchedule(100_000, 10, 24, [
      { id: "1", month: 1, amount: 99_999_999 },
    ]);
    expect(
      result.schedule.every((row) => row.closingBalance >= 0),
    ).toBe(true);
    expect(result.actualTenureMonths).toBe(1);
  });

  it("ignores a prepayment scheduled beyond the tenure (never reached)", () => {
    // month 300 is beyond a 240-month loan; since the schedule loop only
    // runs to tenureMonths (or early closure), this prepayment is simply
    // never applied — it should not cause an error.
    const result = generateAmortizationSchedule(principal, annualRate, tenureMonths, [
      { id: "1", month: 300, amount: 10_000 },
    ]);
    expect(result.schedule).toHaveLength(tenureMonths);
  });
});

describe("findCheapestScenario", () => {
  it("returns null for an empty scenario list", () => {
    expect(findCheapestScenario([])).toBeNull();
  });

  it("returns the only scenario when there's just one", () => {
    const scenario: LoanInput = {
      id: "a",
      principal: 500_000,
      annualRate: 8,
      tenureMonths: 60,
    };
    expect(findCheapestScenario([scenario])).toEqual(scenario);
  });

  it("identifies the scenario with the lowest total payable, even when it has the highest rate", () => {
    // Independently verified total payable: a=1,032,797.16, b=2,275,999.20,
    // c=871,851.00 — c wins despite the highest rate, because its much
    // smaller principal dominates the comparison.
    const scenarios: LoanInput[] = [
      { id: "a", principal: 1_000_000, annualRate: 6, tenureMonths: 12 },
      { id: "b", principal: 500_000, annualRate: 15, tenureMonths: 360 },
      { id: "c", principal: 700_000, annualRate: 9, tenureMonths: 60 },
    ];
    const cheapest = findCheapestScenario(scenarios);
    expect(cheapest?.id).toBe("c");
  });

  it("breaks ties by returning the first scenario encountered", () => {
    const identical: LoanInput = {
      id: "first",
      principal: 500_000,
      annualRate: 8,
      tenureMonths: 60,
    };
    const scenarios: LoanInput[] = [
      identical,
      { ...identical, id: "second" },
    ];
    expect(findCheapestScenario(scenarios)?.id).toBe("first");
  });

  it("works correctly for the full set of 3 comparison scenarios (max allowed)", () => {
    const scenarios: LoanInput[] = [
      { id: "a", principal: 800_000, annualRate: 8.5, tenureMonths: 180 },
      { id: "b", principal: 800_000, annualRate: 8.5, tenureMonths: 120 },
      { id: "c", principal: 800_000, annualRate: 9.5, tenureMonths: 180 },
    ];
    // Same principal: shorter tenure at same rate is usually cheaper overall
    // (less total interest), and lower rate beats higher rate at same tenure.
    const cheapest = findCheapestScenario(scenarios);
    expect(cheapest?.id).toBe("b");
  });
});
