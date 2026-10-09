/**
 * A way back for a campaign the review team sends back (bundle 1, item 9,
 * migration 0295).
 *
 * The admin's "Send back for changes" moves a campaign in review to draft,
 * keeps the reviewer's note in campaigns.stewardReviewNote (and adminNotes,
 * as the old Reject did), stamps sentBackAt and tells the stewards on the
 * spine. Only stewards and admins read the note (campaigns.getReviewNote);
 * neither column ever leaves the hub publicly. Stewards send it for review
 * again, a legacy 'rejected' one included.
 *
 * Run against the SCRATCH database, never production. Fixture titles stay
 * clear of the words the global teardown sweeps.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const { inserted, stale } = vi.hoisted(() => ({
  inserted: [] as Array<{ userId: number; type: string; title: string; body?: string; link?: string | null }>,
  // A campaign row to answer getCampaignById with, standing in for a read
  // made a moment before someone else changed the campaign.
  stale: new Map<number, unknown>(),
}));
vi.mock("./lib/forum-notify", async (orig) => ({
  ...(await orig<typeof import("./lib/forum-notify")>()),
  insertNotification: vi.fn(async (input: (typeof inserted)[number]) => {
    inserted.push(input);
    return true;
  }),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));
vi.mock("./db", async (orig) => {
  const real = await orig<typeof import("./db")>();
  return {
    ...real,
    getCampaignById: vi.fn(async (id: number) => (stale.has(id) ? stale.get(id) : real.getCampaignById(id))),
  };
});

import * as dbHelpers from "./db";
import {
  campaigns,
  campaignArrivalNotes,
  campaignContributions,
  campaignItems,
  campaignNeedMarkers,
} from "../drizzle/schema";
import {
  FIXTURE_ADMIN_ID,
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986161;
const CO_STEWARD = 986162;
const STRANGER = 986163;
const NOTE = "Value the tractor and add a photo of the well.";
const createdCampaignIds: number[] = [];

beforeEach(() => {
  inserted.length = 0;
  stale.clear();
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignNeedMarkers).where(inArray(campaignNeedMarkers.campaignId, createdCampaignIds));
    await database!.delete(campaignArrivalNotes).where(inArray(campaignArrivalNotes.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A campaign in review (the wizard's start) with a pump, a wheelbarrow and a garden role. */
async function inReview(name: string) {
  const applicationId = await createApprovedApplication(STEWARD, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Send-back ${name}`,
    description: "A spring of planting and water work.",
    projectName: `Lane four ${name}`,
    currency: "USD",
    financialTarget: 500,
    durationDays: 90,
    applicationId,
    items: [
      { category: "resource", kind: "item", resourceName: "Well pump", resourceDescription: "Water first", estimatedValue: 2000 },
      { category: "equipment", kind: "item", equipmentName: "Wheelbarrow", equipmentQuantity: 1, estimatedValue: 150 },
      { category: "role", kind: "role", roleTitle: "Garden lead", hoursPerWeek: 10, roleDescription: "Beds and paths", estimatedValue: 4000 },
    ],
  });
  createdCampaignIds.push(id);
  const items = await dbHelpers.getCampaignItems(id);
  const byName = (n: string) => items.find((i) => i.resourceName === n || i.equipmentName === n || i.roleTitle === n)!;
  return { id, pump: byName("Well pump"), barrow: byName("Wheelbarrow"), lead: byName("Garden lead") };
}

async function row(id: number) {
  const database = await dbHelpers.getDb();
  const [r] = await database!.select().from(campaigns).where(eq(campaigns.id, id));
  return r;
}

describe("Send back for changes (admin)", () => {
  it.skipIf(skipIfNoDb)("moves a campaign in review to draft, keeps the note for the stewards and tells them", async () => {
    const c = await inReview("Hollow");
    expect((await row(c.id)).status).toBe("pending_review");

    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: NOTE });
    const after = await row(c.id);
    expect(after).toMatchObject({ status: "draft", stewardReviewNote: NOTE, adminNotes: NOTE, reviewedBy: FIXTURE_ADMIN_ID });
    expect(after.sentBackAt).toBeInstanceOf(Date);
    expect(after.reviewedAt).toBeInstanceOf(Date);

    // The spine notice carries the note to each steward, never the admin.
    const notices = inserted.filter((n) => n.type === "campaign_declined");
    expect(notices.map((n) => n.userId).sort()).toEqual([STEWARD, CO_STEWARD]);
    expect(notices.every((n) => n.body === NOTE)).toBe(true);
    expect(notices[0].link).toContain("#steward-tools");

    const seen = await stewardCaller(CO_STEWARD).campaigns.getReviewNote({ campaignId: c.id });
    expect(seen.note).toBe(NOTE);
    expect(seen.sentBackAt).toBeInstanceOf(Date);
    expect(await adminCaller().campaigns.getReviewNote({ campaignId: c.id })).toMatchObject({ note: NOTE });
  });

  it.skipIf(skipIfNoDb)("without a note, the stewards get the fallback line and the card has no note", async () => {
    const c = await inReview("Quiet");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft" });
    expect((await row(c.id)).stewardReviewNote).toBeNull();
    expect(inserted.find((n) => n.type === "campaign_declined")?.body)
      .toBe("The review team sent this campaign back for changes. Open your project page to edit it and send it for review again.");
    expect((await stewardCaller(STEWARD).campaigns.getReviewNote({ campaignId: c.id })).note).toBeNull();
  });

  it.skipIf(skipIfNoDb)("the note is for stewards and admins only", async () => {
    const c = await inReview("Private");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: NOTE });
    await expect(stewardCaller(STRANGER).campaigns.getReviewNote({ campaignId: c.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stewardCaller(STRANGER).campaigns.getReviewNote({ campaignId: 999_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.getReviewNote({ campaignId: c.id })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("Sending it for review again", () => {
  it.skipIf(skipIfNoDb)("the note and its date never reach a public read, even once the campaign is live", async () => {
    const c = await inReview("Public");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: NOTE });
    await stewardCaller(STEWARD).campaigns.submitForReview({ id: c.id });
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "active" });

    const anon = await anonCaller().campaigns.getById({ id: c.id });
    expect(anon).not.toBeNull();
    const steward = await stewardCaller(STEWARD).campaigns.getById({ id: c.id });
    const listed = (await anonCaller().campaigns.list({})).find((r) => r.id === c.id);
    expect(listed).toBeDefined();
    for (const view of [anon, steward, listed] as Array<Record<string, unknown>>) {
      for (const key of ["stewardReviewNote", "sentBackAt", "adminNotes"]) expect(key in view, key).toBe(false);
    }
    // Admins get whole rows.
    expect(await adminCaller().campaigns.getById({ id: c.id })).toMatchObject({ stewardReviewNote: NOTE });
  });

  it.skipIf(skipIfNoDb)("a campaign sent back under the old Reject keeps the note and can be sent for review", async () => {
    const c = await inReview("Legacy");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "rejected", reviewNotes: NOTE });
    expect(await row(c.id)).toMatchObject({ status: "rejected", stewardReviewNote: NOTE });
    expect((await stewardCaller(STEWARD).campaigns.getReviewNote({ campaignId: c.id })).note).toBe(NOTE);
    expect(await stewardCaller(STEWARD).campaigns.submitForReview({ id: c.id })).toEqual({ success: true });
    expect(await row(c.id)).toMatchObject({ status: "pending_review" });
    // An admin can also send a legacy one back to draft.
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "rejected" });
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: "One more photo." });
    expect(await row(c.id)).toMatchObject({ status: "draft", stewardReviewNote: "One more photo." });
  });

  it.skipIf(skipIfNoDb)("a read made before someone else changed the campaign gets CONFLICT, and writes nothing", async () => {
    const d = await inReview("Race two");
    await adminCaller().campaigns.updateStatus({ id: d.id, status: "rejected" });
    stale.set(d.id, await row(d.id));
    await adminCaller().campaigns.updateStatus({ id: d.id, status: "active" });
    await expect(stewardCaller(STEWARD).campaigns.submitForReview({ id: d.id })).rejects.toMatchObject({ code: "CONFLICT" });
    stale.clear();
    const database = await dbHelpers.getDb();
    const [still] = await database!.select({ status: campaigns.status }).from(campaigns).where(and(eq(campaigns.id, d.id)));
    expect(still.status).toBe("active");
  });
});
