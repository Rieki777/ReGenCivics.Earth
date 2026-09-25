/**
 * The server's currency formatter (server/lib/currency-format.ts) prints what
 * the project page prints (client/src/lib/needDisplay.ts
 * makeCurrencyFormatter), including for codes Intl does not know.
 */
import { describe, expect, it } from "vitest";
import { serverCurrencyFormatter } from "./lib/currency-format";
import { makeCurrencyFormatter } from "../client/src/lib/needDisplay";
import { computeCampaignProgress, progressLines } from "../shared/campaignProgress";

describe("serverCurrencyFormatter", () => {
  it("prints known currencies with their symbol, whole amounts", () => {
    expect(serverCurrencyFormatter("USD")(5000)).toBe("$5,000");
    expect(serverCurrencyFormatter("EUR")(5000.4)).toBe("€5,000");
    expect(serverCurrencyFormatter(null)(12)).toBe("$12");
  });

  it("prints a code Intl does not know as the amount and the code, never as dollars", () => {
    for (const code of ["SEEDS", "USDC", "USDT"]) {
      const out = serverCurrencyFormatter(code)(5000);
      expect(out).toBe(`5,000 ${code}`);
      expect(out).not.toContain("$");
    }
  });

  it("matches the project page for every currency the wizard offers", () => {
    for (const code of ["USD", "EUR", "GBP", "CHF", "SEEDS", "USDC", "USDT", "DAI", "BTC", "ETH"]) {
      expect(serverCurrencyFormatter(code)(1234567)).toBe(makeCurrencyFormatter(code)(1234567));
    }
  });

  it("leaves off a stored code that is not a plain short code", () => {
    expect(serverCurrencyFormatter("<b>x</b>")(10)).toBe("10");
    expect(serverCurrencyFormatter("NOT A CODE")(10)).toBe("10");
  });

  it("a SEEDS campaign's money line reads in SEEDS on server surfaces", () => {
    const p = computeCampaignProgress({
      campaign: { status: "active", isDemo: 0, financialTarget: 5000, currency: "SEEDS", startedAt: null, durationDays: 90 },
      items: [], rows: [], lends: [], routes: [],
    });
    expect(progressLines(p, serverCurrencyFormatter("SEEDS")).money).toBe("Money: 0 SEEDS of 5,000 SEEDS");
  });
});
