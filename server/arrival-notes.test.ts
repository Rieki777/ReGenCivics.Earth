/**
 * The arrival note (build spec 2026-09-27, section 11; research R35).
 *
 * A project's stewards write what someone needs once their offer is
 * accepted: one note for the campaign and an optional note per need that
 * fills in anything it leaves blank. It lives in campaign_arrival_notes,
 * never on campaign_items (getItems and getById return every campaign_items
 * column, finding F6), and only three readers ever see it: the stewards,
 * the person whose offer stands (by user id) and that offer's status link.
 *
 * The sentinel test stores one unmistakable string in every field and checks
 * no public read carries it, for anyone.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import {
  campaigns,
  campaignArrivalNotes,
  campaignContributions,
  campaignItems,
  contributionStatusTokens,
} from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  realOffer,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./lib/forum-notify", async (orig) => ({
  ...(await orig<typeof import("./lib/forum-notify")>()),
  insertNotification: vi.fn().mockResolvedValue(true),
}));
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

import { PUBLIC_CAMPAIGN_FIELDS } from "./routes/campaigns";
import { HUB_CONTRACT } from "../shared/hubContract";
import { ARRIVAL } from "../shared/crowdpoolCopy";
import { ARRIVAL_FIELDS } from "../shared/offerStatus";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986801;
const CO_STEWARD = 986802;
const STRANGER = 986803;
const CONTRIB = 986804;
const OTHER = 986805;
const createdCampaignIds: number[] = [];

const SENTINEL = "ZQXARRIVALSENTINEL";

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    const rows = await database!.select({ id: campaignContributions.id }).from(campaignContributions)
      .where(inArray(campaignContributions.campaignId, createdCampaignIds));
    if (rows.length) {
      await database!.delete(contributionStatusTokens).where(inArray(contributionStatusTokens.contributionId, rows.map((r) => r.id)));
    }
    await database!.delete(campaignArrivalNotes).where(inArray(campaignArrivalNotes.campaignId, createdCampaignIds));
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A live campaign with two needs. */
async function campaign(title: string, opts: { isDemo?: boolean; live?: boolean } = {}) {
  const applicationId = await createApprovedApplication(STEWARD, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Arrival ${title}`,
    description: "Arrival note fixture",
    projectName: `Test Arrival ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    items: [
      { category: "resource", resourceName: "Seed trays", resourceDescription: "Trays", estimatedValue: 2000, quantityWanted: 20 },
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
  // By name: the read's order is not guaranteed.
  const trays = items.find((it) => it.resourceName === "Seed trays")!;
  const barrow = items.find((it) => it.equipmentName === "Wheelbarrow")!;
  return { campaignId: id, applicationId, trays: trays.id as number, barrow: barrow.id as number };
}

function offerAs(userId: number, campaignId: number, itemId: number | null, title = "Seed trays") {
  return realOffer(stewardCaller(userId).campaigns.submitContribution({
    campaignId,
    ...(itemId ? { campaignItemId: itemId } : {}),
    contributionType: "resource",
    title,
    contributorName: `Person ${userId}`,
    contributorEmail: `fixture${userId}@example.com`,
    estimatedValue: 100,
  }));
}

async function setStatus(contributionId: number, status: "accepted" | "rejected" | "fulfilled" | "thanked" | "released") {
  const extra = status === "thanked" ? { acknowledgedNote: "Thank you" } : {};
  return stewardCaller(STEWARD).campaigns.updateContributionStatus({ contributionId, status, ...extra } as any);
}

const everyField = (text: string) => Object.fromEntries(ARRIVAL_FIELDS.map((f) => [f, `${text} ${f}`]));

describe("campaigns.setArrivalNote and getArrivalNotes", () => {
  it.skipIf(skipIfNoDb)("a steward writes the campaign note and a need's note; another steward reads both; all empty deletes", async () => {
    const { campaignId, trays } = await campaign("Write");
    const s = stewardCaller(STEWARD).campaigns;
    expect(await s.getArrivalNotes({ campaignId })).toEqual([]);

    expect(await s.setArrivalNote({ campaignId, whereToGo: "  <b>Gate 3</b> & barn  ", meals: "Lunch is on us" }))
      .toMatchObject({ success: true, saved: true });
    expect(await s.setArrivalNote({ campaignId, campaignItemId: trays, whatToBring: "Gloves", askFor: "Maria" }))
      .toMatchObject({ success: true, saved: true });

    const notes = await stewardCaller(CO_STEWARD).campaigns.getArrivalNotes({ campaignId });
    expect(notes.map((n) => n.campaignItemId)).toEqual([0, trays]);
    expect(notes[0]).toMatchObject({ whereToGo: "Gate 3 &amp; barn", meals: "Lunch is on us", whatToBring: null, askFor: null });
    expect(notes[1]).toMatchObject({ whatToBring: "Gloves", askFor: "Maria", whereToGo: null });

    const database = await dbHelpers.getDb();
    const [row] = await database!.select().from(campaignArrivalNotes).where(eq(campaignArrivalNotes.campaignId, campaignId));
    expect(row.updatedBy).toBe(STEWARD);

    // A save replaces the note; a co-steward's save is theirs.
    await stewardCaller(CO_STEWARD).campaigns.setArrivalNote({ campaignId, whereToGo: "Gate 4" });
    const [again] = await stewardCaller(STEWARD).campaigns.getArrivalNotes({ campaignId });
    expect(again).toMatchObject({ campaignItemId: 0, whereToGo: "Gate 4", meals: null });

    // All empty deletes the row.
    expect(await s.setArrivalNote({ campaignId, whereToGo: "   ", meals: "" })).toMatchObject({ saved: false, deleted: true });
    expect((await s.getArrivalNotes({ campaignId })).map((n) => n.campaignItemId)).toEqual([trays]);
  });

  it.skipIf(skipIfNoDb)("keeps each field inside its column after sanitizing", async () => {
    const { campaignId } = await campaign("Long");
    await stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId, whereToGo: "&".repeat(500), askFor: "a".repeat(120) });
    const [n] = await stewardCaller(STEWARD).campaigns.getArrivalNotes({ campaignId });
    expect(n.whereToGo!.length).toBeLessThanOrEqual(500);
    expect(n.whereToGo).toMatch(/^(&amp;)+$/);
    expect(n.askFor).toBe("a".repeat(120));
    await expect(stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId, askFor: "a".repeat(121) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.skipIf(skipIfNoDb)("a stranger gets FORBIDDEN, a signed-out caller UNAUTHORIZED, a need from elsewhere BAD_REQUEST", async () => {
    const { campaignId } = await campaign("Stranger");
    const other = await campaign("Stranger other");
    const x = stewardCaller(STRANGER).campaigns;
    await expect(x.getArrivalNotes({ campaignId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(x.setArrivalNote({ campaignId, whereToGo: "Mine now" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(x.getArrivalNotes({ campaignId: 999_999_999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.getArrivalNotes({ campaignId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonCaller().campaigns.setArrivalNote({ campaignId, whereToGo: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId, campaignItemId: other.trays, whereToGo: "x" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await stewardCaller(STEWARD).campaigns.getArrivalNotes({ campaignId })).toEqual([]);
    // An admin may read and write.
    expect(await adminCaller().campaigns.setArrivalNote({ campaignId, beds: "Two, ask first" })).toMatchObject({ saved: true });
  });

  it.skipIf(skipIfNoDb)("examples keep their records; cancelled and closed campaigns keep their notes; a completed one can still change", async () => {
    const example = await campaign("Example", { isDemo: true });
    await expect(stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId: example.campaignId, whereToGo: "x" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: ARRIVAL.exampleOnly });

    const cancelled = await campaign("Cancelled");
    await stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId: cancelled.campaignId, whereToGo: "Gate 3" });
    await stewardCaller(STEWARD).campaigns.cancel({ id: cancelled.campaignId });
    await expect(stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId: cancelled.campaignId, whereToGo: "Gate 9" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: ARRIVAL.closedCampaign });
    expect((await stewardCaller(STEWARD).campaigns.getArrivalNotes({ campaignId: cancelled.campaignId }))[0].whereToGo).toBe("Gate 3");

    const database = await dbHelpers.getDb();
    const closed = await campaign("Closed");
    await database!.update(campaigns).set({ status: "closed", closedAt: new Date(), closeOutcome: "did_not_complete" })
      .where(eq(campaigns.id, closed.campaignId));
    await expect(stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId: closed.campaignId, whereToGo: "x" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: ARRIVAL.closedCampaign });

    const complete = await campaign("Complete");
    await database!.update(campaigns).set({ status: "completed", completedAt: new Date() }).where(eq(campaigns.id, complete.campaignId));
    expect(await stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId: complete.campaignId, whereToGo: "Still arriving" }))
      .toMatchObject({ saved: true });
  });
});

describe("campaigns.myArrivalNotes", () => {
  it.skipIf(skipIfNoDb)("resolves field by field for accepted, delivered and thanked offers only, and only the caller's", async () => {
    const { campaignId, trays, barrow } = await campaign("Mine");
    const s = stewardCaller(STEWARD).campaigns;
    await s.setArrivalNote({ campaignId, whereToGo: "Main gate", meals: "Lunch is on us" });
    await s.setArrivalNote({ campaignId, campaignItemId: trays, whereToGo: "Back barn", beds: "Two, ask first" });

    const waiting = await offerAs(CONTRIB, campaignId, trays, "Waiting trays");
    const accepted = await offerAs(CONTRIB, campaignId, trays, "Accepted trays");
    const delivered = await offerAs(CONTRIB, campaignId, trays, "Delivered trays");
    const thanked = await offerAs(CONTRIB, campaignId, trays, "Thanked trays");
    const declined = await offerAs(CONTRIB, campaignId, trays, "Declined trays");
    const onBarrow = await offerAs(CONTRIB, campaignId, barrow, "Barrow");
    const freeform = await offerAs(CONTRIB, campaignId, null, "A spare hand");
    const someoneElse = await offerAs(OTHER, campaignId, trays, "Other trays");

    await setStatus(accepted.id, "accepted");
    await setStatus(delivered.id, "accepted");
    await setStatus(delivered.id, "fulfilled");
    await setStatus(thanked.id, "accepted");
    await setStatus(thanked.id, "fulfilled");
    await setStatus(thanked.id, "thanked");
    await setStatus(declined.id, "rejected");
    await setStatus(onBarrow.id, "accepted");
    await setStatus(freeform.id, "accepted");
    await setStatus(someoneElse.id, "accepted");

    const mine = await stewardCaller(CONTRIB).campaigns.myArrivalNotes();
    const byId = new Map(mine.map((m) => [m.contributionId, m.note]));
    expect([...byId.keys()].sort()).toEqual([accepted.id, delivered.id, thanked.id, onBarrow.id, freeform.id].sort());
    expect(byId.has(waiting.id)).toBe(false);
    expect(byId.has(declined.id)).toBe(false);
    expect(byId.has(someoneElse.id)).toBe(false);

    // The need's note wins where it says something; the campaign note fills the rest.
    expect(byId.get(accepted.id)).toEqual({
      whereToGo: "Back barn", whatToBring: null, askFor: null, meals: "Lunch is on us", beds: "Two, ask first", gettingThere: null,
    });
    // A need with no note of its own, and a freeform offer, read the campaign note.
    for (const id of [onBarrow.id, freeform.id]) {
      expect(byId.get(id)).toEqual({
        whereToGo: "Main gate", whatToBring: null, askFor: null, meals: "Lunch is on us", beds: null, gettingThere: null,
      });
    }
    const others = (await stewardCaller(OTHER).campaigns.myArrivalNotes()).map((m) => m.contributionId);
    expect(others).toContain(someoneElse.id);
    for (const id of [accepted.id, delivered.id, thanked.id, onBarrow.id, freeform.id]) expect(others).not.toContain(id);
    await expect(anonCaller().campaigns.myArrivalNotes()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  }, 60_000);

  it.skipIf(skipIfNoDb)("skips offers with no note to read", async () => {
    const { campaignId, trays } = await campaign("No note");
    const accepted = await offerAs(CONTRIB, campaignId, trays);
    await setStatus(accepted.id, "accepted");
    const mine = await stewardCaller(CONTRIB).campaigns.myArrivalNotes();
    expect(mine.find((m) => m.contributionId === accepted.id)).toBeUndefined();
  });
});

describe("the note is never public", () => {
  it.skipIf(skipIfNoDb)("no public read carries it, for a visitor, a stranger, a steward or a contributor; the contract key sets are unchanged", async () => {
    const { campaignId, applicationId, trays } = await campaign("Sentinel");
    const expectedKeys = [...PUBLIC_CAMPAIGN_FIELDS, "items", "images", "coverImage", "contributorsCount", "isFollowing", "progress"].sort();
    const itemKeysBefore = Object.keys((await anonCaller().campaigns.getItems({ campaignId }))[0]).sort();

    await stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId, ...everyField(SENTINEL) });
    await stewardCaller(STEWARD).campaigns.setArrivalNote({ campaignId, campaignItemId: trays, ...everyField(SENTINEL) });
    const accepted = await offerAs(CONTRIB, campaignId, trays);
    await setStatus(accepted.id, "accepted");
    // A signed-out waiting offer: its status link must not carry the note either.
    const waiting = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId, campaignItemId: trays, contributionType: "resource", title: "Seed trays",
      contributorName: "Link Person", contributorEmail: "link.person@example.com", estimatedValue: 100,
    }));

    const callers = [
      ["anonymous", anonCaller()],
      ["stranger", stewardCaller(STRANGER)],
      ["steward", stewardCaller(STEWARD)],
      ["contributor", stewardCaller(CONTRIB)],
    ] as const;
    for (const [who, caller] of callers) {
      const reads: Array<[string, unknown]> = [
        ["getById", await caller.campaigns.getById({ id: campaignId })],
        ["getItems", await caller.campaigns.getItems({ campaignId })],
        ["getContributions", await caller.campaigns.getContributions({ campaignId })],
        ["getActivity", await caller.campaigns.getActivity({ campaignId })],
        ["listOpenNeeds", await caller.campaigns.listOpenNeeds()],
        ["projects.getPublic", await caller.projects.getPublic({ key: String(applicationId) })],
      ];
      for (const [name, value] of reads) {
        expect(JSON.stringify(value), `${name} for ${who}`).not.toContain(SENTINEL);
      }
      const view = await caller.campaigns.getById({ id: campaignId });
      expect(Object.keys(view!).sort(), `getById keys for ${who}`).toEqual(expectedKeys);
      const items = await caller.campaigns.getItems({ campaignId });
      expect(Object.keys(items[0]).sort(), `need keys for ${who}`).toEqual(itemKeysBefore);
      for (const f of ARRIVAL_FIELDS) expect(Object.keys(items[0])).not.toContain(f);
    }
    // The gallery list once (it reads every live campaign, so one caller is enough).
    expect(JSON.stringify(await anonCaller().campaigns.list({ status: "active" }))).not.toContain(SENTINEL);
    expect(HUB_CONTRACT.crowdpool).toBe(5);

    // The status link shows the note only once the offer stands.
    const token = /\/offer#([A-Za-z0-9_-]{43})/.exec(String(waiting.statusPath))![1];
    const pendingView = await anonCaller().offerStatus.view({ token });
    expect(JSON.stringify(pendingView)).not.toContain(SENTINEL);
    await setStatus(waiting.id, "accepted");
    const standingView = await anonCaller().offerStatus.view({ token });
    expect(standingView.arrivalNote?.whereToGo).toBe(`${SENTINEL} whereToGo`);
    // And the contributor reads it through their own offers only.
    const mine = await stewardCaller(CONTRIB).campaigns.myArrivalNotes();
    expect(mine.find((m) => m.contributionId === accepted.id)?.note.askFor).toBe(`${SENTINEL} askFor`);
    expect(await stewardCaller(STRANGER).campaigns.myArrivalNotes()).toEqual([]);
  }, 120_000);
});
