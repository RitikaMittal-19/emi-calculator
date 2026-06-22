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

  it("never contains a space between ₹ and the digits — hydration-safety check", () => {
    // Node.js ships an older ICU that produces "₹25,00,000" (no space).
    // Browsers ship a newer ICU that produces "₹\u00A025,00,000" (non-breaking
    // space). This test verifies normalisation strips it in both cases,
    // so the string is identical whether rendered on the server or client.
    const result = formatCurrency(2_500_000);
    expect(result).not.toContain("\u00A0"); // U+00A0 non-breaking space
    expect(result).not.toContain("\u202F"); // U+202F narrow no-break space
    expect(result[1]).toBe("2"); // ₹ immediately followed by the first digit
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