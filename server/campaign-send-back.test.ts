/**
 * A way back for a campaign the review team sends back (bundle 1, item 9,
 * migration 0296).
 *
 * The admin's "Send back for changes" moves a campaign in review to draft,
 * keeps the reviewer's note in campaigns.stewardReviewNote (and adminNotes,
 * as the old Reject did), stamps sentBackAt and tells the stewards on the
 * spine. Only stewards and admins read the note (campaigns.getReviewNote);
 * neither column ever leaves the hub publicly. Stewards edit the campaign
 * (campaigns.updateDraft) while it is a draft, in review or sent back, and
 * send it for review again, a legacy 'rejected' one included.
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
import { ZERO_VALUE } from "../shared/crowdpoolCopy";

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

/** The edit form's needs as they stand, ready to change. */
function asSent(c: Awaited<ReturnType<typeof inReview>>) {
  return {
    pump: { id: c.pump.id, category: "resource" as const, kind: "item" as const, resourceName: "Well pump", resourceDescription: "Water first", estimatedValue: 2000, quantityWanted: 1, acceptsGift: true, acceptsLoan: false },
    barrow: { id: c.barrow.id, category: "equipment" as const, kind: "item" as const, equipmentName: "Wheelbarrow", estimatedValue: 150, quantityWanted: 1, acceptsGift: true, acceptsLoan: false },
    lead: { id: c.lead.id, category: "role" as const, kind: "role" as const, roleTitle: "Garden lead", roleDescription: "Beds and paths", hoursPerWeek: 10, quantityWanted: 10, estimatedValue: 4000 },
  };
}

const edit = (c: Awaited<ReturnType<typeof inReview>>, over: Record<string, unknown> = {}) => ({
  id: c.id,
  title: "Send-back spring",
  description: "A spring of planting and water work.",
  financialTarget: 500,
  durationDays: 90,
  items: Object.values(asSent(c)),
  ...over,
});

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

describe("Stewards edit before it goes live, and send it again", () => {
  it.skipIf(skipIfNoDb)("changes the title, money ask and days, edits, adds and removes needs, and the totals follow", async () => {
    const c = await inReview("Orchard");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: NOTE });
    const s = stewardCaller(STEWARD).campaigns;
    // The wheelbarrow carries a "Needed to start" mark and its own arrival
    // note; the campaign-wide note stays when it goes.
    await s.setNeededToStart({ campaignItemId: c.barrow.id, marked: true });
    await s.setArrivalNote({ campaignId: c.id, campaignItemId: c.barrow.id, whatToBring: "Gloves" });
    await s.setArrivalNote({ campaignId: c.id, whereToGo: "The barn by the gate" });

    const sent = asSent(c);
    expect(await s.updateDraft(edit(c, {
      title: "Send-back orchard and water",
      financialTarget: 750,
      durationDays: 45,
      items: [
        { ...sent.pump, estimatedValue: 2500 },
        { ...sent.lead, hoursPerWeek: 12, quantityWanted: 12, estimatedValue: 4800 },
        { category: "resource", kind: "item", capitalType: "living", resourceName: "Seed trays", quantityWanted: 3, resourceQuantity: 3, estimatedValue: 60, acceptsGift: true, acceptsLoan: false },
      ],
    }))).toEqual({ success: true });

    const after = await row(c.id);
    expect(after).toMatchObject({
      status: "draft", title: "Send-back orchard and water", financialTarget: 750, durationDays: 45,
      totalValue: 7360, resourcesValue: 2560, rolesValue: 4800, equipmentValue: 0, landValue: 0,
    });
    const items = await dbHelpers.getCampaignItems(c.id);
    expect(items).toHaveLength(3);
    expect(items.find((i) => i.id === c.pump.id)).toMatchObject({ estimatedValue: 2500, resourceName: "Well pump", resourceDescription: "Water first" });
    expect(items.find((i) => i.id === c.lead.id)).toMatchObject({ quantityWanted: 12, hoursPerWeek: 12, capacityUnit: "hours_per_week", estimatedValue: 4800 });
    expect(items.find((i) => i.resourceName === "Seed trays")).toMatchObject({ kind: "item", category: "resource", capitalType: "living", quantityWanted: 3, capacityUnit: "count" });
    expect(items.find((i) => i.id === c.barrow.id)).toBeUndefined();

    const database = await dbHelpers.getDb();
    expect(await database!.select().from(campaignNeedMarkers).where(eq(campaignNeedMarkers.campaignItemId, c.barrow.id))).toEqual([]);
    const notes = await database!.select().from(campaignArrivalNotes).where(eq(campaignArrivalNotes.campaignId, c.id));
    expect(notes.map((n) => n.campaignItemId)).toEqual([0]);

    // It can be edited in review too, then send it again from draft.
    expect(await s.submitForReview({ id: c.id })).toEqual({ success: true });
    expect((await row(c.id)).status).toBe("pending_review");
    await stewardCaller(CO_STEWARD).campaigns.updateDraft(edit(c, {
      title: "Send-back orchard",
      items: (await dbHelpers.getCampaignItems(c.id)).map((i) => i.id === c.pump.id
        ? { ...sent.pump, estimatedValue: 2600 }
        : i.id === c.lead.id
          ? { ...sent.lead, hoursPerWeek: 12, quantityWanted: 12, estimatedValue: 4800 }
          : { id: i.id, category: "resource" as const, kind: "item" as const, resourceName: "Seed trays", quantityWanted: 3, estimatedValue: 60 }),
    }));
    expect(await row(c.id)).toMatchObject({ status: "pending_review", title: "Send-back orchard", totalValue: 7460 });
  });

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

  it.skipIf(skipIfNoDb)("refuses on a live campaign, an example, a stranger, and a need at 0", async () => {
    const live = await inReview("Live");
    await adminCaller().campaigns.updateStatus({ id: live.id, status: "active" });
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(live)))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "This campaign is live, so it can't be edited this way." });

    const example = await inReview("Example");
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, example.id));
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(example)))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Example campaigns can't be edited." });

    const c = await inReview("Guarded");
    await expect(stewardCaller(STRANGER).campaigns.updateDraft(edit(c)))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "Only this project's stewards can edit it." });
    const sent = asSent(c);
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(c, { items: [{ ...sent.pump, estimatedValue: 0 }, sent.lead] })))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: ZERO_VALUE.server("Well pump") });
    // A need from another campaign is refused, and nothing changed.
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(c, { items: [{ ...sent.pump, id: live.pump.id }] })))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await dbHelpers.getCampaignItems(c.id)).toHaveLength(3);
    expect((await row(c.id)).title).toBe("Send-back Guarded");
  });

  it.skipIf(skipIfNoDb)("never removes a need that has an offer on it", async () => {
    const c = await inReview("Offered");
    const database = await dbHelpers.getDb();
    await database!.insert(campaignContributions).values({
      campaignId: c.id, campaignItemId: c.barrow.id, contributorName: "Lane Four", contributorEmail: "offer@b1-lane.invalid",
      contributionType: "equipment", title: "Spare barrow", estimatedValue: 150, status: "pending",
    });
    const sent = asSent(c);
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(c, { items: [sent.pump, sent.lead] })))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Wheelbarrow has offers on it, so it can't be removed." });
    expect(await dbHelpers.getCampaignItems(c.id)).toHaveLength(3);
  });

  it.skipIf(skipIfNoDb)("a campaign sent back under the old Reject keeps the note and can be sent for review", async () => {
    const c = await inReview("Legacy");
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "rejected", reviewNotes: NOTE });
    expect(await row(c.id)).toMatchObject({ status: "rejected", stewardReviewNote: NOTE });
    expect((await stewardCaller(STEWARD).campaigns.getReviewNote({ campaignId: c.id })).note).toBe(NOTE);
    await stewardCaller(STEWARD).campaigns.updateDraft(edit(c, { title: "Send-back Legacy, valued" }));
    expect(await stewardCaller(STEWARD).campaigns.submitForReview({ id: c.id })).toEqual({ success: true });
    expect(await row(c.id)).toMatchObject({ status: "pending_review", title: "Send-back Legacy, valued" });
    // An admin can also send a legacy one back to draft.
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "rejected" });
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "draft", reviewNotes: "One more photo." });
    expect(await row(c.id)).toMatchObject({ status: "draft", stewardReviewNote: "One more photo." });
  });

  it.skipIf(skipIfNoDb)("a read made before someone else changed the campaign gets CONFLICT, and writes nothing", async () => {
    const c = await inReview("Race");
    const before = await row(c.id);
    // The steward's read still says in review; the admin approved a moment later.
    stale.set(c.id, before);
    await adminCaller().campaigns.updateStatus({ id: c.id, status: "active" });
    await expect(stewardCaller(STEWARD).campaigns.updateDraft(edit(c, { title: "Send-back Race, late" })))
      .rejects.toMatchObject({ code: "CONFLICT", message: "Someone just changed this campaign. Refresh and try again." });
    stale.clear();
    expect(await row(c.id)).toMatchObject({ status: "active", title: "Send-back Race" });
    expect(await dbHelpers.getCampaignItems(c.id)).toHaveLength(3);

    // The same for sending a sent-back campaign for review again.
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
