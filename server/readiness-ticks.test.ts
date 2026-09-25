/**
 * Ready to crowdpool ticks, stored on the campaign (build spec 2026-09-25,
 * section 12; migration 0258). A project steward ticks and unticks by the
 * permanent keys in shared/crowdpoolReadiness.ts; the review team (admins)
 * reads them. Strangers get nothing; example and closed campaigns keep none.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignItems, campaignReadinessTicks } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";
import { CROWDPOOL_READINESS, RETIRED_READINESS_KEYS, isReadinessKey } from "../shared/crowdpoolReadiness";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986941;
const APP_STEWARD = 986942;
const STRANGER = 986943;
const createdCampaignIds: number[] = [];

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignReadinessTicks).where(inArray(campaignReadinessTicks.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A campaign in review (where campaigns made in the wizard start). */
async function campaign(title: string, opts: { isDemo?: boolean } = {}) {
  const applicationId = await createApprovedApplication(STEWARD, { stewardUserId: APP_STEWARD });
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Ready ${title}`,
    description: "Readiness fixture",
    projectName: `Test Ready ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 100 }],
  });
  createdCampaignIds.push(id);
  if (opts.isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  return id;
}

describe("the keys", () => {
  it("are unique, short enough for the column, and the retired list starts empty", () => {
    const keys = CROWDPOOL_READINESS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(k.length).toBeLessThanOrEqual(40);
      expect(isReadinessKey(k)).toBe(true);
    }
    expect(RETIRED_READINESS_KEYS).toEqual([]);
    expect(isReadinessKey("not-an-item")).toBe(false);
  });
});

describe("campaigns.setReadinessTick and getReadiness", () => {
  it.skipIf(skipIfNoDb)("a steward ticks and unticks; a repeat changes nothing", async () => {
    const campaignId = await campaign("Tick");
    const s = stewardCaller(STEWARD);
    expect(await s.campaigns.getReadiness({ campaignId })).toEqual([]);

    expect(await s.campaigns.setReadinessTick({ campaignId, key: "legal", ticked: true })).toEqual({ success: true, changed: true });
    expect(await s.campaigns.setReadinessTick({ campaignId, key: "land", ticked: true })).toEqual({ success: true, changed: true });
    const ticks = await s.campaigns.getReadiness({ campaignId });
    expect(ticks.map((t) => [t.itemKey, t.tickedBy])).toEqual([["legal", STEWARD], ["land", STEWARD]]);
    expect(ticks[0].tickedAt).toBeInstanceOf(Date);

    // Another steward of the project ticking again keeps the first tick.
    expect(await stewardCaller(APP_STEWARD).campaigns.setReadinessTick({ campaignId, key: "legal", ticked: true }))
      .toEqual({ success: true, changed: false });
    expect((await s.campaigns.getReadiness({ campaignId })).find((t) => t.itemKey === "legal")!.tickedBy).toBe(STEWARD);

    expect(await stewardCaller(APP_STEWARD).campaigns.setReadinessTick({ campaignId, key: "legal", ticked: false }))
      .toEqual({ success: true, changed: true });
    expect(await s.campaigns.setReadinessTick({ campaignId, key: "legal", ticked: false })).toEqual({ success: true, changed: false });
    expect((await s.campaigns.getReadiness({ campaignId })).map((t) => t.itemKey)).toEqual(["land"]);
  });

  it.skipIf(skipIfNoDb)("refuses a key that is not on the list", async () => {
    const campaignId = await campaign("Unknown key");
    for (const key of ["legals", "", "LEGAL", "x".repeat(40)]) {
      await expect(stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId, key, ticked: true }))
        .rejects.toMatchObject({ code: "BAD_REQUEST", message: "That isn't one of the Ready to crowdpool items." });
    }
    await expect(stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId, key: "x".repeat(41), ticked: true }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await stewardCaller(STEWARD).campaigns.getReadiness({ campaignId })).toEqual([]);
  });

  it.skipIf(skipIfNoDb)("a stranger gets FORBIDDEN and a signed-out caller UNAUTHORIZED; an admin reads and ticks", async () => {
    const campaignId = await campaign("Stranger");
    await stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId, key: "game", ticked: true });
    const stranger = stewardCaller(STRANGER);
    await expect(stranger.campaigns.getReadiness({ campaignId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.setReadinessTick({ campaignId, key: "legal", ticked: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.setReadinessTick({ campaignId, key: "game", ticked: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.campaigns.getReadiness({ campaignId: 999_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.getReadiness({ campaignId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const admin = adminCaller();
    expect((await admin.campaigns.getReadiness({ campaignId })).map((t) => t.itemKey)).toEqual(["game"]);
    expect(await admin.campaigns.setReadinessTick({ campaignId, key: "care", ticked: true })).toEqual({ success: true, changed: true });
  });

  it.skipIf(skipIfNoDb)("example campaigns keep no ticks, and a closed campaign's ticks stay as they are", async () => {
    const example = await campaign("Example", { isDemo: true });
    await expect(stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId: example, key: "legal", ticked: true }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Example campaigns don't keep ticks." });
    expect(await stewardCaller(STEWARD).campaigns.getReadiness({ campaignId: example })).toEqual([]);

    const closed = await campaign("Closed");
    await stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId: closed, key: "legal", ticked: true });
    await stewardCaller(STEWARD).campaigns.cancel({ id: closed });
    await expect(stewardCaller(STEWARD).campaigns.setReadinessTick({ campaignId: closed, key: "legal", ticked: false }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "This campaign is closed, so its ticks stay as they are." });
    expect((await stewardCaller(STEWARD).campaigns.getReadiness({ campaignId: closed })).map((t) => t.itemKey)).toEqual(["legal"]);
  });
});
