import { describe, expect, it } from "vitest";
import {
  OPEN_NEED_ROW_KEYS,
  OPEN_ROUTE_ROW_KEYS,
  buildOpenNeeds,
  rankOpenNeeds,
  type OpenNeedsCampaign,
  type OpenNeedsInputs,
  type RankFields,
} from "./openNeeds";

const r = (needId: number, over: Partial<RankFields> = {}): RankFields => ({
  needId,
  offerCount: 0,
  offered: 0,
  wanted: 1,
  pinned: false,
  startedAtMs: 0,
  ...over,
});

describe("rankOpenNeeds", () => {
  it("puts needs no one has offered on first", () => {
    const ranked = rankOpenNeeds([
      r(1, { offerCount: 1, offered: 1, wanted: 10 }),
      r(2),
      r(3, { offerCount: 2, offered: 1, wanted: 100 }),
      r(4),
    ]);
    expect(ranked.map((x) => x.needId)).toEqual([2, 4, 3, 1]);
  });

  it("then the smallest offered share", () => {
    const ranked = rankOpenNeeds([
      r(1, { offerCount: 1, offered: 3, wanted: 4 }),
      r(2, { offerCount: 1, offered: 1, wanted: 4 }),
      r(3, { offerCount: 3, offered: 2, wanted: 4 }),
    ]);
    expect(ranked.map((x) => x.needId)).toEqual([2, 3, 1]);
  });

  it("then pinned, then the newest campaign, then need id", () => {
    const ranked = rankOpenNeeds([
      r(5, { startedAtMs: 100 }),
      r(4, { startedAtMs: 300 }),
      r(3, { pinned: true, startedAtMs: 1 }),
      r(2, { startedAtMs: 300 }),
    ]);
    expect(ranked.map((x) => x.needId)).toEqual([3, 2, 4, 5]);
  });

  it("does not change the array it was given", () => {
    const input = [r(2, { offerCount: 1, offered: 1 }), r(1)];
    rankOpenNeeds(input);
    expect(input.map((x) => x.needId)).toEqual([2, 1]);
  });
});

function campaign(id: number, over: Partial<OpenNeedsCampaign> = {}): OpenNeedsCampaign {
  return {
    id,
    applicationId: null,
    projectName: `Project ${id}`,
    title: `Campaign ${id}`,
    location: "Test Valley",
    status: "active",
    isDemo: 0,
    financialTarget: 1000,
    currency: "USD",
    startedAt: new Date(Date.UTC(2026, 8, id)),
    publishedAt: null,
    durationDays: 90,
    ...over,
  };
}

function item(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    kind: "item",
    category: "equipment",
    capitalType: "material",
    capacityUnit: "count",
    quantityWanted: 1,
    estimatedValue: 100,
    equipmentName: `Thing ${id}`,
    priorityPinned: 0,
    ...over,
  } as OpenNeedsInputs["items"][number];
}

describe("buildOpenNeeds", () => {
  const campaigns = [campaign(1), campaign(2, { isDemo: 1, projectName: "Harmony Valley" })];
  const inputs = new Map<number, OpenNeedsInputs>([
    [1, {
      items: [
        item(11, { equipmentName: "Truck" }),
        item(12, { equipmentName: "Filled tractor" }),
        item(13, { kind: "crypto", category: "resource", resourceName: "USDC", equipmentName: null }),
        item(14, { kind: "financial_link", category: "resource", resourceName: "Link", equipmentName: null }),
        item(15, { kind: "role", category: "role", capacityUnit: "hours_per_week", quantityWanted: 20, roleTitle: "Cook", equipmentName: null, workMode: "remote" }),
        item(16, { equipmentName: "Chainsaw", acceptsGift: 1, acceptsLoan: 1, neededFrom: "2026-10-01", neededUntil: "2026-12-31" }),
      ],
      rows: [
        { campaignItemId: 12, status: "accepted", contributionType: "equipment", offerMode: "give", quantity: 1, value: 100, financialValue: 100, count: 1 },
        { campaignItemId: 16, status: "pending", contributionType: "equipment", offerMode: "lend", quantity: 1, value: 100, financialValue: 100, count: 1 },
      ],
      lends: [{ campaignItemId: 16, quantity: 1, availableFrom: "2026-10-02", lendUntil: "2026-11-30" }],
      routes: [],
    }],
    [2, { items: [item(21, { equipmentName: "Example spade" })], rows: [], lends: [], routes: [] }],
  ]);
  const routes = [
    { campaignId: 1, partner: "maearth", label: "Give through Ma Earth", status: "verified" },
    { campaignId: 1, partner: "gosteward", label: null, status: "pending" },
    { campaignId: 1, partner: "maearth", label: null, status: "example" },
    { campaignId: 2, partner: "maearth", label: "Give through Ma Earth", status: "example" },
    { campaignId: 2, partner: "gosteward", label: "Lend through GoSteward", status: "example" },
    { campaignId: 2, partner: "grant", label: "Apply for the land grant", status: "example" },
  ];
  const out = buildOpenNeeds({ campaigns, inputs, routes, today: "2026-09-25" });

  it("leaves out filled and money needs, and keeps examples apart", () => {
    expect(out.needs.map((n) => n.needId)).toEqual([11, 15, 16]);
    expect(out.examples.map((n) => n.needId)).toEqual([21]);
    expect(out.examples[0].isDemo).toBe(true);
    expect(out.realCampaignCount).toBe(1);
  });

  it("marks no-offer needs and words each row", () => {
    const truck = out.needs.find((n) => n.needId === 11)!;
    expect(truck).toMatchObject({
      verb: "Offer",
      chip: "things",
      title: "Truck",
      noOffersYet: true,
      status: { key: "none", text: "No one has offered yet" },
      place: "land",
      path: "/project/c1-project-1?campaign=1&offer=11#need-11",
    });
    const cook = out.needs.find((n) => n.needId === 15)!;
    expect(cook).toMatchObject({ verb: "Apply", chip: "role", place: "remote", detail: "20 hrs a week" });
    const saw = out.needs.find((n) => n.needId === 16)!;
    expect(saw).toMatchObject({
      noOffersYet: false,
      status: { key: "waiting", text: "Offered, waiting on the stewards" },
      detail: "Needed 1 Oct to 31 Dec. Give or lend.",
    });
  });

  it("carries exactly the pinned row keys, with no lend dates or names", () => {
    for (const row of [...out.needs, ...out.examples]) {
      expect(Object.keys(row).sort()).toEqual([...OPEN_NEED_ROW_KEYS].sort());
      expect(JSON.stringify(row)).not.toContain("2026-10-02");
      expect(JSON.stringify(row)).not.toContain("2026-11-30");
    }
    for (const row of [...out.routes, ...out.exampleRoutes]) {
      expect(Object.keys(row).sort()).toEqual([...OPEN_ROUTE_ROW_KEYS].sort());
    }
  });

  it("shows verified routes on real campaigns and example routes on example campaigns", () => {
    expect(out.routes).toEqual([
      { campaignId: 1, projectName: "Project 1", partner: "maearth", label: "Give through Ma Earth", path: "/project/c1-project-1?campaign=1#money", isDemo: false },
    ]);
    const money = "/project/c2-harmony-valley?campaign=2#money";
    expect(out.exampleRoutes).toEqual([
      { campaignId: 2, projectName: "Harmony Valley", partner: "maearth", label: "Give through Ma Earth", path: money, isDemo: true },
      // Stored "GoSteward" reads with the shared words; other partners keep their own label.
      { campaignId: 2, projectName: "Harmony Valley", partner: "gosteward", label: "Lend through Steward", path: money, isDemo: true },
      { campaignId: 2, projectName: "Harmony Valley", partner: "grant", label: "Apply for the land grant", path: money, isDemo: true },
    ]);
  });
});
