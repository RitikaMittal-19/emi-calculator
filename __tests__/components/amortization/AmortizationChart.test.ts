import { describe, expect, it } from "vitest";
import { aggregateByYear } from "@/components/amortization/AmortizationChart";
import { generateAmortizationSchedule } from "@/lib/calculations/amortization";
import { roundCurrency } from "@/lib/calculations/emi";
import type { AmortizationRow } from "@/types/amortization";

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

describe("aggregateByYear", () => {
  it("groups exactly 12 months into a single year bucket", () => {
    const schedule: AmortizationRow[] = Array.from({ length: 12 }, (_, i) =>
      row({ month: i + 1, principalComponent: 100, interestComponent: 50 }),
    );
    const buckets = aggregateByYear(schedule);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ year: 1, principal: 1200, interest: 600 });
  });

  it("splits 24 months into exactly 2 year buckets", () => {
    const schedule: AmortizationRow[] = Array.from({ length: 24 }, (_, i) =>
      row({ month: i + 1, principalComponent: 100, interestComponent: 50 }),
    );
    const buckets = aggregateByYear(schedule);
    expect(buckets.map((b) => b.year)).toEqual([1, 2]);
    expect(buckets[1]).toMatchObject({ principal: 1200, interest: 600 });
  });

  it("handles a partial final year correctly (e.g. 14 months -> year 2 has only 2 months)", () => {
    const schedule: AmortizationRow[] = Array.from({ length: 14 }, (_, i) =>
      row({ month: i + 1, principalComponent: 100, interestComponent: 50 }),
    );
    const buckets = aggregateByYear(schedule);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toMatchObject({ year: 1, principal: 1200, interest: 600 });
    expect(buckets[1]).toMatchObject({ year: 2, principal: 200, interest: 100 }); // only months 13-14
  });

  it("includes prepayments as part of the principal bucket", () => {
    const schedule: AmortizationRow[] = [
      row({ month: 1, principalComponent: 100, interestComponent: 50, prepayment: 500 }),
    ];
    const buckets = aggregateByYear(schedule);
    expect(buckets[0].principal).toBe(600); // 100 + 500
  });

  it("returns an empty array for an empty schedule", () => {
    expect(aggregateByYear([])).toEqual([]);
  });

  it("returns buckets sorted by year ascending", () => {
    // Construct out of natural order to confirm sort, not insertion order.
    const schedule: AmortizationRow[] = [
      row({ month: 25, principalComponent: 10, interestComponent: 5 }), // year 3
      row({ month: 1, principalComponent: 10, interestComponent: 5 }), // year 1
      row({ month: 13, principalComponent: 10, interestComponent: 5 }), // year 2
    ];
    const buckets = aggregateByYear(schedule);
    expect(buckets.map((b) => b.year)).toEqual([1, 2, 3]);
  });

  it("matches expected bucket count for a real 240-month generated schedule (20 years)", () => {
    const result = generateAmortizationSchedule(1_000_000, 8.5, 240);
    const buckets = aggregateByYear(result.schedule);
    expect(buckets).toHaveLength(20);
  });

  it("sum of all bucketed principal+interest equals the schedule's totals (real generated schedule)", () => {
    const result = generateAmortizationSchedule(1_000_000, 8.5, 240);
    const buckets = aggregateByYear(result.schedule);
    const totalPrincipal = roundCurrency(buckets.reduce((sum, b) => sum + b.principal, 0));
    const totalInterest = roundCurrency(buckets.reduce((sum, b) => sum + b.interest, 0));
    expect(totalPrincipal).toBeCloseTo(1_000_000, 1);
    expect(totalInterest).toBeCloseTo(result.totalInterestPaid, 1);
  });
});
