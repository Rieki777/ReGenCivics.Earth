/**
 * Offer status links (build spec 2026-09-27, section 10; research R34).
 *
 * Someone who offers without an account gets a private link to that one
 * offer: /offer#<token>. The token is 256 random bits stored only as its
 * SHA-256, expires after 180 days, reaches one contribution, turns read-only
 * once the offer is linked to an account, and is read only through POST
 * mutations that answer a wrong, unknown or expired token the same way.
 *
 * insertNotification and sendEmail are mocked, so every spine row and every
 * direct email is a call this file reads.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import {
  campaigns,
  campaignArrivalNotes,
  campaignContributions,
  campaignItems,
  contributionMessages,
  contributionStatusTokens,
} from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  createApprovedLandClaim,
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

import { insertNotification } from "./lib/forum-notify";
import { sendEmail, wrapLinksWithTracking } from "./_core/email";
import { sanitizeInput } from "./_core/security";
import {
  OFFER_STATUS_VIEW_KEYS,
  OFFER_TOKEN_TTL_DAYS,
  hashOfferToken,
  issueOfferStatusToken,
  sanitizeCapped,
} from "./lib/offer-status";
import { ARRIVAL, LINK, OFFER_STEPS } from "../shared/crowdpoolCopy";

const skipIfNoDb = !process.env.DATABASE_URL;
const APPLICANT = 986701;
const CO_STEWARD = 986702;
const CLAIMER = 986703;
const CONTRIB = 986704; // an account holder
const STRANGER = 986705;

const createdCampaignIds: number[] = [];
const insertMock = vi.mocked(insertNotification);
const sendMock = vi.mocked(sendEmail);

type Row = { userId: number; type: string; dedupeKey: string; title: string; body?: string | null; link?: string | null };
const spine = (type: string): Row[] => insertMock.mock.calls.map((c) => c[0] as Row).filter((r) => r.type === type);

const TOKEN_IN = /\/offer#([A-Za-z0-9_-]{43})/;

beforeEach(() => {
  insertMock.mockClear();
  sendMock.mockClear();
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    const rows = await database!.select({ id: campaignContributions.id }).from(campaignContributions)
      .where(inArray(campaignContributions.campaignId, createdCampaignIds));
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      await database!.delete(contributionStatusTokens).where(inArray(contributionStatusTokens.contributionId, ids));
      await database!.delete(contributionMessages).where(inArray(contributionMessages.contributionId, ids));
    }
    await database!.delete(campaignArrivalNotes).where(inArray(campaignArrivalNotes.campaignId, createdCampaignIds));
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A live campaign with three stewards and one need. */
async function campaign(title: string, opts: { isDemo?: boolean } = {}) {
  const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: CO_STEWARD });
  await createApprovedLandClaim(CLAIMER, applicationId);
  const { id } = await stewardCaller(APPLICANT).campaigns.create({
    title: `Test Offer Link ${title}`,
    description: "Status link fixture",
    projectName: `Test Offer Link ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    items: [{ category: "resource", resourceName: "Seed trays", resourceDescription: "Trays", estimatedValue: 2000, quantityWanted: 20 }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  if (opts.isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  const items = await dbHelpers.getCampaignItems(id);
  return { campaignId: id, itemId: items[0].id as number, applicationId };
}

function offerAnon(campaignId: number, itemId: number, extra: Record<string, unknown> = {}) {
  return anonCaller().campaigns.submitContribution({
    campaignId,
    campaignItemId: itemId,
    contributionType: "resource",
    title: "Seed trays",
    contributorName: "Private Person",
    contributorEmail: "private.person@example.com",
    contributorPhone: "+44 7700 900123",
    estimatedValue: 100,
    ...extra,
  } as any);
}

const tokenOf = (path: string | null | undefined): string => {
  const m = TOKEN_IN.exec(String(path ?? ""));
  if (!m) throw new Error(`no token in ${path}`);
  return m[1];
};

const accept = (contributionId: number) =>
  stewardCaller(APPLICANT).campaigns.updateContributionStatus({ contributionId, status: "accepted" });

describe("the link is issued only to signed-out offers on real campaigns", () => {
  it.skipIf(skipIfNoDb)("a signed-out real offer returns statusPath; a signed-in one and a practice run do not", async () => {
    const { campaignId, itemId } = await campaign("Issue");
    const anon = await realOffer(offerAnon(campaignId, itemId));
    expect(anon.statusPath).toMatch(/^\/offer#[A-Za-z0-9_-]{43}$/);

    const signedIn = await realOffer(stewardCaller(CONTRIB).campaigns.submitContribution({
      campaignId, campaignItemId: itemId, contributionType: "resource", title: "Seed trays",
      contributorName: "Account Person", contributorEmail: `fixture${CONTRIB}@example.com`, estimatedValue: 100,
    }));
    expect(signedIn.statusPath).toBeNull();
    const database = await dbHelpers.getDb();
    expect(await database!.select().from(contributionStatusTokens).where(eq(contributionStatusTokens.contributionId, signedIn.id))).toHaveLength(0);

    const example = await campaign("Practice", { isDemo: true });
    const practice = await offerAnon(example.campaignId, example.itemId);
    expect(practice).toEqual({ id: null, success: true, practice: true });
    expect((practice as Record<string, unknown>).statusPath).toBeUndefined();
  });

  it.skipIf(skipIfNoDb)("the database holds only the token's hash, expiring in 180 days", async () => {
    const { campaignId, itemId } = await campaign("Hash");
    const before = Date.now();
    const offer = await realOffer(offerAnon(campaignId, itemId));
    const token = tokenOf(offer.statusPath);
    const database = await dbHelpers.getDb();
    const rows = await database!.select().from(contributionStatusTokens).where(eq(contributionStatusTokens.contributionId, offer.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(rows[0].tokenHash).toBe(hashOfferToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
    const ttl = new Date(rows[0].expiresAt).getTime() - before;
    expect(ttl).toBeGreaterThan((OFFER_TOKEN_TTL_DAYS * 24 - 1) * 3600_000);
    expect(ttl).toBeLessThan((OFFER_TOKEN_TTL_DAYS * 24 + 1) * 3600_000);
  });
});

describe("offerStatus.view", () => {
  it.skipIf(skipIfNoDb)("answers only this offer, with a pinned key set and no personal data", async () => {
    const { campaignId, itemId } = await campaign("View");
    // A note exists, but a waiting offer never sees it.
    await stewardCaller(APPLICANT).campaigns.setArrivalNote({ campaignId, whereToGo: "Gate 3" });
    const offer = await realOffer(offerAnon(campaignId, itemId));
    const view = await anonCaller().offerStatus.view({ token: tokenOf(offer.statusPath) });
    expect(Object.keys(view).sort()).toEqual([...OFFER_STATUS_VIEW_KEYS].sort());
    const json = JSON.stringify(view);
    for (const secret of ["private.person@example.com", "Private Person", "7700", "contributorEmail", "userId", "ownerNotes"]) {
      expect(json).not.toContain(secret);
    }
    expect(view).toMatchObject({
      offerTitle: "Seed trays",
      needTitle: "Seed trays",
      verb: "Offer",
      status: "pending",
      ending: null,
      stepLine: OFFER_STEPS.stepLine.pending,
      canWithdraw: true,
      canReply: true,
      linkedToAccount: false,
      campaignState: "open",
      arrivalNote: null,
      otherNeeds: [],
      lend: null,
    });
    expect(view.projectName).toBe("Test Offer Link View");
    expect(view.projectPath).toMatch(new RegExp(`\\?campaign=${campaignId}$`));
    expect(view.steps.map((s) => [s.key, s.state])).toEqual([
      ["sent", "done"], ["reviewing", "current"], ["accepted", "todo"],
      ["underway", "todo"], ["delivered", "todo"], ["thanked", "todo"],
    ]);
  });

  it.skipIf(skipIfNoDb)("a wrong, an unknown and an expired token all answer the same NOT_FOUND, on every procedure", async () => {
    const { campaignId, itemId } = await campaign("Bad links");
    const offer = await realOffer(offerAnon(campaignId, itemId));
    const expired = await issueOfferStatusToken(offer.id, new Date(Date.now() - (OFFER_TOKEN_TTL_DAYS + 1) * 86_400_000));
    const bad = ["nonsense", "", "a".repeat(44), randomBytes(32).toString("base64url"), expired.token, `${tokenOf(offer.statusPath)} `];
    const same = { code: "NOT_FOUND", message: LINK.bad };
    for (const token of bad) {
      await expect(anonCaller().offerStatus.view({ token })).rejects.toMatchObject(same);
      await expect(anonCaller().offerStatus.withdraw({ token })).rejects.toMatchObject(same);
      await expect(anonCaller().offerStatus.reply({ token, message: "Hello" })).rejects.toMatchObject(same);
    }
    // The good one still works, and the expired one's row is there, just past its date.
    await expect(anonCaller().offerStatus.view({ token: tokenOf(offer.statusPath) })).resolves.toMatchObject({ status: "pending" });
    await expect(anonCaller().offerStatus.view({ token: "x".repeat(201) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.skipIf(skipIfNoDb)("stamps lastUsedAt when a link is opened", async () => {
    const { campaignId, itemId } = await campaign("Last used");
    const offer = await realOffer(offerAnon(campaignId, itemId));
    const database = await dbHelpers.getDb();
    const [before] = await database!.select().from(contributionStatusTokens).where(eq(contributionStatusTokens.contributionId, offer.id));
    expect(before.lastUsedAt).toBeNull();
    await anonCaller().offerStatus.view({ token: tokenOf(offer.statusPath) });
    const [after] = await database!.select().from(contributionStatusTokens).where(eq(contributionStatusTokens.contributionId, offer.id));
    expect(after.lastUsedAt).not.toBeNull();
  });
});

describe("offerStatus.withdraw", () => {
  it.skipIf(skipIfNoDb)("withdraws while waiting, then refuses; refuses once accepted; refuses once linked to an account", async () => {
    const { campaignId, itemId } = await campaign("Withdraw");
    const database = await dbHelpers.getDb();

    const waiting = await realOffer(offerAnon(campaignId, itemId));
    const t1 = tokenOf(waiting.statusPath);
    expect(await anonCaller().offerStatus.withdraw({ token: t1 })).toEqual({ ok: true });
    expect((await dbHelpers.getContributionById(waiting.id))!.status).toBe("withdrawn");
    const after = await anonCaller().offerStatus.view({ token: t1 });
    expect(after).toMatchObject({ status: "withdrawn", canWithdraw: false, canReply: false, stepLine: OFFER_STEPS.endings.withdrawn });
    await expect(anonCaller().offerStatus.withdraw({ token: t1 })).rejects.toMatchObject({ code: "BAD_REQUEST", message: LINK.notPendingHere });
    await expect(anonCaller().offerStatus.reply({ token: t1, message: "Hi" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: LINK.replyWithdrawn });

    const accepted = await realOffer(offerAnon(campaignId, itemId));
    await accept(accepted.id);
    await expect(anonCaller().offerStatus.withdraw({ token: tokenOf(accepted.statusPath) }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: LINK.notPendingHere });
    expect((await dbHelpers.getContributionById(accepted.id))!.status).toBe("accepted");

    const linked = await realOffer(offerAnon(campaignId, itemId));
    await database!.update(campaignContributions).set({ userId: CONTRIB }).where(eq(campaignContributions.id, linked.id));
    const t3 = tokenOf(linked.statusPath);
    await expect(anonCaller().offerStatus.withdraw({ token: t3 })).rejects.toMatchObject({ code: "FORBIDDEN", message: LINK.linkedAction });
    await expect(anonCaller().offerStatus.reply({ token: t3, message: "Hi" })).rejects.toMatchObject({ code: "FORBIDDEN", message: LINK.linkedAction });
    expect(await anonCaller().offerStatus.view({ token: t3 })).toMatchObject({
      status: "pending", linkedToAccount: true, canWithdraw: false, canReply: false,
    });
    expect((await dbHelpers.getContributionById(linked.id))!.status).toBe("pending");
  });
});

describe("offerStatus.reply", () => {
  it.skipIf(skipIfNoDb)("stores the note sanitized, tells every steward on the spine, and takes at most 5 a day", async () => {
    const { campaignId, itemId } = await campaign("Reply");
    const offer = await realOffer(offerAnon(campaignId, itemId));
    const token = tokenOf(offer.statusPath);
    insertMock.mockClear();

    expect(await anonCaller().offerStatus.reply({ token, message: "  <b>Can</b> I come Friday? <script>alert(1)</script>& bring tea  " }))
      .toEqual({ ok: true });
    const database = await dbHelpers.getDb();
    const stored = await database!.select().from(contributionMessages).where(eq(contributionMessages.contributionId, offer.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].body).toBe(sanitizeInput("<b>Can</b> I come Friday? <script>alert(1)</script>& bring tea"));
    expect(stored[0].body).not.toMatch(/<|script/);

    const rows = spine("contributor_reply");
    expect(rows.map((r) => r.userId).sort()).toEqual([APPLICANT, CO_STEWARD, CLAIMER].sort());
    for (const r of rows) {
      expect(r.dedupeKey).toBe(`cp:reply:${stored[0].id}:u${r.userId}`);
      expect(r.title).toBe("Private Person sent a note about their offer");
      expect(r.body).toBe("Can I come Friday? & bring tea");
      expect(r.link).toMatch(/#review$/);
    }

    // The stewards read it with the offer; nobody else can.
    const notes = await stewardCaller(CO_STEWARD).campaigns.getOfferMessages({ campaignId });
    expect(notes[offer.id]).toHaveLength(1);
    expect(notes[offer.id][0].body).toBe(stored[0].body);
    await expect(stewardCaller(STRANGER).campaigns.getOfferMessages({ campaignId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.getOfferMessages({ campaignId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    for (let i = 2; i <= 5; i++) {
      expect(await anonCaller().offerStatus.reply({ token, message: `Note ${i}` })).toEqual({ ok: true });
    }
    await expect(anonCaller().offerStatus.reply({ token, message: "Note 6" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: LINK.replyLimit });
    expect(await database!.select().from(contributionMessages).where(eq(contributionMessages.contributionId, offer.id))).toHaveLength(5);
    // Latest 5, newest first.
    const latest = await stewardCaller(APPLICANT).campaigns.getOfferMessages({ campaignId });
    expect(latest[offer.id].map((n) => n.body)[0]).toBe("Note 5");
  });

  it.skipIf(skipIfNoDb)("refuses empty, over-long and markup-only notes", async () => {
    const { campaignId, itemId } = await campaign("Reply refusals");
    const token = tokenOf((await realOffer(offerAnon(campaignId, itemId))).statusPath);
    await expect(anonCaller().offerStatus.reply({ token, message: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(anonCaller().offerStatus.reply({ token, message: "a".repeat(1001) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(anonCaller().offerStatus.reply({ token, message: "<script>alert(1)</script>" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: LINK.replyEmpty });
  });

  it("keeps a sanitized note inside its column without half an entity", () => {
    const capped = sanitizeCapped(`${"a".repeat(998)}&&`, 1000);
    expect(capped.length).toBeLessThanOrEqual(1000);
    expect(capped).not.toMatch(/&[#A-Za-z0-9]*$/);
    expect(sanitizeCapped("  Tea & cake  ", 1000)).toBe("Tea &amp; cake");
  });
});

describe("rate limits", () => {
  it.skipIf(skipIfNoDb)("offer_status_write allows 10 per 15 minutes per IP, offer_status_view 60", async () => {
    const ip = `10.99.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 10; i++) {
      await expect(anonCaller(ip).offerStatus.withdraw({ token: "nonsense" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(anonCaller(ip).offerStatus.withdraw({ token: "nonsense" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(anonCaller(ip).offerStatus.reply({ token: "nonsense", message: "hi" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    const viewIp = `10.98.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 60; i++) {
      await expect(anonCaller(viewIp).offerStatus.view({ token: "nonsense" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(anonCaller(viewIp).offerStatus.view({ token: "nonsense" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("the accepted and declined emails", () => {
  it.skipIf(skipIfNoDb)("accepted carries a fresh link and the arrival block; declined a fresh link; account holders get no email", async () => {
    const { campaignId, itemId } = await campaign("Emails");
    await stewardCaller(APPLICANT).campaigns.setArrivalNote({ campaignId, whereToGo: "Gate 3, Old Mill Lane", meals: "Lunch is on us" });
    await stewardCaller(APPLICANT).campaigns.setArrivalNote({ campaignId, campaignItemId: itemId, whatToBring: "Gloves & boots" });

    const yes = await realOffer(offerAnon(campaignId, itemId));
    sendMock.mockClear();
    await accept(yes.id);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const accepted = sendMock.mock.calls[0][0] as { to: string; html: string; template: string };
    expect(accepted.template).toBe("contribution_accepted");
    const fresh = tokenOf(accepted.html);
    expect(fresh).not.toBe(tokenOf(yes.statusPath));
    expect(accepted.html).toContain("Check your offer");
    expect(accepted.html).toContain("Before you arrive");
    expect(accepted.html).toContain("Here's what the stewards want you to know before you arrive.");
    expect(accepted.html).not.toContain("The stewards will reach out to sort out the details.");
    expect(accepted.html).toContain("Gate 3, Old Mill Lane");
    expect(accepted.html).toContain("Gloves &amp; boots");
    expect(accepted.html).toContain("Lunch is on us");
    // The fresh link opens the same offer, now standing, with its note.
    const view = await anonCaller().offerStatus.view({ token: fresh });
    expect(view.status).toBe("accepted");
    expect(view.stepLine).toBe(OFFER_STEPS.stepLine.accepted);
    expect(view.arrivalNote).toMatchObject({ whereToGo: "Gate 3, Old Mill Lane", whatToBring: "Gloves &amp; boots", meals: "Lunch is on us", beds: null });
    // The receipt's link still works too.
    await expect(anonCaller().offerStatus.view({ token: tokenOf(yes.statusPath) })).resolves.toMatchObject({ status: "accepted" });

    const no = await realOffer(offerAnon(campaignId, itemId));
    sendMock.mockClear();
    await stewardCaller(APPLICANT).campaigns.updateContributionStatus({ contributionId: no.id, status: "rejected", ownerNotes: "We're full" });
    const declined = sendMock.mock.calls[0][0] as { html: string; template: string };
    expect(declined.template).toBe("contribution_rejected");
    expect(declined.html).toContain("Check this offer any time:");
    const declinedView = await anonCaller().offerStatus.view({ token: tokenOf(declined.html) });
    expect(declinedView).toMatchObject({ status: "rejected", stewardNote: "We're full", arrivalNote: null, canWithdraw: false, canReply: true });
    expect(declinedView.ending).toEqual({ key: "rejected", text: OFFER_STEPS.endings.rejected });
    expect(declinedView.otherNeeds.length).toBeLessThanOrEqual(2);
    for (const n of declinedView.otherNeeds) expect(Object.keys(n).sort()).toEqual(["path", "projectName", "title", "verb"]);

    // An account holder hears on the spine, with the arrival note line, and gets no direct email.
    const mine = await realOffer(stewardCaller(CONTRIB).campaigns.submitContribution({
      campaignId, campaignItemId: itemId, contributionType: "resource", title: "Seed trays",
      contributorName: "Account Person", contributorEmail: `fixture${CONTRIB}@example.com`, estimatedValue: 100,
    }));
    sendMock.mockClear();
    insertMock.mockClear();
    await accept(mine.id);
    expect(sendMock).not.toHaveBeenCalled();
    const [notice] = spine("contribution_accepted");
    expect(notice.userId).toBe(CONTRIB);
    expect(notice.body).toContain(ARRIVAL.noticeLine);
  });

  it.skipIf(skipIfNoDb)("with no arrival note the accepted email keeps its old line", async () => {
    const { campaignId, itemId } = await campaign("No note");
    const yes = await realOffer(offerAnon(campaignId, itemId));
    sendMock.mockClear();
    await accept(yes.id);
    const html = (sendMock.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain("The stewards will reach out to sort out the details.");
    expect(html).not.toContain("Before you arrive");
    expect(html).toContain("Check your offer");
  });

  it("click tracking never wraps a private offer link", () => {
    const html = `<a href="https://regencivics.earth/offer#${"A".repeat(43)}">Check your offer</a> <a href="https://regencivics.earth/campaigns">Browse</a>`;
    const wrapped = wrapLinksWithTracking(html, 42);
    expect(wrapped).toContain(`href="https://regencivics.earth/offer#${"A".repeat(43)}"`);
    expect(wrapped).toContain("/api/track/click/42?url=https%3A%2F%2Fregencivics.earth%2Fcampaigns");
    expect(wrapped).not.toContain("url=https%3A%2F%2Fregencivics.earth%2Foffer");
  });
});

describe("campaigns.withdrawContribution checks the owner by account or by email without case (finding F8)", () => {
  it.skipIf(skipIfNoDb)("the account it is linked to, or the same address in any case; never a stranger", async () => {
    const { campaignId, itemId } = await campaign("Owner");
    const database = await dbHelpers.getDb();

    // Linked to the account under another address (an Apple relay, say).
    const relay = await realOffer(offerAnon(campaignId, itemId, { contributorEmail: "relay-abc@privaterelay.example" }));
    await database!.update(campaignContributions).set({ userId: CONTRIB }).where(eq(campaignContributions.id, relay.id));
    await expect(stewardCaller(STRANGER).campaigns.withdrawContribution({ contributionId: relay.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await stewardCaller(CONTRIB).campaigns.withdrawContribution({ contributionId: relay.id })).toEqual({ success: true });
    expect((await dbHelpers.getContributionById(relay.id))!.status).toBe("withdrawn");

    // Same address, capitalised, not linked yet.
    const caps = await realOffer(offerAnon(campaignId, itemId, { contributorEmail: `Fixture${CONTRIB}@Example.COM` }));
    expect(await stewardCaller(CONTRIB).campaigns.withdrawContribution({ contributionId: caps.id })).toEqual({ success: true });

    // Not waiting any more: refused.
    const done = await realOffer(offerAnon(campaignId, itemId, { contributorEmail: `fixture${CONTRIB}@example.com` }));
    await accept(done.id);
    await expect(stewardCaller(CONTRIB).campaigns.withdrawContribution({ contributionId: done.id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(anonCaller().campaigns.withdrawContribution({ contributionId: done.id })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
