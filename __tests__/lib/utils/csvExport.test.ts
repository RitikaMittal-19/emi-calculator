import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { amortizationScheduleToCsv, triggerCsvDownload } from "@/lib/utils/csvExport";
import { generateAmortizationSchedule } from "@/lib/calculations/amortization";
import type { AmortizationRow } from "@/types/amortization";

describe("amortizationScheduleToCsv", () => {
  it("includes the correct header row", () => {
    const csv = amortizationScheduleToCsv([]);
    expect(csv).toBe(
      "Month,Opening Balance,EMI,Principal,Interest,Prepayment,Closing Balance",
    );
  });

  it("formats a single row as raw comma-separated numbers, no currency symbols or grouping", () => {
    const row: AmortizationRow = {
      month: 1,
      openingBalance: 1000000,
      emi: 8678.23,
      principalComponent: 7053.06,
      interestComponent: 1625.17,
      prepayment: 0,
      closingBalance: 992946.94,
    };
    const csv = amortizationScheduleToCsv([row]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("1,1000000,8678.23,7053.06,1625.17,0,992946.94");
  });

  it("uses CRLF line endings between rows", () => {
    const rows: AmortizationRow[] = [
      { month: 1, openingBalance: 100, emi: 50, principalComponent: 40, interestComponent: 10, prepayment: 0, closingBalance: 60 },
      { month: 2, openingBalance: 60, emi: 50, principalComponent: 45, interestComponent: 5, prepayment: 0, closingBalance: 15 },
    ];
    const csv = amortizationScheduleToCsv(rows);
    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n")).toHaveLength(3); // header + 2 rows
  });

  it("produces one data line per schedule row, in order", () => {
    const result = generateAmortizationSchedule(1_000_000, 8.5, 12);
    const csv = amortizationScheduleToCsv(result.schedule);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(13); // header + 12 months
    expect(lines[1].startsWith("1,")).toBe(true);
    expect(lines[12].startsWith("12,")).toBe(true);
  });

  it("returns just the header line for an empty schedule", () => {
    const csv = amortizationScheduleToCsv([]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });

  it("correctly represents a non-zero prepayment value in its own column", () => {
    const result = generateAmortizationSchedule(500_000, 8, 24, [
      { id: "p1", month: 6, amount: 20_000 },
    ]);
    const csv = amortizationScheduleToCsv(result.schedule);
    const month6Line = csv.split("\r\n")[6]; // header + 5 data rows = index 6 is month 6
    const fields = month6Line.split(",");
    expect(fields[0]).toBe("6");
    expect(fields[5]).toBe("20000"); // prepayment column
  });
});

describe("triggerCsvDownload", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn<(url: string) => void>>;
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn<(obj: Blob | MediaSource) => string>(() => "blob:mock-url");
    revokeObjectURLSpy = vi.fn<(url: string) => void>();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;

    clickSpy = vi.fn<() => void>();
    // Intercept anchor click without actually navigating jsdom.
    HTMLAnchorElement.prototype.click = clickSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob object URL and revokes it after triggering the download", () => {
    triggerCsvDownload("a,b,c", "test.csv");

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("creates an anchor with the correct download filename and clicks it", () => {
    triggerCsvDownload("a,b,c", "my-schedule.csv");

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("does not leave the temporary anchor element in the document after the download", () => {
    const initialChildCount = document.body.children.length;
    triggerCsvDownload("a,b,c", "test.csv");
    expect(document.body.children.length).toBe(initialChildCount);
  });

  it("passes a Blob with the correct CSV MIME type to createObjectURL", () => {
    triggerCsvDownload("a,b,c", "test.csv");
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe("text/csv;charset=utf-8;");
  });
});
