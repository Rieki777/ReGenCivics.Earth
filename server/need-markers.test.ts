/**
 * "Needed to start" (build spec 2026-09-27, section 13; migration 0267).
 *
 * A project steward marks the needs the project can't begin without. The
 * mark is private to the stewards: it lives in campaign_need_markers, never
 * on campaign_items, whose every column getItems and getById return (finding
 * F6). campaigns.getNeedMarkers and setNeededToStart go through
 * server/lib/project-steward.ts. Example, cancelled and closed campaigns keep
 * their marks as they are, and money is never a need, so it can't be marked.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignItems, campaignNeedMarkers } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";
import { NEED_MARKER } from "../shared/crowdpoolCopy";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));
vi.mock("./lib/forum-notify", async (orig) => ({
  ...(await orig<typeof import("./lib/forum-notify")>()),
  insertNotification: vi.fn().mockResolvedValue(true),
}));

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986601;
const APP_STEWARD = 986602;
const STRANGER = 986603;
const createdCampaignIds: number[] = [];

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignNeedMarkers).where(inArray(campaignNeedMarkers.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A live campaign with two needs. Returns its id, its application and the need ids. */
async function campaign(title: string, opts: { isDemo?: boolean; live?: boolean } = {}) {
  const applicationId = await createApprovedApplication(STEWARD, { stewardUserId: APP_STEWARD });
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Marker ${title}`,
    description: "Marker fixture",
    projectName: `Test Marker ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    items: [
      { category: "resource", resourceName: "Well pump", resourceDescription: "Water first", estimatedValue: 2000 },
      { category: "equipment", equipmentName: "Wheelbarrow", equipmentQuantity: 1, estimatedValue: 150 },
    ],
  });
  createdCampaignIds.push(id);
  if (opts.live !== false) await adminCaller().campaigns.updateStatus({ id, status: "active" });
  if (opts.isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  const items = await dbHelpers.getCampaignItems(id);
  return { campaignId: id, applicationId, pump: items[0].id, barrow: items[1].id };
}

const MARKER_WORDS = /markedBy|markedAt|neededToStart|needMarker|need_markers|Needed to start/i;

describe("campaigns.setNeededToStart and getNeedMarkers", () => {
  it.skipIf(skipIfNoDb)("a steward marks and unmarks; a repeat changes nothing; another steward sees the same", async () => {
    const { campaignId, pump, barrow } = await campaign("Mark");
    const s = stewardCaller(STEWARD);
    expect(await s.campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [] });

    expect(await s.campaigns.setNeededToStart({ campaignItemId: pump, marked: true })).toEqual({ success: true, changed: true });
    expect(await s.campaigns.setNeededToStart({ campaignItemId: pump, marked: true })).toEqual({ success: true, changed: false });
    expect(await stewardCaller(APP_STEWARD).campaigns.setNeededToStart({ campaignItemId: barrow, marked: true }))
      .toEqual({ success: true, changed: true });
    expect(await stewardCaller(APP_STEWARD).campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [pump, barrow] });

    // The first steward's mark stays theirs.
    const database = await dbHelpers.getDb();
    const [row] = await database!.select().from(campaignNeedMarkers).where(eq(campaignNeedMarkers.campaignItemId, pump));
    expect(row).toMatchObject({ campaignId, markedBy: STEWARD });

    expect(await s.campaigns.setNeededToStart({ campaignItemId: pump, marked: false })).toEqual({ success: true, changed: true });
    expect(await s.campaigns.setNeededToStart({ campaignItemId: pump, marked: false })).toEqual({ success: true, changed: false });
    expect(await s.campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [barrow] });
  });

  it.skipIf(skipIfNoDb)("a stranger gets FORBIDDEN, a signed-out caller UNAUTHORIZED; an admin reads and marks", async () => {
    const { campaignId, pump } = await campaign("Stranger");
    await stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: pump, marked: true });
    const stranger = stewardCaller(STRANGER).campaigns;
    await expect(stranger.getNeedMarkers({ campaignId })).rejects.toMatchObject({ code: "FORBIDDEN", message: NEED_MARKER.stewardsOnly });
    await expect(stranger.setNeededToStart({ campaignItemId: pump, marked: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    // A need or campaign that doesn't exist answers the same way.
    await expect(stranger.setNeededToStart({ campaignItemId: 999_999_999, marked: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.getNeedMarkers({ campaignId: 999_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.getNeedMarkers({ campaignId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonCaller().campaigns.setNeededToStart({ campaignItemId: pump, marked: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await stewardCaller(STEWARD).campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [pump] });

    expect(await adminCaller().campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [pump] });
    expect(await adminCaller().campaigns.setNeededToStart({ campaignItemId: pump, marked: false })).toEqual({ success: true, changed: true });
  });

  it.skipIf(skipIfNoDb)("example campaigns keep their records; cancelled and closed campaigns keep their marks as they are", async () => {
    const example = await campaign("Example", { isDemo: true });
    await expect(stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: example.pump, marked: true }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: NEED_MARKER.exampleRefused });
    expect(await stewardCaller(STEWARD).campaigns.getNeedMarkers({ campaignId: example.campaignId })).toEqual({ itemIds: [] });

    const cancelled = await campaign("Cancelled");
    await stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: cancelled.pump, marked: true });
    await stewardCaller(STEWARD).campaigns.cancel({ id: cancelled.campaignId });
    await expect(stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: cancelled.pump, marked: false }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: NEED_MARKER.closedRefused });
    expect(await stewardCaller(STEWARD).campaigns.getNeedMarkers({ campaignId: cancelled.campaignId })).toEqual({ itemIds: [cancelled.pump] });

    // 'closed' is written only by the close job; set it straight on the row here.
    const closed = await campaign("Closed");
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ status: "closed", closedAt: new Date(), closeOutcome: "did_not_complete" })
      .where(eq(campaigns.id, closed.campaignId));
    await expect(stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: closed.barrow, marked: true }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: NEED_MARKER.closedRefused });
  });

  it.skipIf(skipIfNoDb)("money is never a need, so a legacy money need can't be marked", async () => {
    const { campaignId } = await campaign("Money");
    const database = await dbHelpers.getDb();
    // New campaigns can't list money as a need; older ones can still hold one.
    const inserted: any = await database!.insert(campaignItems).values({
      campaignId, category: "resource", kind: "crypto", resourceName: "Legacy money need", quantityWanted: 1, estimatedValue: 500,
    });
    const moneyId = Number(inserted?.[0]?.insertId ?? inserted?.insertId);
    await expect(stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: moneyId, marked: true }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: NEED_MARKER.moneyRefused });
    expect(await stewardCaller(STEWARD).campaigns.getNeedMarkers({ campaignId })).toEqual({ itemIds: [] });
  });

  it.skipIf(skipIfNoDb)("refuses bad input", async () => {
    const s = stewardCaller(STEWARD).campaigns;
    await expect(s.setNeededToStart({ campaignItemId: 0, marked: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(s.setNeededToStart({ campaignItemId: -3, marked: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(s.setNeededToStart({ campaignItemId: 1.5, marked: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(s.setNeededToStart({ campaignItemId: 5, marked: "yes" } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("the mark is never public", () => {
  it.skipIf(skipIfNoDb)("getItems, getById and projects.getPublic carry no trace of it, for anyone", async () => {
    const { campaignId, applicationId, pump } = await campaign("Private");
    const anon = anonCaller();
    const itemsBefore = JSON.stringify(await anon.campaigns.getItems({ campaignId }));
    const stewardItemsBefore = JSON.stringify(await stewardCaller(STEWARD).campaigns.getItems({ campaignId }));

    await stewardCaller(STEWARD).campaigns.setNeededToStart({ campaignItemId: pump, marked: true });

    // The public need rows are exactly what they were before the mark.
    expect(JSON.stringify(await anon.campaigns.getItems({ campaignId }))).toBe(itemsBefore);
    expect(JSON.stringify(await stewardCaller(STEWARD).campaigns.getItems({ campaignId }))).toBe(stewardItemsBefore);

    const callers = [anon, stewardCaller(STRANGER), stewardCaller(STEWARD), adminCaller()];
    for (const caller of callers) {
      const byId = JSON.stringify(await caller.campaigns.getById({ id: campaignId }));
      expect(byId).not.toMatch(MARKER_WORDS);
      const page = JSON.stringify(await caller.projects.getPublic({ key: String(applicationId) }));
      expect(page).not.toMatch(MARKER_WORDS);
      const items = JSON.stringify(await caller.campaigns.getItems({ campaignId }));
      expect(items).not.toMatch(MARKER_WORDS);
    }
  });
});
