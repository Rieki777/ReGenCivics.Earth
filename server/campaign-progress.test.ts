/**
 * The two-line reading on the server (build spec 2026-09-25, section 4.3):
 * `progress` on campaigns.getById (full) and campaigns.list rows (summary),
 * getPartnerLinks returning only verified routes plus example routes on
 * example campaigns, and campaigns.crowdpoolSettings.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { inArray, eq } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems, campaignPartnerLinks } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  realOffer,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 987201;
const STRANGER = 987203;
const createdCampaignIds: number[] = [];

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignPartnerLinks).where(inArray(campaignPartnerLinks.campaignId, createdCampaignIds));
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A live campaign with one thing need (two wanted, 1,000) and a money ask of 500. */
async function liveCampaign(title: string) {
  const applicationId = await createApprovedApplication(OWNER);
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title: `Test Progress ${title}`,
    description: "Progress fixture",
    projectName: `Test Progress ${title}`,
    currency: "USD",
    financialTarget: 500,
    applicationId,
    items: [{ category: "resource", resourceName: "Fence posts", resourceDescription: "Posts", quantityWanted: 2, estimatedValue: 1000 }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const [need] = await dbHelpers.getCampaignItems(id);
  return { id, needId: need.id };
}

async function addRoute(campaignId: number, over: Partial<typeof campaignPartnerLinks.$inferInsert>) {
  const database = await dbHelpers.getDb();
  await database!.insert(campaignPartnerLinks).values({
    campaignId,
    partner: "maearth",
    url: "https://maearth.com/p/test-progress",
    label: "Give through Ma Earth",
    ...over,
  });
}

describe("progress on getById and list", () => {
  it.skipIf(skipIfNoDb)("moves as an offer is accepted and then delivered", async () => {
    const { id, needId } = await liveCampaign("Moves");
    const read = async () => (await anonCaller().campaigns.getById({ id }))!.progress;

    const fresh = await read();
    expect(fresh).toMatchObject({
      currency: "USD",
      isExample: false,
      state: "open",
      inKind: { ask: 1000, confirmed: 0, delivered: 0, needsTotal: 1, needsMet: 0, landed: false },
      money: { ask: 500, asksNone: false, raised: 0, hasRoutes: false },
      open: { count: 1, things: 1 },
    });
    expect(fresh.byNeed[needId].status).toEqual({ key: "none", text: "No one has offered yet" });
    expect(fresh.byCapital).toHaveLength(9);
    expect(fresh.endsAt).not.toBeNull();

    const offer = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: id, campaignItemId: needId, contributionType: "resource", title: "Test fence posts",
      quantityPledged: 1, estimatedValue: 500, contributorName: "Offerer", contributorEmail: "progress.offerer@example.com",
    }));
    const offered = await read();
    expect(offered.byNeed[needId]).toMatchObject({ offered: 1, offerCount: 1, confirmed: 0, confirmedValue: 0 });
    expect(offered.byNeed[needId].status.text).toBe("1 of 2 offered");
    expect(offered.inKind.confirmed).toBe(0);

    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: offer.id, status: "accepted" });
    const accepted = await read();
    expect(accepted.byNeed[needId]).toMatchObject({ confirmed: 1, delivered: 0, open: 1, filled: false, confirmedValue: 500 });
    expect(accepted.inKind).toMatchObject({ confirmed: 500, delivered: 0, needsMet: 0 });

    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: offer.id, status: "fulfilled" });
    const delivered = await read();
    expect(delivered.byNeed[needId]).toMatchObject({ confirmed: 1, delivered: 1, confirmedValue: 500, deliveredValue: 500 });
    expect(delivered.inKind).toMatchObject({ confirmed: 500, delivered: 500, pct: 50 });
  });

  it.skipIf(skipIfNoDb)("list rows carry the summary reading", async () => {
    const { id } = await liveCampaign("Listed");
    const rows = await anonCaller().campaigns.list({ status: "active" });
    const mine = rows.find((r) => r.id === id)!;
    expect(mine.progress).toMatchObject({ state: "open", inKind: { ask: 1000, needsTotal: 1 }, money: { ask: 500 } });
    expect(mine.progress.topOpen).toEqual([{ id: expect.any(Number), line: "Fence posts" }]);
    expect(mine.progress).not.toHaveProperty("byNeed");
    expect(mine.progress).not.toHaveProperty("byCapital");
    // Every row has one.
    expect(rows.every((r) => r.progress && typeof r.progress.state === "string")).toBe(true);
  });
});

describe("getPartnerLinks shows only checked routes", () => {
  const PUBLIC_KEYS = [
    "cachedContributorCount", "cachedCurrency", "cachedPercent", "cachedRaised", "campaignId", "id",
    "label", "lastFetchedAt", "partner", "status", "url",
  ];

  it.skipIf(skipIfNoDb)("hides a pending route and shows a verified one with its status", async () => {
    const { id } = await liveCampaign("Routes");
    await addRoute(id, { status: "pending", proofUrl: "https://example.org/proof", addedBy: OWNER });
    await addRoute(id, { status: "verified", cachedRaised: 300, cachedCurrency: "USD", verifiedBy: 1, reviewNote: null });
    await addRoute(id, { status: "rejected", reviewNote: "Not this project" });
    // An example row on a real campaign never shows.
    await addRoute(id, { status: "example", cachedRaised: 900 });

    for (const caller of [anonCaller(), stewardCaller(STRANGER)]) {
      const links = await caller.campaigns.getPartnerLinks({ campaignId: id });
      expect(links).toHaveLength(1);
      expect(links[0].status).toBe("verified");
      expect(Object.keys(links[0]).sort()).toEqual(PUBLIC_KEYS);
      const json = JSON.stringify(links);
      for (const secret of ["example.org/proof", "Not this project", "addedBy", "verifiedBy", "proofUrl", "reviewNote"]) {
        expect(json).not.toContain(secret);
      }
    }
    // The verified route counts on the money line; the others do not.
    const view = await anonCaller().campaigns.getById({ id });
    expect(view!.progress.money).toMatchObject({ given: 300, raised: 300, hasRoutes: true });
  });

  it.skipIf(skipIfNoDb)("shows example routes on an example campaign, marked example", async () => {
    const { id } = await adminCaller().campaigns.create({
      title: "Test Progress Example",
      description: "Example fixture",
      projectName: "Test Progress Example",
      currency: "EUR",
      financialTarget: 10000,
      items: [{ category: "equipment", equipmentName: "Test cart", estimatedValue: 2000 }],
    });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
    await addRoute(id, { status: "example", cachedRaised: 4000, cachedCurrency: "EUR" });
    await addRoute(id, { partner: "gosteward", url: "https://gosteward.com/p/test", status: "example", cachedRaised: 2500, cachedCurrency: "EUR" });
    await addRoute(id, { status: "pending" });

    const links = await anonCaller().campaigns.getPartnerLinks({ campaignId: id });
    expect(links.map((l) => l.status)).toEqual(["example", "example"]);
    const view = await anonCaller().campaigns.getById({ id });
    expect(view!.progress).toMatchObject({
      isExample: true,
      money: { given: 4000, lent: 2500, raised: 6500, ask: 10000, hasRoutes: true },
    });
  });

  it.skipIf(skipIfNoDb)("reads nothing for an unpublished campaign", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const { id } = await stewardCaller(OWNER).campaigns.create({
      title: "Test Progress Draft",
      description: "Draft fixture",
      projectName: "Test Progress Draft",
      financialTarget: 0,
      applicationId,
      items: [],
    });
    createdCampaignIds.push(id);
    await addRoute(id, { status: "verified", cachedRaised: 100, cachedCurrency: "USD" });
    expect(await anonCaller().campaigns.getPartnerLinks({ campaignId: id })).toEqual([]);
    expect(await stewardCaller(STRANGER).campaigns.getPartnerLinks({ campaignId: id })).toEqual([]);
    expect(await stewardCaller(OWNER).campaigns.getPartnerLinks({ campaignId: id })).toHaveLength(1);
  });
});

describe("crowdpoolSettings", () => {
  it.skipIf(skipIfNoDb)("serves the money-share band and the two rails", async () => {
    expect(await anonCaller().campaigns.crowdpoolSettings()).toEqual({
      moneyShare: { softMinPct: 10, softMaxPct: 30, defaultPct: 20 },
      moneyMovesHere: false,
      loanRoutesOpen: false,
    });
  });
});
