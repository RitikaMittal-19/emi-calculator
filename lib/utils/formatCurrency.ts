/**
 * Formats a number as Indian Rupees using the en-IN locale, which gives the
 * correct lakh/crore digit grouping (e.g. 25,00,000 not 2,500,000).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Same as formatCurrency but always shows 2 decimal places — used for per-row table figures where paisa precision matters. */
export function formatCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats a plain number with en-IN digit grouping, no currency symbol (e.g. for month counts). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
