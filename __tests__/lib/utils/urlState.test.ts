import { describe, expect, it } from "vitest";
import {
  buildShareableUrl,
  encodeShareableState,
  parseShareableState,
} from "@/lib/utils/urlState";
import type { Prepayment } from "@/types/prepayment";

describe("encodeShareableState", () => {
  it("encodes principal, rate, and tenure as query params", () => {
    const params = encodeShareableState(
      { principal: 2_500_000, annualRate: 8.5, tenureMonths: 240 },
      [],
    );
    expect(params.get("p")).toBe("2500000");
    expect(params.get("r")).toBe("8.5");
    expect(params.get("t")).toBe("240");
  });

  it("omits the prepayments param entirely when there are none", () => {
    const params = encodeShareableState(
      { principal: 500_000, annualRate: 8, tenureMonths: 60 },
      [],
    );
    expect(params.has("pp")).toBe(false);
  });

  it("encodes a single prepayment as month:amount", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 12, amount: 50_000 }];
    const params = encodeShareableState(
      { principal: 500_000, annualRate: 8, tenureMonths: 60 },
      prepayments,
    );
    expect(params.get("pp")).toBe("12:50000");
  });

  it("encodes multiple prepayments comma-separated", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 12, amount: 50_000 },
      { id: "2", month: 24, amount: 30_000 },
    ];
    const params = encodeShareableState(
      { principal: 500_000, annualRate: 8, tenureMonths: 60 },
      prepayments,
    );
    expect(params.get("pp")).toBe("12:50000,24:30000");
  });
});

describe("parseShareableState", () => {
  it("round-trips a loan with no prepayments correctly", () => {
    const params = encodeShareableState(
      { principal: 2_500_000, annualRate: 8.5, tenureMonths: 240 },
      [],
    );
    const result = parseShareableState(params);
    expect(result).not.toBeNull();
    expect(result!.loan).toEqual({
      principal: 2_500_000,
      annualRate: 8.5,
      tenureMonths: 240,
    });
    expect(result!.prepayments).toEqual([]);
  });

  it("round-trips a loan WITH prepayments correctly", () => {
    const prepayments: Prepayment[] = [
      { id: "1", month: 12, amount: 50_000 },
      { id: "2", month: 24, amount: 30_000 },
    ];
    const params = encodeShareableState(
      { principal: 500_000, annualRate: 8, tenureMonths: 60 },
      prepayments,
    );
    const result = parseShareableState(params);
    expect(result!.prepayments).toHaveLength(2);
    expect(result!.prepayments[0]).toMatchObject({ month: 12, amount: 50_000 });
    expect(result!.prepayments[1]).toMatchObject({ month: 24, amount: 30_000 });
  });

  it("returns null when the principal param is missing entirely", () => {
    const params = new URLSearchParams("r=8.5&t=240");
    expect(parseShareableState(params)).toBeNull();
  });

  it("returns null when the rate param is missing entirely", () => {
    const params = new URLSearchParams("p=2500000&t=240");
    expect(parseShareableState(params)).toBeNull();
  });

  it("returns null when the tenure param is missing entirely", () => {
    const params = new URLSearchParams("p=2500000&r=8.5");
    expect(parseShareableState(params)).toBeNull();
  });

  it("returns null for a non-numeric principal", () => {
    const params = new URLSearchParams("p=not-a-number&r=8.5&t=240");
    expect(parseShareableState(params)).toBeNull();
  });

  it("returns null for a zero or negative principal", () => {
    expect(parseShareableState(new URLSearchParams("p=0&r=8.5&t=240"))).toBeNull();
    expect(parseShareableState(new URLSearchParams("p=-100&r=8.5&t=240"))).toBeNull();
  });

  it("returns null for a negative rate", () => {
    const params = new URLSearchParams("p=500000&r=-1&t=60");
    expect(parseShareableState(params)).toBeNull();
  });

  it("accepts a zero rate (valid — zero-interest loans are legitimate per the calc engine)", () => {
    const params = new URLSearchParams("p=500000&r=0&t=60");
    const result = parseShareableState(params);
    expect(result).not.toBeNull();
    expect(result!.loan.annualRate).toBe(0);
  });

  it("returns null for a zero or negative tenure", () => {
    expect(parseShareableState(new URLSearchParams("p=500000&r=8&t=0"))).toBeNull();
    expect(parseShareableState(new URLSearchParams("p=500000&r=8&t=-12"))).toBeNull();
  });

  it("skips one malformed prepayment entry but keeps the valid loan and other valid entries", () => {
    // "garbage" doesn't parse as month:amount; the other two entries do.
    const params = new URLSearchParams("p=500000&r=8&t=60&pp=12:50000,garbage,24:30000");
    const result = parseShareableState(params);
    expect(result).not.toBeNull();
    expect(result!.prepayments).toHaveLength(2);
    expect(result!.prepayments.map((p) => p.month)).toEqual([12, 24]);
  });

  it("skips a prepayment entry with a negative or zero amount", () => {
    const params = new URLSearchParams("p=500000&r=8&t=60&pp=12:0,24:30000");
    const result = parseShareableState(params);
    expect(result!.prepayments).toHaveLength(1);
    expect(result!.prepayments[0].month).toBe(24);
  });

  it("treats an empty prepayments param as no prepayments, not an error", () => {
    const params = new URLSearchParams("p=500000&r=8&t=60&pp=");
    const result = parseShareableState(params);
    expect(result!.prepayments).toEqual([]);
  });
});

describe("buildShareableUrl", () => {
  it("produces a URL with the base, a '?', and the encoded params", () => {
    const url = buildShareableUrl(
      "https://example.com/",
      { principal: 500_000, annualRate: 8, tenureMonths: 60 },
      [],
    );
    expect(url).toBe("https://example.com/?p=500000&r=8&t=60");
  });

  it("a URL built by buildShareableUrl parses back to the original state", () => {
    const prepayments: Prepayment[] = [{ id: "1", month: 6, amount: 10_000 }];
    const url = buildShareableUrl(
      "https://example.com/",
      { principal: 1_200_000, annualRate: 7.25, tenureMonths: 180 },
      prepayments,
    );
    const queryString = url.split("?")[1];
    const result = parseShareableState(new URLSearchParams(queryString));
    expect(result!.loan).toEqual({
      principal: 1_200_000,
      annualRate: 7.25,
      tenureMonths: 180,
    });
    expect(result!.prepayments[0]).toMatchObject({ month: 6, amount: 10_000 });
  });
});
