import { describe, expect, it } from "vitest";
import { generateSensitivityMatrix } from "@/lib/calculations/sensitivity";
import { calculateEmi } from "@/lib/calculations/emi";

describe("generateSensitivityMatrix", () => {
  const principal = 1_000_000;
  const annualRate = 8.5;
  const tenureMonths = 240;

  it("produces a 7x7 grid (7 rate deltas x 7 tenure deltas = 49 cells)", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    expect(matrix.cells).toHaveLength(49);
    expect(matrix.rateDeltas).toHaveLength(7);
    expect(matrix.tenureDeltas).toHaveLength(7);
  });

  it("includes all expected rate deltas: -3,-2,-1,0,1,2,3", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    expect([...matrix.rateDeltas].sort((a, b) => a - b)).toEqual([
      -3, -2, -1, 0, 1, 2, 3,
    ]);
  });

  it("includes all expected tenure deltas: -24,-12,-6,0,6,12,24", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    expect([...matrix.tenureDeltas].sort((a, b) => a - b)).toEqual([
      -24, -12, -6, 0, 6, 12, 24,
    ]);
  });

  it("marks exactly one cell as the current selection (delta 0,0)", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    const current = matrix.cells.filter((c) => c.isCurrentSelection);
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ rateDelta: 0, tenureDelta: 0 });
  });

  it("the current-selection cell's EMI matches calculateEmi for the base inputs exactly", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    const current = matrix.cells.find((c) => c.isCurrentSelection)!;
    expect(current.emi).toBe(calculateEmi(principal, annualRate, tenureMonths));
    expect(current.effectiveRate).toBe(annualRate);
    expect(current.effectiveTenureMonths).toBe(tenureMonths);
  });

  it("computes correct effective rate and tenure for a non-zero delta cell", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    const cell = matrix.cells.find(
      (c) => c.rateDelta === 2 && c.tenureDelta === -12,
    )!;
    expect(cell.effectiveRate).toBe(10.5);
    expect(cell.effectiveTenureMonths).toBe(228);
    expect(cell.emi).toBe(calculateEmi(principal, 10.5, 228));
  });

  it("clamps effective rate to 0 when a negative delta would push it below zero", () => {
    // Base rate 2%, delta -3% would be -1% -> clamp to 0%.
    const matrix = generateSensitivityMatrix(principal, 2, tenureMonths);
    const cell = matrix.cells.find(
      (c) => c.rateDelta === -3 && c.tenureDelta === 0,
    )!;
    expect(cell.effectiveRate).toBe(0);
    // EMI at 0% should be a flat principal/tenure split, not throw.
    expect(cell.emi).toBe(calculateEmi(principal, 0, tenureMonths));
  });

  it("clamps effective tenure to 1 month when a negative delta would push it to <= 0", () => {
    // Base tenure 12 months, delta -24 would be -12 -> clamp to 1 month.
    const matrix = generateSensitivityMatrix(principal, annualRate, 12);
    const cell = matrix.cells.find(
      (c) => c.tenureDelta === -24 && c.rateDelta === 0,
    )!;
    expect(cell.effectiveTenureMonths).toBe(1);
  });

  it("never produces a NaN or non-finite EMI across the full grid, even at clamped extremes", () => {
    const matrix = generateSensitivityMatrix(principal, 1, 3);
    expect(
      matrix.cells.every((c) => Number.isFinite(c.emi) && c.emi > 0),
    ).toBe(true);
  });

  it("higher rate deltas produce higher EMI for a fixed tenure delta", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    const atTenureZero = matrix.cells
      .filter((c) => c.tenureDelta === 0)
      .sort((a, b) => a.rateDelta - b.rateDelta);
    for (let i = 1; i < atTenureZero.length; i++) {
      expect(atTenureZero[i].emi).toBeGreaterThan(atTenureZero[i - 1].emi);
    }
  });

  it("longer tenure deltas produce lower EMI for a fixed rate delta", () => {
    const matrix = generateSensitivityMatrix(principal, annualRate, tenureMonths);
    const atRateZero = matrix.cells
      .filter((c) => c.rateDelta === 0)
      .sort((a, b) => a.tenureDelta - b.tenureDelta);
    for (let i = 1; i < atRateZero.length; i++) {
      expect(atRateZero[i].emi).toBeLessThan(atRateZero[i - 1].emi);
    }
  });
});
