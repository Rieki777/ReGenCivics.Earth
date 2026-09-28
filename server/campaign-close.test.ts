/**
 * The close date (build spec 2026-09-27, section 9): server/lib/campaign-close.ts
 * and the daily job that runs it (server/jobs/crowdpoolDailyJob.ts).
 *
 * At the close date a real live campaign whose two halves both landed moves
 * to `completed`; any other moves to `closed`. Waiting offers close with
 * thanks, accepted offers that had not started are released, offers already
 * underway stay (with no delivery window left to sweep), delivered help stays
 * on the record. Everyone involved hears once: on the spine, and people
 * without an account through the cancellation email worded for the close.
 * A second run and two runs at once send nothing new. Examples never close.
 *
 * Run against the SCRATCH database, never production. Every job call is
 * scoped to this file's own campaigns (onlyCampaignIds).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import * as dbHelpers from "./db";
import {
  campaigns,
  campaignContributions,
  campaignItems,
  campaignUpdates,
  userFollows,
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
// Other open needs come from the whole Needs tab; a fixed list keeps the
// words exact. otherOpenNeeds itself is checked at the end with the real one.
vi.mock("./lib/open-needs", async (orig) => ({
  ...(await orig<typeof import("./lib/open-needs")>()),
  otherOpenNeeds: vi.fn().mockResolvedValue([
    { title: "Farm manager", projectName: "Green Hill", verb: "Apply", path: "/project/c1-green-hill?campaign=1&need=5" },
  ]),
}));

import { insertNotification } from "./lib/forum-notify";
import { closeCampaign, closeDueCampaigns, crowdpoolSwitchOn, resumeUnnoticedCloses } from "./lib/campaign-close";
import { runCrowdpoolDailyJob } from "./jobs/crowdpoolDailyJob";
import { retryPendingCampaignEndEmails } from "./lib/campaign-cancel";
import { expireCrowdpoolClaims } from "./routes/batchJobs";
import { formatCloseDate } from "../shared/campaignProgress";
import { formatShortDay, todayUtc } from "../shared/crowdpoolNeedAction";
import { textForEmail } from "../shared/htmlText";

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 988001;
const CO_STEWARD = 988002;
const ACC_PENDING = 988003;
const ACC_GIFT = 988004;
const ACC_LEND = 988005;
const ACC_DELIVERED = 988006;
const FOLLOWER = 988007;
const PROJECT_FOLLOWER = 988008;
const DB_TIMEOUT = 60_000;

const createdCampaignIds: number[] = [];
const insertMock = vi.mocked(insertNotification);
const on = async () => 1;

beforeEach(() => insertMock.mockClear());

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaignUpdates).where(inArray(campaignUpdates.campaignId, createdCampaignIds));
    await database!.delete(userFollows).where(inArray(userFollows.userId, [FOLLOWER, PROJECT_FOLLOWER]));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

type Item = Parameters<ReturnType<typeof stewardCaller>["campaigns"]["create"]>[0]["items"][number];

/** A live campaign of OWNER's (CO_STEWARD co-stewards), 30 days long. */
async function liveCampaign(title: string, items: Item[], financialTarget = 0) {
  const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title: `Test Close ${title}`,
    description: "Close fixture",
    projectName: `Test Close ${title}`,
    currency: "USD",
    financialTarget,
    applicationId,
    durationDays: 30,
    items,
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const needs = await stewardCaller(OWNER).campaigns.getItems({ campaignId: id });
  return { id, applicationId, needs };
}

/** Its close date passed a day ago. */
async function makeDue(id: number) {
  const database = await dbHelpers.getDb();
  await database!.execute(sql`
    UPDATE campaigns SET startedAt = NOW() - INTERVAL 31 DAY, publishedAt = NOW() - INTERVAL 31 DAY
    WHERE id = ${id}
  `);
}

const row = async (id: number) => (await dbHelpers.getContributionById(id))!;
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** A live campaign with offers in every state a close cares about. */
async function busyCampaign(title: string) {
  const f = await liveCampaign(title, [
    { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    { category: "role", kind: "role", roleTitle: "Organiser", hoursPerWeek: 40, estimatedValue: 4000 },
    { category: "equipment", kind: "item", equipmentName: "Trailer", estimatedValue: 3000, acceptsGift: false, acceptsLoan: true },
    { category: "resource", resourceName: "Planting day", resourceDescription: "A shift", estimatedValue: 500, quantityWanted: 5 },
  ]);
  const seed = f.needs.find((n) => n.resourceName === "Seed")!;
  const role = f.needs.find((n) => n.kind === "role")!;
  const trailer = f.needs.find((n) => n.equipmentName === "Trailer")!;
  const shift = f.needs.find((n) => n.resourceName === "Planting day")!;
  const database = await dbHelpers.getDb();
  // A shift that starts in ten days has not started at the close.
  await database!.execute(sql`UPDATE campaign_items SET kind = 'shift', shiftStartsAt = NOW() + INTERVAL 10 DAY WHERE id = ${shift.id}`);

  const steward = stewardCaller(OWNER);
  const offer = (caller: ReturnType<typeof anonCaller>, email: string, name: string, itemId: number, type: string, title: string, extra: Record<string, unknown> = {}) =>
    realOffer(caller.campaigns.submitContribution({
      campaignId: f.id, campaignItemId: itemId, contributionType: type, title,
      contributorName: name, contributorEmail: email, estimatedValue: 100, ...extra,
    } as any));
  const accept = (id: number) => steward.campaigns.updateContributionStatus({ contributionId: id, status: "accepted" });

  const pendingAcc = await offer(stewardCaller(ACC_PENDING), "acc.pending@example.com", "Pen", seed.id, "resource", "Seed bag");
  const giftAcc = await offer(stewardCaller(ACC_GIFT), "acc.gift@example.com", "Gia", seed.id, "resource", "Seed box");
  await accept(giftAcc.id);
  const lendUntil = plusDays(60);
  const lendAcc = await offer(stewardCaller(ACC_LEND), "acc.lend@example.com", "Len", trailer.id, "equipment", "trailer", { offerMode: "lend", lendUntil });
  await accept(lendAcc.id);
  const deliveredAcc = await offer(stewardCaller(ACC_DELIVERED), "acc.delivered@example.com", "Del", seed.id, "resource", "Seed sack");
  await accept(deliveredAcc.id);
  await steward.campaigns.updateContributionStatus({ contributionId: deliveredAcc.id, status: "fulfilled" });
  // Pat offers twice without an account: one email, two lines.
  const patRole = await offer(anonCaller(), "Pat.Close@example.com", "Pat", role.id, "role", "Organiser", { hoursPerWeek: 10 });
  await accept(patRole.id);
  const patPending = await offer(anonCaller(), "pat.close@example.com", "Pat", seed.id, "resource", "Seed jar");
  const samShift = await offer(anonCaller(), "sam.close@example.com", "Sam", shift.id, "resource", "Planting day");
  await accept(samShift.id);
  const raeRejected = await offer(anonCaller(), "rae.close@example.com", "Rae", seed.id, "resource", "Seed tin");
  await steward.campaigns.updateContributionStatus({ contributionId: raeRejected.id, status: "rejected" });

  await stewardCaller(FOLLOWER).campaigns.follow({ campaignId: f.id });
  await stewardCaller(PROJECT_FOLLOWER).campaigns.followProject({ key: String(f.applicationId) });
  insertMock.mockClear();
  return {
    ...f, seedId: seed.id as number, roleId: role.id as number, trailerId: trailer.id as number, shiftId: shift.id as number, lendUntil,
    ids: {
      pendingAcc: pendingAcc.id, giftAcc: giftAcc.id, lendAcc: lendAcc.id, deliveredAcc: deliveredAcc.id,
      patRole: patRole.id, patPending: patPending.id, samShift: samShift.id, raeRejected: raeRejected.id,
    },
  };
}

describe("a close that didn't complete", () => {
  it.skipIf(skipIfNoDb)("closes waiting offers, releases what hadn't started, keeps what had, tells everyone once", async () => {
    const f = await busyCampaign("Not complete");
    await makeDue(f.id);
    const send = vi.fn().mockResolvedValue({ id: "sent" });
    const insert = vi.fn().mockResolvedValue(true);

    const result = await closeDueCampaigns({ onlyCampaignIds: [f.id], sendEmail: send as any, insert, readSwitch: on });
    expect(result).toMatchObject({ checked: 1, closed: 1, completed: 0, released: 2, paused: false });

    const c = (await dbHelpers.getCampaignById(f.id))!;
    expect(c.status).toBe("closed");
    expect(c.closeOutcome).toBe("did_not_complete");
    expect(c.closedAt).not.toBeNull();
    expect(c.completedAt).toBeNull();
    expect(c.closeNoticedAt).not.toBeNull();

    // Waiting offers close with thanks; the campaign takes nothing new.
    for (const id of [f.ids.pendingAcc, f.ids.patPending]) {
      expect((await row(id)).status).toBe("cancelled");
      expect((await row(id)).claimExpiresAt).toBeNull();
    }
    // A gift not yet given and a shift not yet started are released by the close.
    for (const id of [f.ids.giftAcc, f.ids.samShift]) {
      expect((await row(id)).status).toBe("released");
      expect((await row(id)).closeReleasedAt).not.toBeNull();
    }
    // A lend already on site and a role (no start date) had started: they stay,
    // with no delivery window left for the nightly sweep.
    for (const id of [f.ids.lendAcc, f.ids.patRole]) {
      expect((await row(id)).status).toBe("accepted");
      expect((await row(id)).claimExpiresAt).toBeNull();
      expect((await row(id)).closeReleasedAt).toBeNull();
    }
    expect((await row(f.ids.deliveredAcc)).status).toBe("fulfilled");
    expect((await row(f.ids.raeRejected)).status).toBe("rejected");

    // Counters from the rows: only the delivered seed stands on Seed.
    const seed = (await dbHelpers.getCampaignItemById(f.seedId))!;
    expect(seed.quantityClaimed).toBe(1);
    expect(seed.quantityDelivered).toBe(1);
    expect((await dbHelpers.getCampaignItemById(f.shiftId))!.quantityClaimed).toBe(0);
    expect((await dbHelpers.getCampaignItemById(f.roleId))!.quantityClaimed).toBe(10);

    // The spine: stewards, account contributors (not the declined), followers, once each.
    const notices = insert.mock.calls.map((call) => call[0] as any);
    expect(notices.every((n) => n.type === "campaign_closed")).toBe(true);
    expect(notices.map((n) => n.userId).sort()).toEqual(
      [OWNER, CO_STEWARD, ACC_PENDING, ACC_GIFT, ACC_LEND, ACC_DELIVERED, FOLLOWER, PROJECT_FOLLOWER].sort(),
    );
    for (const n of notices) expect(n.dedupeKey).toBe(`cp:close:${f.id}:u${n.userId}`);
    const closedOn = formatCloseDate(new Date(c.closedAt!));
    const byUser = (uid: number) => notices.find((n) => n.userId === uid)!;
    expect(byUser(OWNER).title).toBe(`Test Close Not complete closed without completing`);
    expect(byUser(OWNER).body).toBe(
      `Crowdpooling closed on ${closedOn}. 2 offers that hadn't started were released with a thank-you. Offers already underway stay with you to mark delivered or release. Help already given stays recorded in the project's token.`,
    );
    const others = "These could use you now: Apply Farm manager at Green Hill.";
    expect(byUser(ACC_PENDING).body).toBe(`Your offer of "Seed bag" was still waiting, so it's closed with our thanks. ${others}`);
    expect(byUser(ACC_GIFT).body).toBe(`Your offer of "Seed box" hadn't started, so it's released with our thanks. ${others}`);
    expect(byUser(ACC_LEND).body).toBe(`Your trailer goes home on ${formatShortDay(f.lendUntil, todayUtc())}, or sooner if you ask the stewards. ${others}`);
    expect(byUser(ACC_DELIVERED).body).toBe(`What you gave for "Seed sack" stays recorded in Test Close Not complete's token. ${others}`);
    expect(byUser(FOLLOWER).body).toBe(
      `Crowdpooling at Test Close Not complete closed on ${closedOn} without completing. You still follow Test Close Not complete, so you'll hear when it asks again.`,
    );
    expect(result.results[0].notified).toBe(8);

    // People without an account: one email per address, worded for the close.
    const to = send.mock.calls.map((call) => String(call[0].to).toLowerCase()).sort();
    expect(to).toEqual(["pat.close@example.com", "sam.close@example.com"]);
    const pat = send.mock.calls.find((call) => String(call[0].to).toLowerCase() === "pat.close@example.com")![0];
    expect(pat.subject).toBe("Test Close Not complete closed without completing");
    expect(pat.template).toBe("campaign_closed");
    expect(pat.html).toContain(`Crowdpooling for Test Close Not complete from Test Close Not complete closed on ${closedOn} without completing.`);
    expect(pat.html).toContain(textForEmail(`Your offer of "Seed jar" was still waiting, so it's closed with our thanks.`));
    expect(pat.html).toContain(textForEmail("Your place in Organiser stays with the stewards, who will mark it delivered or release it."));
    expect(pat.html).toContain("These could use your help now:");
    expect(pat.html).toContain("Farm manager");
    const sam = send.mock.calls.find((call) => String(call[0].to).toLowerCase() === "sam.close@example.com")![0];
    expect(sam.html).toContain(textForEmail(`Your offer of "Planting day" hadn't started, so it's released with our thanks.`));
    expect((await row(f.ids.patPending)).cancelNoticedAt).not.toBeNull();
    expect((await row(f.ids.samShift)).cancelNoticedAt).not.toBeNull();
    expect((await row(f.ids.raeRejected)).cancelNoticedAt).toBeNull();

    // The expiry sweep leaves the standing lend alone, even with its window "passed".
    const database = await dbHelpers.getDb();
    await expireCrowdpoolClaims(database);
    expect((await row(f.ids.lendAcc)).status).toBe("accepted");

    // Offers are refused after the close, and nothing can be accepted again.
    await expect(anonCaller().campaigns.submitContribution({
      campaignId: f.id, campaignItemId: f.seedId, contributionType: "resource", title: "Too late",
      contributorName: "Late", contributorEmail: "late.close@example.com", estimatedValue: 10,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: f.ids.raeRejected, status: "accepted" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    // And nobody moves it by hand.
    await expect(adminCaller().campaigns.updateStatus({ id: f.id, status: "active" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // A second run, and two runs at once, send nothing new.
    insert.mockClear();
    send.mockClear();
    const again = await runCrowdpoolDailyJob({ onlyCampaignIds: [f.id], sendEmail: send as any, insert, readSwitch: on, leaseMinutes: 0 });
    expect(again).toMatchObject({ closed: 0, completed: 0, released: 0, resumed: 0, errors: [] });
    await Promise.all([
      runCrowdpoolDailyJob({ onlyCampaignIds: [f.id], sendEmail: send as any, insert, readSwitch: on, leaseMinutes: 0 }),
      runCrowdpoolDailyJob({ onlyCampaignIds: [f.id], sendEmail: send as any, insert, readSwitch: on, leaseMinutes: 0 }),
    ]);
    expect(insert.mock.calls.filter((call) => (call[0] as any).type === "campaign_closed")).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
    expect(await closeCampaign(f.id, { readSwitch: on })).toMatchObject({ result: "already_closed", outcome: "did_not_complete" });
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("closed is public: getById, list and the project page carry closedAt and closeOutcome", async () => {
    const f = await liveCampaign("Public after", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    await makeDue(f.id);
    await closeCampaign(f.id, { readSwitch: on, sendEmail: vi.fn().mockResolvedValue({ id: "x" }) as any, insert: vi.fn().mockResolvedValue(true) });
    const view = await anonCaller().campaigns.getById({ id: f.id });
    expect(view).toMatchObject({ status: "closed", closeOutcome: "did_not_complete" });
    expect(view!.closedAt).not.toBeNull();
    expect(view!.progress.state).toBe("did_not_complete");
    expect(view!.progress.closedAt).toBe(new Date(view!.closedAt!).toISOString());
    const listed = (await anonCaller().campaigns.list({ status: "closed" })).find((c) => c.id === f.id);
    expect(listed).toMatchObject({ status: "closed", closeOutcome: "did_not_complete" });
    const page = await anonCaller().projects.getPublic({ key: String(f.applicationId) });
    expect(page.front!.id).toBe(f.id);
    expect(page.campaigns.find((c) => c.id === f.id)!.progress.state).toBe("did_not_complete");
  }, DB_TIMEOUT);
});

describe("a close that completed", () => {
  it.skipIf(skipIfNoDb)("moves to completed once, closes waiting offers with the completed wording", async () => {
    const f = await liveCampaign("Complete", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 1 },
    ]);
    const database = await dbHelpers.getDb();
    const [before] = await database!.execute(sql`SELECT fundedCampaignCount AS n FROM applications WHERE id = ${f.applicationId}`) as any;
    const countBefore = Number(before?.[0]?.n ?? 0);
    const seed = f.needs[0];
    // Two waiting offers first (one with an account, one without), then the one the stewards take.
    const waitingAcc = await realOffer(stewardCaller(ACC_PENDING).campaigns.submitContribution({
      campaignId: f.id, campaignItemId: seed.id, contributionType: "resource", title: "Spare seed",
      contributorName: "Pen", contributorEmail: "acc.pending@example.com", estimatedValue: 10,
    }));
    const waitingAnon = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: f.id, campaignItemId: seed.id, contributionType: "resource", title: "Extra seed",
      contributorName: "Wes", contributorEmail: "wes.close@example.com", estimatedValue: 10,
    }));
    const taken = await realOffer(stewardCaller(ACC_GIFT).campaigns.submitContribution({
      campaignId: f.id, campaignItemId: seed.id, contributionType: "resource", title: "The seed",
      contributorName: "Gia", contributorEmail: "acc.gift@example.com", estimatedValue: 10,
    }));
    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: taken.id, status: "accepted" });
    await makeDue(f.id);
    const send = vi.fn().mockResolvedValue({ id: "sent" });
    const insert = vi.fn().mockResolvedValue(true);

    // Two closes at once: one flips, the other finds it closed.
    const [a, b] = await Promise.all([
      closeCampaign(f.id, { readSwitch: on, sendEmail: send as any, insert }),
      closeCampaign(f.id, { readSwitch: on, sendEmail: send as any, insert }),
    ]);
    expect([a.result, b.result].sort()).toEqual(["already_closed", "completed"]);

    const c = (await dbHelpers.getCampaignById(f.id))!;
    expect(c.status).toBe("completed");
    expect(c.closeOutcome).toBe("complete");
    expect(c.completedAt).not.toBeNull();
    expect(c.closedAt).not.toBeNull();
    const [after] = await database!.execute(sql`SELECT fundedCampaignCount AS n FROM applications WHERE id = ${f.applicationId}`) as any;
    expect(Number(after?.[0]?.n ?? 0)).toBe(countBefore + 1);

    expect((await row(waitingAcc.id)).status).toBe("cancelled");
    expect((await row(waitingAnon.id)).status).toBe("cancelled");
    expect((await row(taken.id)).status).toBe("accepted");

    const notices = insert.mock.calls.map((call) => call[0] as any);
    const completed = notices.filter((n) => n.type === "campaign_completed");
    expect(completed.map((n) => n.userId).sort()).toEqual([OWNER, CO_STEWARD, ACC_GIFT].sort());
    const closed = notices.filter((n) => n.type === "campaign_closed");
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      userId: ACC_PENDING,
      title: "Test Close Complete is complete",
      body: 'It completed before the stewards answered your offer of "Spare seed", so your offer is closed with our thanks. These could use you now: Apply Farm manager at Green Hill.',
      dedupeKey: `cp:close:${f.id}:u${ACC_PENDING}`,
    });

    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(String(mail.to).toLowerCase()).toBe("wes.close@example.com");
    expect(mail.subject).toBe("Test Close Complete is complete");
    expect(mail.html).toContain("Test Close Complete from Test Close Complete completed before the stewards answered your offer, so it's closed with our thanks.");
    expect(mail.html).toContain("These could use your help now:");
  }, DB_TIMEOUT);
});

describe("held emails, interrupted notices, and what never closes", () => {
  it.skipIf(skipIfNoDb)("a held send is handed back and the retry sends it once", async () => {
    const f = await liveCampaign("Held", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    const offer = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: f.id, campaignItemId: f.needs[0].id, contributionType: "resource", title: "Held seed",
      contributorName: "Hal", contributorEmail: "hal.close@example.com", estimatedValue: 10,
    }));
    await makeDue(f.id);
    const held = vi.fn().mockResolvedValue({ id: null });
    await closeCampaign(f.id, { readSwitch: on, sendEmail: held as any, insert: vi.fn().mockResolvedValue(true) });
    expect(held).toHaveBeenCalledTimes(1);
    expect((await row(offer.id)).cancelNoticedAt).toBeNull(); // handed back

    const ok = vi.fn().mockResolvedValue({ id: "later" });
    const retry = await retryPendingCampaignEndEmails({ sendEmail: ok as any, onlyCampaignIds: [f.id] });
    expect(retry).toEqual({ campaigns: 1, sent: 1 });
    expect(ok.mock.calls[0][0].subject).toBe("Test Close Held closed without completing");
    expect((await row(offer.id)).cancelNoticedAt).not.toBeNull();
    const again = vi.fn().mockResolvedValue({ id: "x" });
    await retryPendingCampaignEndEmails({ sendEmail: again as any, onlyCampaignIds: [f.id] });
    expect(again).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("a close whose notices never went out is finished by the next run, once", async () => {
    const f = await liveCampaign("Interrupted", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    await stewardCaller(FOLLOWER).campaigns.follow({ campaignId: f.id });
    await makeDue(f.id);
    const database = await dbHelpers.getDb();
    // The flip landed, then the process stopped: no notices, no stamp.
    await database!.execute(sql`
      UPDATE campaigns SET status = 'closed', closeOutcome = 'did_not_complete',
             closedAt = NOW() - INTERVAL 1 HOUR, closeNoticedAt = NULL
      WHERE id = ${f.id}
    `);
    const insert = vi.fn().mockResolvedValue(true);
    expect(await resumeUnnoticedCloses({ onlyCampaignIds: [f.id], insert, sendEmail: vi.fn() as any })).toBe(1);
    expect(insert.mock.calls.map((call) => (call[0] as any).userId).sort()).toEqual([OWNER, CO_STEWARD, FOLLOWER].sort());
    expect((await dbHelpers.getCampaignById(f.id))!.closeNoticedAt).not.toBeNull();
    insert.mockClear();
    expect(await resumeUnnoticedCloses({ onlyCampaignIds: [f.id], insert })).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("examples past their date, campaigns not yet due, and a paused switch close nothing", async () => {
    const example = await liveCampaign("Example past date", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, example.id));
    await makeDue(example.id);
    const notDue = await liveCampaign("Not yet due", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    const paused = await liveCampaign("Paused", [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    await makeDue(paused.id);
    const insert = vi.fn().mockResolvedValue(true);

    const r = await closeDueCampaigns({ onlyCampaignIds: [example.id, notDue.id], insert, readSwitch: on });
    expect(r).toMatchObject({ checked: 0, closed: 0, completed: 0 });
    expect(await closeCampaign(example.id, { readSwitch: on })).toMatchObject({ result: "skipped", reason: "example" });
    expect(await closeCampaign(notDue.id, { readSwitch: on })).toMatchObject({ result: "skipped", reason: "not_due" });
    expect((await dbHelpers.getCampaignById(example.id))!.status).toBe("active");
    expect((await dbHelpers.getCampaignById(notDue.id))!.status).toBe("active");

    // crowdpool.auto_close = 0 pauses it; the dry run reports and writes nothing.
    const off = await closeDueCampaigns({ onlyCampaignIds: [paused.id], insert, readSwitch: async () => 0 });
    expect(off).toMatchObject({ paused: true, checked: 0 });
    const dry = await closeDueCampaigns({ onlyCampaignIds: [paused.id], insert, readSwitch: on, dryRun: true });
    expect(dry).toMatchObject({ checked: 1, closed: 1 });
    expect((await dbHelpers.getCampaignById(paused.id))!.status).toBe("active");
    expect(insert).not.toHaveBeenCalled();
    // The real switch reads from the game variable 0264 seeded (on).
    expect(await crowdpoolSwitchOn("crowdpool.auto_close")).toBe(true);
    expect(await crowdpoolSwitchOn("crowdpool.no_such_switch")).toBe(false);
  }, DB_TIMEOUT);
});

describe("other open needs", () => {
  it.skipIf(skipIfNoDb)("the real otherOpenNeeds offers real needs on other campaigns only", async () => {
    const real = await vi.importActual<typeof import("./lib/open-needs")>("./lib/open-needs");
    const f = await liveCampaign("Other needs", [
      { category: "resource", resourceName: "Unique seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
    ]);
    const list = await real.otherOpenNeeds(f.id, 5);
    expect(list.length).toBeLessThanOrEqual(5);
    for (const n of list) {
      expect(Object.keys(n).sort()).toEqual(["path", "projectName", "title", "verb"]);
      expect(n.path).not.toContain(`campaign=${f.id}&`);
    }
    expect(await real.otherOpenNeeds(f.id, 0)).toEqual([]);
  }, DB_TIMEOUT);
});
