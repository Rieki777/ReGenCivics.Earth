/**
 * The currency formatter the server prints progress lines with (build spec
 * 2026-09-25, section 4.2): en-US, whole amounts, in the campaign's currency.
 * A stored code Intl does not know falls back to USD rather than throwing
 * mid-render. Used by the crawler content, the share card and the embed
 * widget; the client has makeCurrencyFormatter (client/src/lib/needDisplay.ts).
 */
export function serverCurrencyFormatter(currency: string | null | undefined): (n: number) => string {
  let fmt: Intl.NumberFormat;
  try {
    fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 });
  } catch {
    fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  return (n: number) => fmt.format(Number.isFinite(n) ? n : 0);
}
