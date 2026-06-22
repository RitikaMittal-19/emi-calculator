import { describe, expect, it } from "vitest";
import { calculateEmi, calculateEmiResult, roundCurrency } from "@/lib/calculations/emi";

describe("roundCurrency", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundCurrency(1234.5678)).toBe(1234.57);
    expect(roundCurrency(1234.554)).toBe(1234.55);
  });

  it("avoids floating point artifacts", () => {
    // Classic floating point trap: 0.1 + 0.2 = 0.30000000000000004
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});

describe("calculateEmi", () => {
  it("matches an independently verified reference value: 1,000,000 @ 8.5% for 240 months", () => {
    // Verified independently: P=1,000,000, r=0.085/12, n=240 -> EMI = 8678.23
    const emi = calculateEmi(1_000_000, 8.5, 240);
    expect(emi).toBe(8678.23);
  });

  it("matches an independently verified reference value: 500,000 @ 10% for 60 months", () => {
    // Verified independently: P=500,000, r=0.10/12, n=60 -> EMI = 10623.52
    const emi = calculateEmi(500_000, 10, 60);
    expect(emi).toBe(10623.52);
  });

  it("handles the zero-interest edge case as a flat principal/tenure split", () => {
    const emi = calculateEmi(120_000, 0, 12);
    expect(emi).toBe(10_000);
  });

  it("handles a 1-month tenure (entire principal + one month interest due immediately)", () => {
    const principal = 100_000;
    const annualRate = 12;
    const emi = calculateEmi(principal, annualRate, 1);
    // With n=1: EMI = P * r * (1+r) / ((1+r) - 1) = P * (1+r)
    const monthlyRate = annualRate / 12 / 100;
    const expected = roundCurrency(principal * (1 + monthlyRate));
    expect(emi).toBe(expected);
  });

  it("returns a result with exactly 2 decimal places of precision", () => {
    const emi = calculateEmi(837_465, 7.25, 187);
    const decimalPlaces = (emi.toString().split(".")[1] ?? "").length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it("throws RangeError for non-positive principal", () => {
    expect(() => calculateEmi(0, 8, 120)).toThrow(RangeError);
    expect(() => calculateEmi(-100, 8, 120)).toThrow(RangeError);
  });

  it("throws RangeError for non-positive or non-integer tenure", () => {
    expect(() => calculateEmi(100_000, 8, 0)).toThrow(RangeError);
    expect(() => calculateEmi(100_000, 8, -12)).toThrow(RangeError);
    expect(() => calculateEmi(100_000, 8, 12.5)).toThrow(RangeError);
  });

  it("throws RangeError for negative annual rate", () => {
    expect(() => calculateEmi(100_000, -1, 120)).toThrow(RangeError);
  });
});

describe("calculateEmiResult", () => {
  it("computes consistent totalPayable = totalInterest + principal", () => {
    const result = calculateEmiResult(1_000_000, 8.5, 240);
    expect(roundCurrency(result.totalInterest + result.principal)).toBe(
      result.totalPayable,
    );
  });

  it("computes totalPayable as emi * tenureMonths", () => {
    const principal = 500_000;
    const annualRate = 9;
    const tenureMonths = 120;
    const result = calculateEmiResult(principal, annualRate, tenureMonths);
    expect(result.totalPayable).toBe(roundCurrency(result.emi * tenureMonths));
  });

  it("zero-interest loan has zero total interest", () => {
    const result = calculateEmiResult(120_000, 0, 12);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPayable).toBe(120_000);
  });

  it("echoes back the original principal", () => {
    const result = calculateEmiResult(750_000, 7.5, 180);
    expect(result.principal).toBe(750_000);
  });
});
