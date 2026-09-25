import { describe, expect, it } from "vitest";
import {
  buildCampaignTimeline,
  campaignEndsAt,
  computeCampaignProgress,
  formatCloseDate,
  moneyShareNote,
  moneySharePct,
  needStatus,
  offeredLine,
  progressBars,
  progressLines,
  shareLine,
  suggestedMoneyAsk,
  summarizeProgress,
  type ProgressCampaign,
  type ProgressItem,
  type ProgressLend,
  type ProgressRoute,
  type ProgressRow,
} from "./campaignProgress";
import { CAPITAL_TYPES } from "./capitals";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmt = (n: number) => usd.format(n);

const campaign = (over: Partial<ProgressCampaign> = {}): ProgressCampaign => ({
  status: "active",
  isDemo: 0,
  financialTarget: 20000,
  currency: "USD",
  startedAt: "2026-09-01T00:00:00.000Z",
  publishedAt: "2026-09-01T00:00:00.000Z",
  durationDays: 90,
  ...over,
});

const ROLE: ProgressItem = {
  id: 1, kind: "role", capacityUnit: "hours_per_week", capitalType: "experiential",
  roleTitle: "Farm manager", quantityWanted: 40, estimatedValue: 8000,
};
const TRACTOR: ProgressItem = {
  id: 2, kind: "item", capitalType: "material", equipmentName: "Tractor",
  quantityWanted: 1, estimatedValue: 30000, acceptsGift: 1, acceptsLoan: 1,
};
const SHIFT: ProgressItem = {
  id: 3, kind: "shift", capitalType: "social", roleTitle: "Planting day", quantityWanted: 10, estimatedValue: 2000,
};
const WORKSHOP: ProgressItem = {
  id: 4, kind: "knowledge", capitalType: "intellectual", resourceName: "Soil workshop", quantityWanted: 1, estimatedValue: 1000,
};
const CRYPTO: ProgressItem = { id: 5, kind: "crypto", capitalType: "financial", resourceName: "USDC", quantityWanted: 1, estimatedValue: 5000 };
const LINK: ProgressItem = { id: 6, kind: "financial_link", capitalType: "financial", resourceName: "Funder", quantityWanted: 1, estimatedValue: 7000 };
const ITEMS = [ROLE, TRACTOR, SHIFT, WORKSHOP, CRYPTO, LINK];

function row(itemId: number | null, status: string, quantity: number, value: number, over: Partial<ProgressRow> = {}): ProgressRow {
  return {
    campaignItemId: itemId, status, contributionType: "resource", offerMode: null,
    quantity, value, financialValue: value, count: 1, ...over,
  };
}

function route(partner: ProgressRoute["partner"], cachedRaised: number, over: Partial<ProgressRoute> = {}): ProgressRoute {
  return { partner, status: "verified", cachedRaised, cachedCurrency: "USD", lastFetchedAt: null, ...over };
}

function compute(opts: {
  campaign?: Partial<ProgressCampaign>;
  items?: ProgressItem[];
  rows?: ProgressRow[];
  lends?: ProgressLend[];
  routes?: ProgressRoute[];
} = {}) {
  return computeCampaignProgress({
    campaign: campaign(opts.campaign),
    items: opts.items ?? ITEMS,
    rows: opts.rows ?? [],
    lends: opts.lends ?? [],
    routes: opts.routes ?? [],
  });
}

/** Every need filled: 40 role hours, the tractor, 10 shift places, the workshop. */
const ALL_FILLED: ProgressRow[] = [
  row(1, "accepted", 40, 8000, { contributionType: "role" }),
  row(2, "fulfilled", 1, 30000, { contributionType: "equipment" }),
  row(3, "accepted", 10, 2000, { count: 10 }),
  row(4, "thanked", 1, 1000, { contributionType: "knowledge" }),
];

describe("the in-kind half", () => {
  it("leaves money kinds out of the in-kind ask and puts crypto needs on the money side", () => {
    const p = compute();
    expect(p.inKind.ask).toBe(41000);
    expect(p.inKind.needsTotal).toBe(4);
    expect(p.money.ask).toBe(25000); // 20,000 target plus the 5,000 crypto need
    expect(p.byNeed[5]).toBeUndefined();
    expect(p.byNeed[6]).toBeUndefined();
    expect(p.open).toEqual({ count: 4, roles: 1, things: 1, shifts: 1, sessions: 1 });
  });

  it("caps an open need's confirmed value at its value times the share confirmed", () => {
    // 5 of 10 places on a 2,000 need count at most 1,000, whatever the rows say.
    const p = compute({ rows: [row(3, "accepted", 5, 7500, { count: 5 })] });
    expect(p.byNeed[3]).toMatchObject({ confirmed: 5, open: 5, filled: false, confirmedValue: 1000 });
    expect(p.inKind.confirmed).toBe(1000);
  });

  it("a legacy row that states a need's full value cannot bring the half to 100% while the need is open", () => {
    // Before the server copied the need's value, a contributor's own figure
    // was stored: 1 of 3 places, stated at the whole 300.
    const three = { ...SHIFT, quantityWanted: 3, estimatedValue: 300 };
    const p = compute({ items: [three], rows: [row(3, "accepted", 1, 300)] });
    expect(p.byNeed[3]).toMatchObject({ filled: false, confirmedValue: 100 });
    expect(p.inKind).toMatchObject({ ask: 300, confirmed: 100, needsMet: 0, landed: false });
    expect(p.inKind.pct).toBeLessThan(100);
    expect(progressLines(p, fmt).inKind).toBe("In-kind: 0 of 1 needs met ($100 of $300 confirmed)");
  });

  it("a need listed at no value keeps the half open, and the bar stops short of full", () => {
    // The half lands when every in-kind need is filled. A need at 0 adds
    // nothing to the ask, so confirmed value can equal the ask while it is
    // open; the bar then never reads 100 and nothing says the half landed.
    const tractor = { ...TRACTOR, estimatedValue: 1000 };
    const cook = { ...ROLE, capacityUnit: "count", quantityWanted: 1, estimatedValue: 0 };
    const p = compute({
      campaign: { financialTarget: 0 },
      items: [tractor, cook],
      rows: [row(2, "accepted", 1, 1000, { contributionType: "equipment" })],
    });
    expect(p.inKind).toMatchObject({ ask: 1000, confirmed: 1000, needsMet: 1, needsTotal: 2, landed: false });
    expect(p.inKind.pct).toBeLessThan(100);
    expect(progressBars(p, fmt).inKind.now).toBe(99);
    expect(p.state).toBe("open");
    expect(progressLines(p, fmt).halves).toBeNull();
    // Once the role is filled the half lands and the bar is full.
    const filled = compute({
      campaign: { financialTarget: 0 },
      items: [tractor, cook],
      rows: [row(2, "accepted", 1, 1000, { contributionType: "equipment" }), row(1, "accepted", 1, 0, { contributionType: "role" })],
    });
    expect(filled.inKind).toMatchObject({ landed: true, pct: 100 });
    expect(filled.state).toBe("both_landed");
  });

  it("counts a filled need in full even when its rows round short", () => {
    const three = { ...SHIFT, quantityWanted: 3, estimatedValue: 1000 };
    const p = compute({ items: [three], rows: [row(3, "accepted", 3, 999.99, { count: 3 })] });
    expect(p.byNeed[3].filled).toBe(true);
    expect(p.byNeed[3].confirmedValue).toBe(1000);
    expect(p.inKind.landed).toBe(true);
  });

  it("fills an hours need through roleFillState, by hours", () => {
    const part = compute({ rows: [row(1, "accepted", 30, 6000, { contributionType: "role" })] });
    expect(part.byNeed[1]).toMatchObject({ unit: "hours_per_week", confirmed: 30, open: 10, filled: false, confirmedValue: 6000 });
    const full = compute({ rows: [row(1, "accepted", 30, 6000), row(1, "fulfilled", 10, 2000)] });
    expect(full.byNeed[1]).toMatchObject({ confirmed: 40, delivered: 10, filled: true, confirmedValue: 8000, deliveredValue: 2000 });
  });

  it("counts pending offers as offered, never as confirmed", () => {
    const p = compute({ rows: [row(2, "pending", 1, 30000, { contributionType: "equipment" })] });
    expect(p.byNeed[2]).toMatchObject({ offered: 1, offerCount: 1, confirmed: 0, confirmedValue: 0, filled: false });
    expect(p.byNeed[2].status).toEqual({ key: "waiting", text: "Offered, waiting on the stewards" });
    expect(p.inKind.confirmed).toBe(0);
  });

  it("puts freeform standing offers in otherOffers only", () => {
    const p = compute({
      rows: [
        row(null, "accepted", 1, 900, { contributionType: "equipment" }),
        row(null, "pending", 1, 400, { contributionType: "equipment" }),
        row(null, "fulfilled", 1, 250, { contributionType: "knowledge" }),
      ],
    });
    expect(p.inKind.otherOffers).toBe(1150);
    expect(p.inKind.confirmed).toBe(0);
    const byCap = Object.fromEntries(p.byCapital.map((c) => [c.capital, c]));
    expect(byCap.material.otherOffers).toBe(900);
    expect(byCap.intellectual.otherOffers).toBe(250);
    expect(byCap.material.confirmed).toBe(0);
  });

  it("splits gives and lends on a thing need", () => {
    const p = compute({
      rows: [
        row(2, "pending", 1, 30000, { offerMode: "give" }),
        row(2, "pending", 2, 60000, { offerMode: "lend", count: 2 }),
      ],
      lends: [
        { campaignItemId: 2, quantity: 1, availableFrom: "2026-10-01", lendUntil: "2026-12-15" },
        { campaignItemId: 2, quantity: 1, availableFrom: null, lendUntil: "2026-11-30" },
      ],
    });
    expect(p.byNeed[2].gives).toBe(1);
    expect(p.byNeed[2].lends).toEqual([
      { quantity: 1, from: null, until: "2026-11-30" },
      { quantity: 1, from: "2026-10-01", until: "2026-12-15" },
    ]);
  });
});

describe("the money half", () => {
  it("counts verified Ma Earth as given and Steward as lent, and marks the lent part", () => {
    const p = compute({ routes: [route("maearth", 8000), route("gosteward", 4000)] });
    expect(p.money).toMatchObject({ given: 8000, lent: 4000, pledgedHere: 0, raised: 12000, hasRoutes: true, landed: false });
    expect(progressLines(p, fmt).money).toBe("Money: $12,000 of $25,000 through partner routes ($4,000 of it lent)");
  });

  it("shows a route in another currency on its own", () => {
    const p = compute({ routes: [route("maearth", 8000), route("gosteward", 3000, { cachedCurrency: "EUR" })] });
    expect(p.money.raised).toBe(8000);
    expect(p.money.notAdded).toEqual([{ partner: "gosteward", amount: 3000, currency: "EUR" }]);
    expect(progressLines(p, fmt).money).toBe("Money: $8,000 of $25,000 through partner routes");
  });

  it("counts example routes on example campaigns only, in the campaign's currency when they carry none", () => {
    const example = route("maearth", 6000, { status: "example", cachedCurrency: null });
    expect(compute({ campaign: { isDemo: 1 }, routes: [example] }).money.given).toBe(6000);
    const real = compute({ routes: [example] });
    expect(real.money.given).toBe(0);
    expect(real.money.hasRoutes).toBe(false);
  });

  it("adds legacy on-platform money rows and then drops 'through partner routes'", () => {
    const p = compute({
      rows: [row(null, "accepted", 1, 100, { contributionType: "financial", financialValue: 1500 })],
      routes: [route("maearth", 8000)],
    });
    expect(p.money.pledgedHere).toBe(1500);
    expect(p.money.raised).toBe(9500);
    expect(p.inKind.otherOffers).toBe(0);
    expect(progressLines(p, fmt).money).toBe("Money: $9,500 of $25,000");
  });

  it("reads 'This project asks for no money' when the money ask is 0", () => {
    const p = compute({ campaign: { financialTarget: 0 }, items: [ROLE, TRACTOR] });
    expect(p.money.asksNone).toBe(true);
    const lines = progressLines(p, fmt);
    expect(lines.money).toBe("This project asks for no money");
    expect(lines.moneyShort).toBe("This project asks for no money");
    expect(progressBars(p, fmt).money).toBeNull();
  });

  it("shows money over the ask as the ask, at 100 percent", () => {
    const p = compute({ routes: [route("maearth", 40000)] });
    expect(p.money.pct).toBe(100);
    expect(p.money.landed).toBe(true);
    expect(progressLines(p, fmt).money).toBe("Money: $25,000 of $25,000 through partner routes");
  });
});

describe("states and lines", () => {
  it("writes the in-kind, open and delivered lines", () => {
    const p = compute({ rows: [row(2, "fulfilled", 1, 30000), row(4, "accepted", 1, 1000)] });
    const lines = progressLines(p, fmt);
    expect(lines.inKind).toBe("In-kind: 2 of 4 needs met ($31,000 of $41,000 confirmed)");
    expect(lines.inKindShort).toBe("In-kind: 2 of 4 needs met");
    expect(lines.inKindDelivered).toBe("$30,000 of it delivered so far");
    expect(lines.open).toBe("2 needs still open. 1 role, 1 shift.");
    expect(lines.moneyShort).toBe("Money: $0 of $25,000");
    expect(progressLines(compute(), fmt).inKindDelivered).toBeNull();
  });

  it("uses the singular for one, and says when every need is met", () => {
    const one = compute({ rows: ALL_FILLED.filter((r) => r.campaignItemId !== 1) });
    expect(progressLines(one, fmt).open).toBe("1 need still open. 1 role.");
    const many = compute({ items: [ROLE, { ...ROLE, id: 7 }, TRACTOR, { ...TRACTOR, id: 8 }, { ...TRACTOR, id: 9 }, SHIFT, WORKSHOP] });
    expect(progressLines(many, fmt).open).toBe("7 needs still open. 2 roles, 3 things, 1 shift, 1 session.");
    expect(progressLines(compute({ rows: ALL_FILLED }), fmt).open).toBe("Every need is met.");
  });

  it("says when a project lists no in-kind needs", () => {
    const p = compute({ items: [CRYPTO] });
    const lines = progressLines(p, fmt);
    expect(lines.inKind).toBe("This project lists no in-kind needs yet.");
    expect(lines.open).toBeNull();
    expect(p.inKind.landed).toBe(false);
  });

  it("walks the states", () => {
    expect(compute().state).toBe("open");
    const moneyOnly = compute({ routes: [route("maearth", 25000)] });
    expect(moneyOnly.state).toBe("money_landed");
    expect(progressLines(moneyOnly, fmt).halves).toBe("Money half landed. The in-kind half still has 4 needs open.");
    const moneyOneLeft = compute({ routes: [route("maearth", 25000)], rows: ALL_FILLED.filter((r) => r.campaignItemId !== 3) });
    expect(progressLines(moneyOneLeft, fmt).halves).toBe("Money half landed. The in-kind half still has 1 need open.");
    const inKindOnly = compute({ rows: ALL_FILLED, routes: [route("maearth", 10000)] });
    expect(inKindOnly.state).toBe("in_kind_landed");
    expect(progressLines(inKindOnly, fmt).halves).toBe("In-kind half landed. The money half still needs $15,000.");
    const both = compute({ rows: ALL_FILLED, routes: [route("maearth", 25000)] });
    expect(both.state).toBe("both_landed");
    expect(progressLines(both, fmt).halves).toBe("Both halves have landed.");
    const bothNoMoney = compute({ campaign: { financialTarget: 0 }, items: [ROLE, TRACTOR, SHIFT, WORKSHOP], rows: ALL_FILLED });
    expect(bothNoMoney.state).toBe("both_landed");
    expect(progressLines(bothNoMoney, fmt).halves).toBe("Every need is confirmed.");
    expect(progressLines(compute(), fmt).halves).toBeNull();
    for (const s of ["draft", "pending_review", "rejected"]) expect(compute({ campaign: { status: s } }).state).toBe("draft");
    expect(compute({ campaign: { status: "completed" } }).state).toBe("complete");
    expect(compute({ campaign: { status: "funded" } }).state).toBe("complete");
    expect(compute({ campaign: { status: "cancelled" } }).state).toBe("cancelled");
  });

  it("calls a campaign almost complete only when both halves are near", () => {
    const near = compute({
      rows: [row(2, "accepted", 1, 30000), row(1, "accepted", 30, 6000)],
      routes: [route("maearth", 22000)],
    });
    expect(near.inKind.pct).toBeGreaterThanOrEqual(85);
    expect(near.money.pct).toBeGreaterThanOrEqual(85);
    expect(near.almostComplete).toBe(true);
    expect(progressLines(near, fmt).stateTag).toBe("Almost complete");
    const moneyFar = compute({ rows: [row(2, "accepted", 1, 30000), row(1, "accepted", 30, 6000)] });
    expect(moneyFar.almostComplete).toBe(false);
    expect(progressLines(moneyFar, fmt).stateTag).toBe("Open for offers");
  });

  it("writes the completion line, the close line and the state tag", () => {
    const live = progressLines(compute(), fmt);
    expect(live.completion).toBe("Complete means the money half and the in-kind half both land by 30 November 2026.");
    expect(live.closes).toBe("Closes 30 November 2026");
    const noMoney = progressLines(compute({ campaign: { financialTarget: 0 }, items: [ROLE] }), fmt);
    expect(noMoney.completion).toBe("Complete means every need is confirmed by 30 November 2026.");
    const notLive = progressLines(compute({ campaign: { status: "pending_review", startedAt: null, publishedAt: null } }), fmt);
    expect(notLive.completion).toBe("Complete means the money half and the in-kind half both land by the close date.");
    expect(notLive.closes).toBeNull();
    expect(notLive.stateTag).toBe("Not live yet");
    const notLiveNoMoney = progressLines(
      compute({ campaign: { status: "draft", startedAt: null, publishedAt: null, financialTarget: 0 }, items: [ROLE] }),
      fmt,
    );
    expect(notLiveNoMoney.completion).toBe("Complete means every need is confirmed by the close date.");
    const example = progressLines(compute({ campaign: { isDemo: 1 } }), fmt);
    expect(example.completion).toBe(
      "On a real campaign, complete means the money half and the in-kind half both land by its close date.",
    );
    expect(example.closes).toBeNull();
    expect(example.stateTag).toBe("Example");
    const done = progressLines(compute({ campaign: { status: "completed" } }), fmt);
    expect(done.completion).toBe("This campaign is complete.");
    expect(done.closes).toBeNull();
    expect(done.stateTag).toBe("Complete");
    const cancelled = progressLines(compute({ campaign: { status: "cancelled" } }), fmt);
    expect(cancelled.completion).toBeNull();
    expect(cancelled.stateTag).toBe("Cancelled");
  });

  it("says complete before the close only inside the completion rule", () => {
    const live = progressLines(compute({ rows: ALL_FILLED, routes: [route("maearth", 25000)] }), fmt);
    for (const [key, text] of Object.entries(live)) {
      if (key === "completion" || key === "stateTag" || text == null) continue;
      expect(text, key).not.toMatch(/\bcomplete\b/i);
    }
  });
});

describe("the nine forms of capital", () => {
  it("has nine rows in order whose figures add up to the headline", () => {
    const p = compute({
      rows: [...ALL_FILLED.slice(0, 2), row(null, "accepted", 1, 500, { contributionType: "land" })],
      routes: [route("maearth", 30000)],
    });
    expect(p.byCapital.map((c) => c.capital)).toEqual([...CAPITAL_TYPES]);
    const sum = (k: "asked" | "confirmed" | "otherOffers") => p.byCapital.reduce((s, c) => s + c[k], 0);
    expect(sum("asked")).toBeCloseTo(p.inKind.ask + p.money.ask, 2);
    expect(sum("confirmed")).toBeCloseTo(p.inKind.confirmed + Math.min(p.money.raised, p.money.ask), 2);
    expect(sum("otherOffers")).toBeCloseTo(p.inKind.otherOffers, 2);
    const financial = p.byCapital.find((c) => c.capital === "financial")!;
    expect(financial.asked).toBe(25000);
    expect(financial.confirmed).toBe(25000);
    expect(p.byCapital.find((c) => c.capital === "living")!.otherOffers).toBe(500);
    expect(p.byCapital.find((c) => c.capital === "material")!.needIds).toEqual([2]);
  });
});

describe("needStatus and offeredLine", () => {
  const base = { unit: "count" as const, wanted: 4, offered: 0, offerCount: 0, filled: false };
  it("names the four states, and hours on an hours need", () => {
    expect(needStatus({ ...base, filled: true })).toEqual({ key: "filled", text: "Filled" });
    expect(needStatus(base)).toEqual({ key: "none", text: "No one has offered yet" });
    expect(needStatus({ ...base, offered: 4, offerCount: 2 })).toEqual({ key: "waiting", text: "Offered, waiting on the stewards" });
    expect(needStatus({ ...base, offered: 1, offerCount: 1 })).toEqual({ key: "partly", text: "1 of 4 offered" });
    expect(needStatus({ ...base, unit: "hours_per_week", wanted: 40, offered: 10, offerCount: 1 }))
      .toEqual({ key: "partly", text: "10 of 40 hours a week offered" });
  });

  it("writes what is already offered on a thing", () => {
    const today = "2026-09-25";
    expect(offeredLine({ gives: 0, lends: [] }, today)).toBeNull();
    expect(offeredLine({ gives: 2, lends: [] }, today)).toBe("Offered so far: 2 to give.");
    expect(offeredLine({
      gives: 1,
      lends: [
        { quantity: 1, from: "2026-04-01", until: "2026-06-30" },
        { quantity: 2, from: null, until: "2027-06-30" },
        { quantity: 1, from: "2026-10-01", until: "2026-10-31" },
        { quantity: 1, from: "2026-11-01", until: "2026-11-30" },
      ],
    }, today)).toBe("Offered so far: 1 to give. 1 to lend, 1 Apr to 30 Jun. 2 to lend, until 30 Jun 2027. 1 to lend, 1 Oct to 31 Oct.");
  });
});

describe("the money share note", () => {
  const band = { softMinPct: 10, softMaxPct: 30 };
  it("reads inside the band, outside it, and at no money", () => {
    expect(moneySharePct(80000, 20000)).toBe(20);
    expect(moneySharePct(0, 0)).toBe(0);
    expect(moneyShareNote({ inKindAsk: 80000, moneyAsk: 20000, asksNone: false, band }))
      .toEqual({ line: "Money is 20% of the whole ask.", outside: false });
    expect(moneyShareNote({ inKindAsk: 58000, moneyAsk: 42000, asksNone: false, band })).toEqual({
      line: "Money is 42% of the whole ask. Most campaigns ask for 10 to 30 percent. You can send it as it is.",
      outside: true,
    });
    expect(moneyShareNote({ inKindAsk: 95000, moneyAsk: 5000, asksNone: false, band }).outside).toBe(true);
    expect(moneyShareNote({ inKindAsk: 80000, moneyAsk: 0, asksNone: true, band }))
      .toEqual({ line: "This project asks for no money.", outside: false });
    expect(moneyShareNote({ inKindAsk: 0, moneyAsk: 0, asksNone: false, band })).toEqual({ line: null, outside: false });
  });

  it("suggests a money ask for a share", () => {
    expect(suggestedMoneyAsk(80000, 20)).toBe(20000);
    expect(suggestedMoneyAsk(80000, 0)).toBe(0);
    expect(suggestedMoneyAsk(80000, 100)).toBe(0);
  });
});

describe("dates", () => {
  it("ends a campaign at its start plus its days, and not before it goes live", () => {
    expect(campaignEndsAt(campaign())!.toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(campaignEndsAt(campaign({ startedAt: null, publishedAt: "2026-10-01T00:00:00.000Z", durationDays: 30 }))!.toISOString())
      .toBe("2026-10-31T00:00:00.000Z");
    expect(campaignEndsAt(campaign({ startedAt: null, publishedAt: null }))).toBeNull();
    expect(formatCloseDate(new Date("2027-03-14T23:30:00.000Z"))).toBe("14 March 2027");
  });
});

describe("bars, summary, share line and timeline", () => {
  it("gives each bar the visible line as its aria text", () => {
    const p = compute({ rows: [row(2, "fulfilled", 1, 30000)], routes: [route("maearth", 8000), route("gosteward", 4000)] });
    const lines = progressLines(p, fmt);
    const full = progressBars(p, fmt, "full");
    expect(full.inKind.text).toBe(lines.inKind);
    expect(full.money!.text).toBe(lines.money);
    expect(full.inKind.now).toBe(Math.floor(p.inKind.pct));
    expect(full.money!.givenPct + full.money!.lentPct).toBeCloseTo(p.money.pct, 1);
    const compact = progressBars(p, fmt, "compact");
    expect(compact.inKind.text).toBe(lines.inKindShort);
    expect(compact.money!.text).toBe(lines.moneyShort);
  });

  it("summarizes without per-need detail and names the least covered needs first", () => {
    const p = compute({ rows: [row(1, "pending", 20, 4000), row(3, "pending", 2, 400), row(2, "accepted", 1, 30000)] });
    const s = summarizeProgress(p, ITEMS, "2026-09-25");
    expect(s).not.toHaveProperty("byNeed");
    expect(s).not.toHaveProperty("byCapital");
    // The workshop has no offers, then the shift (2 of 10), then the role (20 of 40). The tractor is filled.
    expect(s.topOpen).toEqual([
      { id: 4, line: "Soil workshop" },
      { id: 3, line: "Planting day, 10 places" },
      { id: 1, line: "Farm manager, 40 hrs a week" },
    ]);
    expect(progressLines(s, fmt).inKind).toBe(progressLines(p, fmt).inKind);
  });

  it("writes a share line", () => {
    expect(shareLine("Harmony Valley", compute())).toBe(
      "Harmony Valley is crowdpooling on ReGen Civics. 4 needs still open. 1 role, 1 thing, 1 shift, 1 session.",
    );
    expect(shareLine("Harmony Valley", compute({ campaign: { isDemo: 1 } }))).toBe("Harmony Valley is an example campaign on ReGen Civics.");
  });

  it("builds one timeline, newest first, with the close date ahead on top", () => {
    const p = compute();
    const entries = buildCampaignTimeline({
      campaign: { status: "active", isDemo: 0, startedAt: "2026-09-01T00:00:00.000Z" },
      progress: p,
      activity: [
        { id: 11, kind: "pledged", contributorName: "Ana", title: "Farm manager", contributionType: "role", at: "2026-09-05T00:00:00.000Z" },
        { id: 12, kind: "pledged", contributorName: "A contributor", title: "Tractor", contributionType: "equipment", at: "2026-09-06T00:00:00.000Z" },
        { id: 13, kind: "delivered", contributorName: "Ben", title: "Seed", contributionType: "resource", at: "2026-09-07T00:00:00.000Z" },
        { id: 14, kind: "thanked", contributorName: "Cy", title: "Soil workshop", contributionType: "knowledge", at: "2026-09-08T00:00:00.000Z" },
      ],
      updates: [{ id: 21, updateNumber: 1, title: "Ground broken", body: "We started.", publishedAt: "2026-09-04T00:00:00.000Z" }],
      now: new Date("2026-09-25T00:00:00.000Z"),
    });
    expect(entries.map((e) => e.text)).toEqual([
      "Closes 30 November 2026",
      "Cy was thanked for Soil workshop",
      "Ben delivered Seed",
      "A contributor is bringing Tractor",
      "Ana took on Farm manager",
      "Update 1: Ground broken",
      "Campaign opened",
    ]);
    expect(entries[0].upcoming).toBe(true);
    expect(entries.find((e) => e.kind === "update")!.body).toBe("We started.");
  });

  it("shows no close date on examples, and marks the end of a closed campaign", () => {
    const example = buildCampaignTimeline({
      campaign: { status: "active", isDemo: 1, startedAt: "2026-09-01T00:00:00.000Z" },
      progress: compute({ campaign: { isDemo: 1 } }),
      activity: [],
      updates: [],
      now: new Date("2026-09-25T00:00:00.000Z"),
    });
    expect(example.map((e) => e.text)).toEqual(["Campaign opened"]);
    const done = buildCampaignTimeline({
      campaign: { status: "completed", isDemo: 0, startedAt: "2026-09-01T00:00:00.000Z", completedAt: "2026-12-01T00:00:00.000Z" },
      progress: compute({ campaign: { status: "completed" } }),
      activity: [],
      updates: [],
    });
    expect(done.map((e) => e.text)).toEqual(["Campaign complete", "Campaign opened"]);
    const cancelled = buildCampaignTimeline({
      campaign: { status: "cancelled", isDemo: 0, startedAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z" },
      progress: compute({ campaign: { status: "cancelled" } }),
      activity: [],
      updates: [],
    });
    expect(cancelled.map((e) => e.text)).toEqual(["Campaign cancelled", "Campaign opened"]);
  });
});

describe("every line stays inside the words", () => {
  it("never says funded, pledge, donation or claim, and has no em-dash", () => {
    const scenarios = [
      compute(),
      compute({ rows: ALL_FILLED, routes: [route("maearth", 25000), route("gosteward", 5000)] }),
      compute({ routes: [route("maearth", 25000)] }),
      compute({ rows: ALL_FILLED }),
      compute({ campaign: { isDemo: 1 } }),
      compute({ campaign: { financialTarget: 0 }, items: [ROLE] }),
      compute({ campaign: { status: "completed" } }),
      compute({ campaign: { status: "cancelled" } }),
      compute({ campaign: { status: "draft", startedAt: null, publishedAt: null } }),
      compute({ items: [] }),
    ];
    const texts: string[] = [];
    for (const p of scenarios) {
      texts.push(...Object.values(progressLines(p, fmt)).filter((t): t is string => typeof t === "string"));
      texts.push(shareLine("Harmony Valley", p));
      for (const np of Object.values(p.byNeed)) texts.push(np.status.text);
    }
    texts.push(offeredLine({ gives: 1, lends: [{ quantity: 1, from: "2026-10-01", until: "2026-12-01" }] })!);
    texts.push(moneyShareNote({ inKindAsk: 1, moneyAsk: 9, asksNone: false, band: { softMinPct: 10, softMaxPct: 30 } }).line!);
    for (const t of texts) {
      expect(t).not.toMatch(/\u2014/);
      expect(t).not.toMatch(/\bfunded\b|\bpledg|\bdonat|\bclaim/i);
      expect(t).not.toMatch(/undefined|NaN|null/);
    }
  });
});

describe("a campaign that lists no in-kind needs", () => {
  it("never promises or counts an in-kind half it cannot have", () => {
    const open = compute({ items: [], campaign: { financialTarget: 1000 }, routes: [route("maearth", 400)] });
    expect(open.state).toBe("open");
    const openLines = progressLines(open, fmt);
    expect(openLines.inKind).toBe("This project lists no in-kind needs yet.");
    expect(openLines.halves).toBeNull();
    expect(openLines.completion).toBe("Complete means the money half lands by 30 November 2026.");

    const landed = compute({ items: [], campaign: { financialTarget: 1000 }, routes: [route("maearth", 1500)] });
    expect(landed.state).toBe("both_landed");
    const lines = progressLines(landed, fmt);
    expect(lines.halves).toBe("Money half landed.");
    expect(lines.completion).toBe("Complete means the money half lands by 30 November 2026.");
    for (const text of Object.values(lines)) expect(String(text ?? "")).not.toMatch(/0 needs|in-kind half/i);
  });

  it("reads almost complete on the money side alone", () => {
    const p = compute({ items: [], campaign: { financialTarget: 1000 }, routes: [route("maearth", 900)] });
    expect(p.almostComplete).toBe(true);
    expect(progressLines(p, fmt).stateTag).toBe("Almost complete");
  });

  it("on an example, the completion rule names the money half only", () => {
    const p = compute({ items: [], campaign: { financialTarget: 1000, isDemo: 1 } });
    expect(progressLines(p, fmt).completion).toBe("On a real campaign, complete means the money half lands by its close date.");
  });

  it("with nothing asked at all, no half line shows", () => {
    const p = compute({ items: [], campaign: { financialTarget: 0 } });
    expect(p.state).toBe("both_landed");
    expect(progressLines(p, fmt).halves).toBeNull();
  });
});
