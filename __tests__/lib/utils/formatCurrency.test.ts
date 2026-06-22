import { describe, expect, it } from "vitest";
import { formatCurrency, formatCurrencyPrecise, formatNumber } from "@/lib/utils/formatCurrency";

describe("formatCurrency", () => {
  it("formats with Indian lakh grouping, no decimals", () => {
    expect(formatCurrency(2_500_000)).toBe("₹25,00,000");
  });

  it("formats crore-scale values correctly", () => {
    expect(formatCurrency(12_345_678)).toBe("₹1,23,45,678");
  });

  it("formats small values without unnecessary grouping artifacts", () => {
    expect(formatCurrency(999)).toBe("₹999");
  });

  it("rounds to whole rupees (no decimals shown)", () => {
    expect(formatCurrency(8678.74)).toBe("₹8,679");
  });
});

describe("formatCurrencyPrecise", () => {
  it("always shows exactly 2 decimal places", () => {
    expect(formatCurrencyPrecise(8678.7)).toBe("₹8,678.70");
    expect(formatCurrencyPrecise(8678)).toBe("₹8,678.00");
  });
});

describe("formatNumber", () => {
  it("applies Indian digit grouping with no currency symbol", () => {
    expect(formatNumber(2_500_000)).toBe("25,00,000");
  });
});
