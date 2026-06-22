import type { AmortizationRow } from "@/types/amortization";

const CSV_HEADERS = [
  "Month",
  "Opening Balance",
  "EMI",
  "Principal",
  "Interest",
  "Prepayment",
  "Closing Balance",
] as const;

/**
 * Escapes a single CSV field per RFC 4180: wraps in double quotes and
 * doubles any internal quotes, but only when the value actually needs it
 * (contains a comma, quote, or newline) — unnecessary quoting is valid CSV
 * but needlessly verbose for what's otherwise an all-numeric export.
 */
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Converts an amortization schedule into a CSV string. Values are emitted
 * as RAW NUMBERS (no currency symbol, no thousands separators) rather than
 * the app's display formatting — this is a deliberate choice: the point of
 * exporting is to let someone open the file in Excel/Sheets and compute
 * further (sum a column, chart it, etc.), and a string like "₹21,696"
 * doesn't parse as a number in spreadsheet software, while "21696" does.
 *
 * Pure string-building, no DOM/browser APIs — kept separate from
 * triggerCsvDownload so the formatting logic is trivially unit-testable
 * without jsdom or a real browser download.
 */
export function amortizationScheduleToCsv(schedule: AmortizationRow[]): string {
  const headerLine = CSV_HEADERS.join(",");
  const dataLines = schedule.map((row) =>
    [
      row.month,
      row.openingBalance,
      row.emi,
      row.principalComponent,
      row.interestComponent,
      row.prepayment,
      row.closingBalance,
    ]
      .map((value) => escapeCsvField(String(value)))
      .join(","),
  );
  // CRLF line endings: the more broadly compatible choice for CSV,
  // particularly for older/Windows spreadsheet software.
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Triggers a browser download of the given CSV content. Uses the
 * Blob + object URL + temporary-anchor-click pattern — the standard
 * no-backend way to let the browser save a file, consistent with the
 * project's "no backend" constraint.
 *
 * Prefixes a UTF-8 BOM so Excel (particularly on Windows) correctly
 * detects the encoding rather than mis-rendering any non-ASCII
 * characters as mojibake — harmless for ASCII-only content like this
 * export, but a defensive habit worth having for any future CSV export
 * that might include the ₹ symbol or scenario labels.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
