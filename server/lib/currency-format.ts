/**
 * The currency formatter the server prints progress lines with (build spec
 * 2026-09-25, section 4.2): en-US, whole amounts, in the campaign's currency.
 * Used by the crawler content, the share card and the embed widget; the
 * client has makeCurrencyFormatter (client/src/lib/needDisplay.ts), and the
 * two print the same thing.
 *
 * The wizard offers codes Intl does not know (SEEDS, USDC, USDT). Those read
 * as a plain amount with the code after it, "5,000 SEEDS", the way the
 * project page prints them. Falling back to USD printed "$5,000" for a
 * campaign that asks for 5,000 SEEDS. A stored code that is not a plain
 * short code is left off, so nothing odd reaches a page.
 */
export function serverCurrencyFormatter(currency: string | null | undefined): (n: number) => string {
  const code = (currency || "USD").trim() || "USD";
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  try {
    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 });
    return (n: number) => fmt.format(safe(n));
  } catch {
    const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    const label = /^[A-Za-z0-9]{2,10}$/.test(code) ? ` ${code.toUpperCase()}` : "";
    return (n: number) => `${plain.format(safe(n))}${label}`;
  }
}
