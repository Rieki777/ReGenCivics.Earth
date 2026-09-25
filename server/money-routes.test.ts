/**
 * Money routes (build spec 2026-09-25, section 7): a project steward adds a
 * Ma Earth or Steward route on the partner's own site, a ReGen Civics admin
 * verifies it, and only verified routes (plus example routes on example
 * campaigns) show publicly. The nightly job fetches verified routes only.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignItems, campaignPartnerLinks } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./notify-with-prefs", () => ({
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

const rails = new Map<string, number>();
vi.mock("./game", async (orig) => {
  const real = await orig<typeof import("./game")>();
  return {
    ...real,
    getGameVariable: vi.fn(async (key: string) => (rails.has(key) ? rails.get(key)! : real.getGameVariable(key))),
  };
});

import { notifyOwner } from "./_core/notification";
import { loadVerifiedPartnerLinks } from "./routes/batchJobs";
import { countMoneyRoutesToCheck } from "./routes/admin";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986931;
const APP_STEWARD = 986932;
const STRANGER = 986933;
const createdCampaignIds: number[] = [];

const MA_EARTH = "https://maearth.com/projects/test-money-routes";
const STEWARD_URL = "https://gosteward.com/projects/test-money-routes";

beforeEach(() => {
  rails.clear();
  rails.set("crowdpool.rails.loan_routes", 0);
  vi.mocked(notifyOwner).mockClear();
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignPartnerLinks).where(inArray(campaignPartnerLinks.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

async function campaign(title: string, opts: { status?: "active" | "pending_review"; isDemo?: boolean; currency?: string } = {}) {
  const applicationId = await createApprovedApplication(STEWARD, { stewardUserId: APP_STEWARD });
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Routes ${title}`,
    description: "Money routes fixture",
    projectName: `Test Routes ${title}`,
    currency: opts.currency ?? "USD",
    financialTarget: 5000,
    applicationId,
    items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
  });
  createdCampaignIds.push(id);
  if ((opts.status ?? "active") === "active") await adminCaller().campaigns.updateStatus({ id, status: "active" });
  if (opts.isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  return id;
}

async function linkRow(id: number) {
  const database = await dbHelpers.getDb();
  const rows = await database!.select().from(campaignPartnerLinks).where(eq(campaignPartnerLinks.id, id));
  return rows[0] ?? null;
}

describe("adding a route", () => {
  it.skipIf(skipIfNoDb)("a steward adds a Ma Earth route: pending, hidden publicly, seen by the steward", async () => {
    const campaignId = await campaign("Add");
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({
      campaignId, partner: "maearth", url: MA_EARTH, proofUrl: "https://example.org/about",
    });
    expect(await linkRow(id)).toMatchObject({
      status: "pending", partner: "maearth", label: "Give through Ma Earth", url: MA_EARTH,
      proofUrl: "https://example.org/about", addedBy: STEWARD, verifiedBy: null, cachedCurrency: null,
    });
    expect(vi.mocked(notifyOwner)).toHaveBeenCalledWith(expect.objectContaining({ title: "Money route to check: Test Routes Add" }));
    expect(JSON.stringify(vi.mocked(notifyOwner).mock.calls)).not.toContain(MA_EARTH);

    expect(await anonCaller().campaigns.getPartnerLinks({ campaignId })).toEqual([]);
    expect(await stewardCaller(STRANGER).campaigns.getPartnerLinks({ campaignId })).toEqual([]);
    // Any project steward sees every row with every column.
    const seen = await stewardCaller(APP_STEWARD).campaigns.getPartnerLinksForSteward({ campaignId });
    expect(seen.map((r) => [r.id, r.status])).toEqual([[id, "pending"]]);
    expect(seen[0]).toHaveProperty("proofUrl", "https://example.org/about");
  });

  it.skipIf(skipIfNoDb)("a stranger gets FORBIDDEN and a signed-out caller UNAUTHORIZED", async () => {
    const campaignId = await campaign("Stranger");
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH });
    const stranger = stewardCaller(STRANGER);
    await expect(stranger.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.removePartnerLink({ linkId: id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.getPartnerLinksForSteward({ campaignId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.getPartnerLinksForSteward({ campaignId: 999_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await linkRow(id)).not.toBeNull();
  });

  it.skipIf(skipIfNoDb)("refuses a host off the partner's list, and a proof link that is not https", async () => {
    const campaignId = await campaign("Hosts");
    const s = stewardCaller(STEWARD);
    for (const url of [
      "http://maearth.com/projects/x",
      "https://maearth.com.evil.test/projects/x",
      "https://169.254.169.254/latest/meta-data",
      "https://maearth.com/",
      "https://gosteward.com/projects/x",
    ]) {
      await expect(s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url }))
        .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Use your project's page on Ma Earth. The link has to start with https://maearth.com." });
    }
    await expect(s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH, proofUrl: "http://example.org" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(s.campaigns.addPartnerLink({ campaignId, partner: "grant" as "maearth", url: MA_EARTH }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await s.campaigns.getPartnerLinksForSteward({ campaignId })).toEqual([]);
  });

  it.skipIf(skipIfNoDb)("takes up to two routes of each kind, and none on a closed campaign", async () => {
    const campaignId = await campaign("Limit");
    const s = stewardCaller(STEWARD);
    await s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-1` });
    await s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-2` });
    await expect(s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-3` }))
      .rejects.toMatchObject({ message: "A campaign can have up to two routes of each kind." });
    await s.campaigns.addPartnerLink({ campaignId, partner: "gosteward", url: STEWARD_URL });

    await adminCaller().campaigns.updateStatus({ id: campaignId, status: "completed" });
    await expect(s.campaigns.addPartnerLink({ campaignId, partner: "gosteward", url: `${STEWARD_URL}-2` }))
      .rejects.toMatchObject({ message: "This campaign is closed, so it takes no new routes." });
  });

  it.skipIf(skipIfNoDb)("campaigns.create stores moneyRoutes as pending and returns the project path", async () => {
    const applicationId = await createApprovedApplication(STEWARD);
    const created = await stewardCaller(STEWARD).campaigns.create({
      title: "Test Routes Create", description: "x", projectName: "Test Routes Create", currency: "EUR",
      financialTarget: 2000, applicationId,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
      moneyRoutes: [{ partner: "maearth", url: MA_EARTH }, { partner: "gosteward", url: STEWARD_URL }],
    });
    createdCampaignIds.push(created.id);
    expect(created.success).toBe(true);
    expect(created.path).toBe(`/project/${applicationId}-test-routes-create?campaign=${created.id}`);
    const rows = await stewardCaller(STEWARD).campaigns.getPartnerLinksForSteward({ campaignId: created.id });
    expect(rows.map((r) => [r.partner, r.status, r.label, r.addedBy])).toEqual([
      ["maearth", "pending", "Give through Ma Earth", STEWARD],
      ["gosteward", "pending", "Lend through Steward", STEWARD],
    ]);
    expect(vi.mocked(notifyOwner)).toHaveBeenCalledWith(expect.objectContaining({ title: "Money route to check: Test Routes Create" }));
  });

  it.skipIf(skipIfNoDb)("campaigns.create refuses a bad route before writing anything", async () => {
    const applicationId = await createApprovedApplication(STEWARD);
    const title = `Test Routes Refused ${Date.now()}`;
    await expect(stewardCaller(STEWARD).campaigns.create({
      title, description: "x", projectName: title, currency: "USD", financialTarget: 0, applicationId,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
      moneyRoutes: [{ partner: "maearth", url: "https://evil.test/projects/x" }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const database = await dbHelpers.getDb();
    const rows = await database!.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.title, title));
    expect(rows).toHaveLength(0);
  });
});

describe("reviewing a route", () => {
  it.skipIf(skipIfNoDb)("an admin verifies with a currency and it shows, without the review fields", async () => {
    const campaignId = await campaign("Verify", { currency: "EUR" });
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({
      campaignId, partner: "maearth", url: MA_EARTH, proofUrl: "https://example.org/proof",
    });
    await expect(stewardCaller(STEWARD).campaigns.reviewPartnerLink({ linkId: id, decision: "verified" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(await adminCaller().campaigns.reviewPartnerLink({ linkId: id, decision: "verified", currency: "gbp" }))
      .toEqual({ success: true, status: "verified" });
    expect(await linkRow(id)).toMatchObject({ status: "verified", cachedCurrency: "GBP", verifiedBy: 987900, reviewNote: null });
    expect((await linkRow(id))!.verifiedAt).toBeInstanceOf(Date);

    const shown = await anonCaller().campaigns.getPartnerLinks({ campaignId });
    expect(shown.map((r) => [r.id, r.status])).toEqual([[id, "verified"]]);
    for (const hidden of ["proofUrl", "reviewNote", "addedBy", "verifiedBy", "verifiedAt"]) {
      expect(shown[0]).not.toHaveProperty(hidden);
    }

    // Without a currency the campaign's own is used.
    const second = await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-b` });
    await adminCaller().campaigns.reviewPartnerLink({ linkId: second.id, decision: "verified" });
    expect((await linkRow(second.id))!.cachedCurrency).toBe("EUR");
  });

  it.skipIf(skipIfNoDb)("a rejected route stays hidden, with the note in the steward's read", async () => {
    const campaignId = await campaign("Reject");
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH });
    await adminCaller().campaigns.reviewPartnerLink({
      linkId: id, decision: "rejected", note: "<b>This page</b> belongs to another project.",
    });
    expect(await anonCaller().campaigns.getPartnerLinks({ campaignId })).toEqual([]);
    const [row] = await stewardCaller(STEWARD).campaigns.getPartnerLinksForSteward({ campaignId });
    expect(row).toMatchObject({ status: "rejected", reviewNote: "This page belongs to another project.", verifiedBy: null });
  });

  it.skipIf(skipIfNoDb)("a Steward route can't be verified while the loan route switch is off", async () => {
    const campaignId = await campaign("Loan rail");
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "gosteward", url: STEWARD_URL });
    await expect(adminCaller().campaigns.reviewPartnerLink({ linkId: id, decision: "verified" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Loan routes can't be verified until the loan route switch is on." });
    expect((await linkRow(id))!.status).toBe("pending");
    // It can still be turned down, and verified once the switch is on.
    rails.set("crowdpool.rails.loan_routes", 1);
    await adminCaller().campaigns.reviewPartnerLink({ linkId: id, decision: "verified" });
    expect((await linkRow(id))!.status).toBe("verified");
  });

  it.skipIf(skipIfNoDb)("a steward removes a route", async () => {
    const campaignId = await campaign("Remove");
    const { id } = await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH });
    await adminCaller().campaigns.reviewPartnerLink({ linkId: id, decision: "verified" });
    expect(await stewardCaller(APP_STEWARD).campaigns.removePartnerLink({ linkId: id })).toEqual({ success: true, changed: true });
    expect(await linkRow(id)).toBeNull();
    expect(await anonCaller().campaigns.getPartnerLinks({ campaignId })).toEqual([]);
    // A repeat is a quiet no-op.
    expect(await stewardCaller(STEWARD).campaigns.removePartnerLink({ linkId: id })).toEqual({ success: true, changed: false });
  });
});

describe("example campaigns", () => {
  it.skipIf(skipIfNoDb)("keep their example routes: no new route, no review, only an admin removes one", async () => {
    const campaignId = await campaign("Example", { isDemo: true });
    const database = await dbHelpers.getDb();
    const inserted: any = await database!.insert(campaignPartnerLinks).values({
      campaignId, partner: "maearth", label: "Give through Ma Earth", url: "https://maearth.com/projects/example",
      status: "example", cachedRaised: 1200, cachedCurrency: "USD",
    });
    const exampleId = Number(inserted?.[0]?.insertId ?? inserted?.insertId);

    await expect(stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId, partner: "maearth", url: MA_EARTH }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Example campaigns keep their example routes." });
    await expect(adminCaller().campaigns.reviewPartnerLink({ linkId: exampleId, decision: "verified" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(stewardCaller(STEWARD).campaigns.removePartnerLink({ linkId: exampleId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await anonCaller().campaigns.getPartnerLinks({ campaignId })).map((r) => r.status)).toEqual(["example"]);
    expect(await adminCaller().campaigns.removePartnerLink({ linkId: exampleId })).toEqual({ success: true, changed: true });
  });
});

describe("what the nightly job and the admin pulse read", () => {
  it.skipIf(skipIfNoDb)("the hydration loader selects verified rows only", async () => {
    const campaignId = await campaign("Loader");
    const s = stewardCaller(STEWARD);
    const pending = (await s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-pending` })).id;
    const verified = (await s.campaigns.addPartnerLink({ campaignId, partner: "maearth", url: `${MA_EARTH}-verified` })).id;
    await adminCaller().campaigns.reviewPartnerLink({ linkId: verified, decision: "verified" });
    const rejected = (await s.campaigns.addPartnerLink({ campaignId, partner: "gosteward", url: `${STEWARD_URL}-rejected` })).id;
    await adminCaller().campaigns.reviewPartnerLink({ linkId: rejected, decision: "rejected" });
    const database = await dbHelpers.getDb();
    const ex: any = await database!.insert(campaignPartnerLinks).values({
      campaignId, partner: "gosteward", url: `${STEWARD_URL}-example`, status: "example",
    });
    const example = Number(ex?.[0]?.insertId ?? ex?.insertId);

    const loaded = (await loadVerifiedPartnerLinks(database)).map((l) => l.id);
    expect(loaded).toContain(verified);
    for (const id of [pending, rejected, example]) expect(loaded).not.toContain(id);
  });

  it.skipIf(skipIfNoDb)("the operator pulse counts pending routes on real campaigns, never examples", async () => {
    const database = (await dbHelpers.getDb())!;
    const before = await countMoneyRoutesToCheck(database);
    const real = await campaign("Pulse real", { status: "pending_review" });
    await stewardCaller(STEWARD).campaigns.addPartnerLink({ campaignId: real, partner: "maearth", url: MA_EARTH });
    const example = await campaign("Pulse example", { isDemo: true });
    await database.insert(campaignPartnerLinks).values({ campaignId: example, partner: "maearth", url: MA_EARTH, status: "pending" });
    expect(await countMoneyRoutesToCheck(database)).toBe(before + 1);
  });
});
