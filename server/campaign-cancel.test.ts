/**
 * Cancelling a campaign (2026-09-24): server/lib/campaign-cancel.ts.
 *
 * Pending and accepted offers close into 'cancelled', delivered work stays,
 * counters and totals come from the rows, the steward's message becomes the
 * final update, everyone involved hears once on the spine (never the
 * actor), and each contributor without an account gets one email per
 * address. A held send stays queued for the retry. A second cancel does
 * nothing.
 *
 * Run against the SCRATCH database, never production.
 */
import { realOffer } from "./test-fixtures/crowdpool";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import {
  campaigns,
  campaignContributions,
  campaignItems,
  campaignUpdates,
  userFollows,
  users,
} from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  ctxFor,
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

import { insertNotification } from "./lib/forum-notify";
import { cancelCampaign, CANCEL_UPDATE_TITLE, retryPendingCancellationEmails, sendPendingCancellationEmails } from "./lib/campaign-cancel";
import { linkAnonymousContributions } from "./routes/campaigns";

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 986401;
const CO_STEWARD = 986402;
const ACCOUNT_A = 986403; // contributes with an account, pending
const ACCOUNT_B = 986404; // contributes with an account, delivered
const FOLLOWER = 986405;
const STRANGER = 986406;
const UNLINKED = 986407; // has an account, but offered signed out under the same email

const createdCampaignIds: number[] = [];
const createdUserOpenIds: string[] = [];
const insertMock = vi.mocked(insertNotification);

beforeEach(() => insertMock.mockClear());

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaignUpdates).where(inArray(campaignUpdates.campaignId, createdCampaignIds));
    await database!.delete(userFollows).where(inArray(userFollows.targetId, createdCampaignIds.map(String)));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  if (createdUserOpenIds.length) await database!.delete(users).where(inArray(users.openId, createdUserOpenIds));
  await cleanupFixtureApplications();
});

/** A live campaign with two needs and offers in every state that matters. */
async function busyCampaign(title: string) {
  const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title: `Test Cancel ${title}`,
    description: "Cancel fixture",
    projectName: `Test Cancel ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 10 },
      { category: "role", kind: "role", roleTitle: "Organiser", hoursPerWeek: 40, estimatedValue: 4000 },
    ],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const needs = await stewardCaller(OWNER).campaigns.getItems({ campaignId: id });
  const seed = needs.find((n) => n.kind !== "role")!;
  const role = needs.find((n) => n.kind === "role")!;
  const steward = stewardCaller(OWNER);
  const offer = (caller: ReturnType<typeof anonCaller>, email: string, name: string, itemId = seed.id, extra: Record<string, unknown> = {}) =>
    realOffer(caller.campaigns.submitContribution({
      campaignId: id, campaignItemId: itemId, contributionType: itemId === seed.id ? "resource" : "role",
      title: `${name} offer`, contributorName: name, contributorEmail: email, estimatedValue: 100, ...extra,
    } as any));

  const pendingAccount = await offer(stewardCaller(ACCOUNT_A), "a@example.com", "Acc A");
  const deliveredAccount = await offer(stewardCaller(ACCOUNT_B), "b@example.com", "Acc B");
  await steward.campaigns.updateContributionStatus({ contributionId: deliveredAccount.id, status: "accepted" });
  await steward.campaigns.updateContributionStatus({ contributionId: deliveredAccount.id, status: "fulfilled" });
  // Two signed-out offers under one address, different case: one email.
  const anon1 = await offer(anonCaller(), "Pat.Anon@example.com", "Pat");
  const anon2 = await offer(anonCaller(), "pat.anon@example.com", "Pat", role.id, { hoursPerWeek: 10 });
  await steward.campaigns.updateContributionStatus({ contributionId: anon1.id, status: "accepted" });
  await steward.campaigns.updateContributionStatus({ contributionId: anon2.id, status: "accepted" });
  const anonOther = await offer(anonCaller(), "sam.anon@example.com", "Sam");
  const rejected = await offer(anonCaller(), "rae.anon@example.com", "Rae");
  await steward.campaigns.updateContributionStatus({ contributionId: rejected.id, status: "rejected" });
  await stewardCaller(FOLLOWER).campaigns.follow({ campaignId: id });

  insertMock.mockClear(); // only the cancellation's own notices from here on
  return {
    campaignId: id, seedId: seed.id as number, roleId: role.id as number,
    ids: { pendingAccount: pendingAccount.id, deliveredAccount: deliveredAccount.id, anon1: anon1.id, anon2: anon2.id, anonOther: anonOther.id, rejected: rejected.id },
  };
}

const row = async (id: number) => (await dbHelpers.getContributionById(id))!;

function collector() {
  const runs: Promise<unknown>[] = [];
  return { background: (p: Promise<unknown>) => { runs.push(p); }, settle: () => Promise.all(runs) };
}

describe("cancelling", () => {
  it.skipIf(skipIfNoDb)("closes open offers, keeps delivered work, recomputes, posts the message, tells everyone once", async () => {
    const f = await busyCampaign("Full");
    const send = vi.fn().mockResolvedValue({ id: "sent" });
    const bg = collector();
    const result = await cancelCampaign(
      { campaignId: f.campaignId, actor: ctxFor(CO_STEWARD).user, message: "The land sale fell through. Thank you all." },
      { sendEmail: send as any, background: bg.background },
    );
    await bg.settle();

    expect(result.alreadyCancelled).toBe(false);
    expect(result.closedContributions).toBe(4); // pendingAccount, anon1, anon2, anonOther
    expect((await dbHelpers.getCampaignById(f.campaignId))!.status).toBe("cancelled");
    expect((await row(f.ids.pendingAccount)).status).toBe("cancelled");
    expect((await row(f.ids.anon1)).status).toBe("cancelled");
    expect((await row(f.ids.anon2)).status).toBe("cancelled");
    expect((await row(f.ids.anonOther)).status).toBe("cancelled");
    expect((await row(f.ids.deliveredAccount)).status).toBe("fulfilled");
    expect((await row(f.ids.rejected)).status).toBe("rejected");

    // Counters and totals from the rows: only the delivered seed stands.
    const seed = (await dbHelpers.getCampaignItemById(f.seedId))!;
    expect(seed.quantityClaimed).toBe(1);
    expect(seed.quantityDelivered).toBe(1);
    expect((await dbHelpers.getCampaignItemById(f.roleId))!.quantityClaimed).toBe(0);
    expect((await dbHelpers.getCampaignById(f.campaignId))!.pledgedTotal).toBe(100);

    // The message is the final update.
    const updates = await dbHelpers.listCampaignUpdates(f.campaignId);
    expect(updates[0].title).toBe(CANCEL_UPDATE_TITLE);
    expect(updates[0].body).toContain("The land sale fell through");

    // Spine: stewards (minus the actor), account contributors, account followers, once each.
    const notified = insertMock.mock.calls.map((c) => c[0] as any);
    expect(notified.every((n) => n.type === "campaign_cancelled")).toBe(true);
    expect(notified.map((n) => n.userId).sort()).toEqual([OWNER, ACCOUNT_A, ACCOUNT_B, FOLLOWER].sort());
    for (const n of notified) expect(n.dedupeKey).toBe(`cp:cancel:${f.campaignId}:u${n.userId}`);
    expect(notified[0].body).toContain("The land sale fell through");
    expect(result.notified).toBe(4);

    // One email per signed-out address, case-insensitive, with the cancel template.
    expect(result.emailQueued).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    const to = send.mock.calls.map((c) => String(c[0].to).toLowerCase()).sort();
    expect(to).toEqual(["pat.anon@example.com", "sam.anon@example.com"]);
    for (const c of send.mock.calls) {
      expect(c[0].subject).toBe("Test Cancel Full has been cancelled");
      expect(c[0].template).toBe("campaign_cancelled");
      expect(c[0].html).toContain("The land sale fell through");
      expect(c[0].html).toContain("Make your account");
      // A steward cancelled, so the email names the stewards.
      expect(c[0].html).toContain("The stewards of Test Cancel Full have cancelled Test Cancel Full.");
    }
    expect((await row(f.ids.anon1)).cancelNoticedAt).not.toBeNull();
    expect((await row(f.ids.anon2)).cancelNoticedAt).not.toBeNull();
    // The already-rejected signed-out offer is not part of the cancellation.
    expect((await row(f.ids.rejected)).cancelNoticedAt).toBeNull();

    // A second cancel changes nothing and sends nothing.
    insertMock.mockClear();
    send.mockClear();
    const again = await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(OWNER).user }, { sendEmail: send as any, background: bg.background });
    await bg.settle();
    expect(again.alreadyCancelled).toBe(true);
    expect(insertMock).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(await sendPendingCancellationEmails(f.campaignId, { sendEmail: send as any })).toEqual({ found: 0, sent: 0 });
  });

  it.skipIf(skipIfNoDb)("a send the hourly cap held stays queued, and the retry sends it once", async () => {
    const f = await busyCampaign("Held");
    const held = vi.fn().mockImplementation(async (p: any) =>
      String(p.to).toLowerCase().startsWith("sam") ? { id: null } : { id: "sent" });
    const bg = collector();
    await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(OWNER).user }, { sendEmail: held as any, background: bg.background });
    await bg.settle();
    expect(held).toHaveBeenCalledTimes(2);
    expect((await row(f.ids.anonOther)).cancelNoticedAt).toBeNull();
    expect((await row(f.ids.anon1)).cancelNoticedAt).not.toBeNull();

    const ok = vi.fn().mockResolvedValue({ id: "sent-later" });
    const retry = await retryPendingCancellationEmails({ sendEmail: ok as any });
    expect(retry.sent).toBeGreaterThanOrEqual(1);
    const toSam = ok.mock.calls.filter((c) => String(c[0].to).toLowerCase() === "sam.anon@example.com");
    expect(toSam).toHaveLength(1);
    expect(ok.mock.calls.some((c) => String(c[0].to).toLowerCase() === "pat.anon@example.com")).toBe(false);
    expect((await row(f.ids.anonOther)).cancelNoticedAt).not.toBeNull();
    // A second retry finds nothing more for this campaign.
    const ok2 = vi.fn().mockResolvedValue({ id: "x" });
    await sendPendingCancellationEmails(f.campaignId, { sendEmail: ok2 as any });
    expect(ok2).not.toHaveBeenCalled();
  });

  it.skipIf(skipIfNoDb)("an account holder with an unlinked signed-out offer hears once, on the spine", async () => {
    const f = await busyCampaign("Unlinked");
    const database = await dbHelpers.getDb();
    const openId = `fixture-open-${UNLINKED}-${Date.now()}`;
    createdUserOpenIds.push(openId);
    const inserted: any = await database!.insert(users).values({ openId, email: "unlinked.person@example.com", name: "Unlinked", loginMethod: "email", role: "user" });
    const unlinkedId = Number(inserted?.[0]?.insertId);
    await stewardCaller(unlinkedId).campaigns.follow({ campaignId: f.campaignId });
    const offer = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: f.campaignId, campaignItemId: f.seedId, contributionType: "resource", title: "Unlinked offer",
      contributorName: "Unlinked", contributorEmail: "Unlinked.Person@example.com", estimatedValue: 10,
    }));
    const send = vi.fn().mockResolvedValue({ id: "sent" });
    const bg = collector();
    insertMock.mockClear();
    await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(OWNER).user }, { sendEmail: send as any, background: bg.background });
    await bg.settle();
    expect(insertMock.mock.calls.filter((c) => (c[0] as any).userId === unlinkedId)).toHaveLength(1);
    expect(send.mock.calls.some((c) => String(c[0].to).toLowerCase() === "unlinked.person@example.com")).toBe(false);
    expect((await row(offer.id)).cancelNoticedAt).not.toBeNull();
    await database!.delete(userFollows).where(and(eq(userFollows.userId, unlinkedId)));
  });
});

describe("the review fixes", () => {
  it.skipIf(skipIfNoDb)("someone whose email was held and who then makes an account hears on the spine at the retry", async () => {
    const f = await busyCampaign("Linked later");
    const held = vi.fn().mockImplementation(async (p: any) =>
      String(p.to).toLowerCase().startsWith("sam") ? { id: null } : { id: "sent" });
    const bg = collector();
    await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(OWNER).user }, { sendEmail: held as any, background: bg.background });
    await bg.settle();
    expect((await row(f.ids.anonOther)).cancelNoticedAt).toBeNull();

    // Sam makes an account with that email: sign-in links the cancelled row.
    const database = await dbHelpers.getDb();
    const openId = `fixture-open-sam-${Date.now()}`;
    createdUserOpenIds.push(openId);
    const inserted: any = await database!.insert(users).values({ openId, email: "sam.anon@example.com", name: "Sam", loginMethod: "email", role: "user" });
    const samId = Number(inserted?.[0]?.insertId);
    await linkAnonymousContributions(database, samId, "sam.anon@example.com");
    expect((await row(f.ids.anonOther)).userId).toBe(samId);

    insertMock.mockClear();
    const ok = vi.fn().mockResolvedValue({ id: "sent-later" });
    await sendPendingCancellationEmails(f.campaignId, { sendEmail: ok as any });
    const toSam = insertMock.mock.calls.map((c) => c[0] as any).filter((n) => n.userId === samId);
    expect(toSam).toHaveLength(1);
    expect(toSam[0]).toMatchObject({ type: "campaign_cancelled", dedupeKey: `cp:cancel:${f.campaignId}:u${samId}` });
    expect(ok).not.toHaveBeenCalled(); // the account holder hears on the spine, not by direct email
    expect((await row(f.ids.anonOther)).cancelNoticedAt).not.toBeNull();

    // Nothing more on a later run, and the steward who cancelled is never told.
    insertMock.mockClear();
    await sendPendingCancellationEmails(f.campaignId, { sendEmail: ok as any });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it.skipIf(skipIfNoDb)("cancelling a campaign that never went live tells its stewards, not someone who followed it by id", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const { id } = await stewardCaller(OWNER).campaigns.create({
      title: "Test Cancel Secret Draft", description: "Draft fixture", projectName: "Test Cancel Secret Draft",
      currency: "USD", financialTarget: 1000, applicationId,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
    });
    createdCampaignIds.push(id);
    // A follow row from before follow() checked visibility.
    const database = await dbHelpers.getDb();
    await database!.insert(userFollows).values({ userId: STRANGER, targetType: "campaign", targetId: String(id) });
    insertMock.mockClear();
    await cancelCampaign({ campaignId: id, actor: ctxFor(OWNER).user, message: "Private steward message" }, { background: () => {} });
    const ids = insertMock.mock.calls.map((c) => (c[0] as any).userId);
    expect(ids).toEqual([CO_STEWARD]);
  });

  it.skipIf(skipIfNoDb)("after a cancel nothing can be accepted again, not even an offer that was declined", async () => {
    const f = await busyCampaign("No accept after");
    await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(OWNER).user }, { background: () => {} });
    const before = (await dbHelpers.getCampaignById(f.campaignId))!.pledgedTotal;
    await expect(stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: f.ids.rejected, status: "accepted" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "This campaign isn't live anymore, so it can't take on offers." });
    expect((await row(f.ids.rejected)).status).toBe("rejected");
    expect((await dbHelpers.getCampaignById(f.campaignId))!.pledgedTotal).toBe(before);
    await expect(anonCaller().campaigns.submitContribution({
      campaignId: f.campaignId, campaignItemId: f.seedId, contributionType: "resource", title: "Too late",
      contributorName: "Late", contributorEmail: "late@example.com", estimatedValue: 10,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.skipIf(skipIfNoDb)("an admin's cancel reads as the team's, never as the stewards'", async () => {
    const f = await busyCampaign("Admin cancels");
    const send = vi.fn().mockResolvedValue({ id: "sent" });
    const bg = collector();
    await cancelCampaign({ campaignId: f.campaignId, actor: ctxFor(987900, "admin").user }, { sendEmail: send as any, background: bg.background });
    await bg.settle();
    expect(send).toHaveBeenCalled();
    for (const c of send.mock.calls) {
      expect(c[0].html).toContain("Test Cancel Admin cancels from Test Cancel Admin cancels has been cancelled.");
      expect(c[0].html).not.toContain("The stewards of");
    }
  });
});

describe("who may cancel", () => {
  it.skipIf(skipIfNoDb)("a stranger cannot; a steward can through campaigns.cancel and gets suggestions back", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const { id } = await stewardCaller(OWNER).campaigns.create({
      title: "Test Cancel Router", description: "Router fixture", projectName: "Test Cancel Router",
      currency: "USD", financialTarget: 1000, applicationId,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
    });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    await expect(stewardCaller(STRANGER).campaigns.cancel({ id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const res = await stewardCaller(CO_STEWARD).campaigns.cancel({ id, message: "We are pausing." });
    expect(res.alreadyCancelled).toBe(false);
    expect(Array.isArray(res.suggestions)).toBe(true);
    expect(res.suggestions.every((s) => s.id !== id && s.status === "active")).toBe(true);
    // Terminal: nobody moves it back.
    await expect(adminCaller().campaigns.updateStatus({ id, status: "active" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // updateStatus('cancelled') on a cancelled campaign is a no-op.
    await expect(stewardCaller(OWNER).campaigns.updateStatus({ id, status: "cancelled" })).resolves.toMatchObject({ success: true });
  });

  it.skipIf(skipIfNoDb)("a steward cannot cancel a completed campaign", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const { id } = await stewardCaller(OWNER).campaigns.create({
      title: "Test Cancel Completed", description: "Completed fixture", projectName: "Test Cancel Completed",
      currency: "USD", financialTarget: 1000, applicationId,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
    });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    await adminCaller().campaigns.updateStatus({ id, status: "completed" });
    await expect(stewardCaller(OWNER).campaigns.cancel({ id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await dbHelpers.getCampaignById(id))!.status).toBe("completed");
  });
});
