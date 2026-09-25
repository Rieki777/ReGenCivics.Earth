/**
 * Outbound list audiences (2026-09-24): campaign email followers, everyone
 * following a campaign by email, and the crowdpool waitlist. Rye sends these
 * from admin Outbound; nothing mails a list automatically.
 *
 * Pins: an old audience still hashes the same (stored confirm hashes keep
 * matching), lists dedupe case-insensitively, every list letter carries the
 * person's own token stop link and never the newsletter prefs link, anyone
 * who left the list between preview and send is skipped, and the public
 * unsubscribe reveals nothing.
 *
 * Run against the SCRATCH database, never production.
 */
import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";

const sendEmailMock = vi.fn().mockResolvedValue({ id: "msg_test" });
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));
vi.mock("./emailTracking", () => ({
  createEmailLog: vi.fn().mockResolvedValue(11),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

import * as dbHelpers from "./db";
import {
  campaignFollowers,
  campaigns,
  crowdpoolWaitlist,
  newsletterIssueRecipients,
  newsletterIssues,
} from "../drizzle/schema";
import {
  buildIssuePreview,
  confirmAndSendIssue,
  issueBodyHash,
  parseIssueAudience,
} from "./lib/newsletter-issue-email";
import { listAudienceCounts, resolveOutboundRecipients } from "./lib/outboundAudience";
import { summarizeAudience, audienceToWriteSource, audienceToWriteList } from "../shared/outboundHistory";
import { regenSeasonSpan } from "../shared/regenYear";
import { adminCaller, anonCaller } from "./test-fixtures/crowdpool";

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER_BASE = 987_654_600;
const stamp = Date.now().toString(36);
const mail = (local: string) => `${local}.${stamp}@outbound-test.example`;
const token = (label: string) => `${label}${stamp}`.padEnd(32, "x").slice(0, 32);

let campaignA = 0;
let campaignB = 0;
const createdCampaignIds: number[] = [];
const T = {
  annA: token("annA"),
  annB: token("annB"),
  bob: token("bobB"),
  cara: token("caraW"),
};

async function followerRow(campaignId: number, email: string, tok: string) {
  await dbHelpers.upsertCampaignFollower({ campaignId, email, name: null, unsubscribeToken: tok });
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  for (const title of ["Test Outbound A", "Test Outbound B"]) {
    const { id } = await adminCaller().campaigns.create({
      title, description: "Outbound fixture", projectName: title, currency: "USD", financialTarget: 100,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 100 }],
    });
    createdCampaignIds.push(id);
  }
  [campaignA, campaignB] = createdCampaignIds;
  // Ann follows both campaigns, with different capitalisation; A's row is older.
  await followerRow(campaignA, mail("Ann").replace("ann", "Ann"), T.annA);
  await followerRow(campaignB, mail("ann"), T.annB);
  await followerRow(campaignB, mail("bob"), T.bob);
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  await database!.delete(campaignFollowers).where(like(campaignFollowers.email, `%.${stamp}@outbound-test.example`));
  await database!.delete(crowdpoolWaitlist).where(like(crowdpoolWaitlist.email, `%.${stamp}@outbound-test.example`));
  const issues = await database!.select({ id: newsletterIssues.id }).from(newsletterIssues)
    .where(inArray(newsletterIssues.createdBy, [OWNER_BASE + 1, OWNER_BASE + 2]));
  if (issues.length) {
    await database!.delete(newsletterIssueRecipients).where(inArray(newsletterIssueRecipients.issueId, issues.map((i) => i.id)));
    await database!.delete(newsletterIssues).where(inArray(newsletterIssues.id, issues.map((i) => i.id)));
  }
  if (createdCampaignIds.length) await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
});

describe("audience parsing and hashing", () => {
  it("an audience saved before lists existed parses and hashes exactly as before", () => {
    const old = { sources: ["footer"], activeOnly: true };
    const parsed = parseIssueAudience(old);
    expect(parsed).toStrictEqual(old);
    expect(Object.keys(parsed)).toEqual(["sources", "activeOnly"]);
    const expected = crypto.createHash("sha256")
      .update(`Hi\n\nBody\n\n{"sources":["footer"],"activeOnly":true}`, "utf8").digest("hex");
    expect(issueBodyHash("Hi", "Body", parsed)).toBe(expected);
    // A junk list is ignored, never half-parsed.
    expect(parseIssueAudience({ ...old, list: { kind: "campaign", campaignId: -1 } })).toStrictEqual(old);
    expect(parseIssueAudience({ ...old, list: { kind: "everyone" } })).toStrictEqual(old);
  });

  it("a list audience hashes differently from the newsletter one", () => {
    const withList = parseIssueAudience({ sources: [], activeOnly: true, list: { kind: "campaign", campaignId: 7 } });
    expect(withList.list).toEqual({ kind: "campaign", campaignId: 7 });
    expect(issueBodyHash("Hi", "Body", withList)).not.toBe(issueBodyHash("Hi", "Body", { sources: [], activeOnly: true }));
  });

  it("History labels a list in plain words and Duplicate keeps it", () => {
    expect(summarizeAudience({ sources: [], activeOnly: true, list: { kind: "campaign", campaignId: 7 } }, { 7: "Harmony Valley" }))
      .toBe("Email followers of Harmony Valley");
    expect(summarizeAudience({ sources: [], activeOnly: true, list: { kind: "all_campaigns" } })).toBe("Everyone following a campaign by email");
    expect(summarizeAudience({ sources: [], activeOnly: true, list: { kind: "waitlist", seasonNumber: 2 } })).toBe("Crowdpool waitlist, Season 2");
    const raw = { sources: [], activeOnly: true, list: { kind: "waitlist", seasonNumber: 2 } };
    expect(audienceToWriteList(raw)).toEqual({ kind: "waitlist", seasonNumber: 2 });
    expect(audienceToWriteSource(raw)).not.toBe("all"); // never widens to everyone
  });
});

describe("resolving lists", () => {
  it.skipIf(skipIfNoDb)("merges and dedupes case-insensitively, keeping the oldest row's token", async () => {
    const all = (await resolveOutboundRecipients({ sources: [], list: { kind: "all_campaigns" } }))
      .filter((r) => r.email.toLowerCase().endsWith(`.${stamp}@outbound-test.example`));
    expect(all.map((r) => r.email.toLowerCase()).sort()).toEqual([mail("ann"), mail("bob")].sort());
    const ann = all.find((r) => r.email.toLowerCase() === mail("ann"))!;
    expect(ann.unsubscribeUrl).toContain(`/campaign-updates/unsubscribe?token=${T.annA}`);
    expect(ann.source).toBe("all_campaigns");

    const b = await resolveOutboundRecipients({ sources: [], list: { kind: "campaign", campaignId: campaignB } });
    expect(b.map((r) => r.email).sort()).toEqual([mail("ann"), mail("bob")].sort());
    expect(b[0].source).toBe(`campaign:${campaignB}`);

    const counts = await listAudienceCounts();
    expect(counts.campaigns.find((c) => c.id === campaignB)).toMatchObject({ title: "Test Outbound B", count: 2, status: "pending_review" });
    expect(counts.campaigns.find((c) => c.id === campaignA)).toMatchObject({ count: 1 });
    expect(counts.allCampaigns).toBeGreaterThanOrEqual(2);
  });
});

describe("sending a list letter", () => {
  async function draft(createdBy: number, campaignId: number) {
    const database = await dbHelpers.getDb();
    const inserted: any = await database!.insert(newsletterIssues).values({
      subject: "News from the land",
      body: "The seed is in.",
      layout: "announcement",
      audience: { sources: [], activeOnly: true, list: { kind: "campaign", campaignId } },
      status: "draft",
      createdBy,
    });
    return Number(inserted?.[0]?.insertId);
  }

  it.skipIf(skipIfNoDb)("each letter carries the person's token link, never the prefs link; a leaver is skipped", async () => {
    const createdBy = OWNER_BASE + 1;
    const issueId = await draft(createdBy, campaignB);
    const preview = await buildIssuePreview({ issueId, createdBy });
    expect(preview.recipientCount).toBe(2);
    expect(preview.html).toContain("/campaign-updates/unsubscribe?token=preview");
    expect(preview.html).toContain("You asked for news about Test Outbound B on regencivics.earth.");
    expect(preview.html).not.toContain("Manage email preferences");

    // Bob stops following between preview and send.
    const database = await dbHelpers.getDb();
    await database!.delete(campaignFollowers).where(eq(campaignFollowers.unsubscribeToken, T.bob));

    sendEmailMock.mockClear();
    const result = await confirmAndSendIssue({
      issueId, createdBy, confirmToken: preview.confirmToken, idempotencyKey: `outbound-list-${stamp}`,
    });
    expect(result).toMatchObject({ ok: true, recipientCount: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendEmailMock.mock.calls[0][0] as { to: string; html: string };
    expect(sent.to).toBe(mail("ann"));
    expect(sent.html).toContain(`/campaign-updates/unsubscribe?token=${T.annB}`);
    expect(sent.html).toContain("Stop these emails");
    expect(sent.html).not.toContain("/email-preferences");
    expect(sent.html).not.toContain("Manage email preferences");

    const rows = await database!.select().from(newsletterIssueRecipients).where(eq(newsletterIssueRecipients.issueId, issueId));
    const bob = rows.find((r) => r.email === mail("bob"))!;
    expect(bob.status).toBe("skipped_unsub");
    expect(bob.source).toBe(`campaign:${campaignB}`);
    await followerRow(campaignB, mail("bob"), T.bob); // put Bob back for the next tests
  });
});

describe("the public list procedures", () => {
  it.skipIf(skipIfNoDb)("joinWaitlist lowercases, takes the season from the server, and repeats silently", async () => {
    await expect(anonCaller().campaigns.joinWaitlist({ email: mail("Cara").replace("cara", "CARA"), name: "Cara" })).resolves.toEqual({ ok: true });
    await expect(anonCaller().campaigns.joinWaitlist({ email: mail("cara") })).resolves.toEqual({ ok: true });
    const season = regenSeasonSpan(new Date()).seasonNumber;
    const rows = await dbHelpers.listWaitlist(season);
    const mine = rows.filter((r) => r.email === mail("cara"));
    expect(mine).toHaveLength(1);
    expect(mine[0].unsubscribeToken).toHaveLength(32);
  });

  it.skipIf(skipIfNoDb)("unsubscribe reveals nothing, 'this' removes one list, 'all' removes every row for the email", async () => {
    // A token nobody holds answers exactly like a real one.
    await expect(anonCaller().campaigns.unsubscribeEmailFollow({ token: "z".repeat(32), scope: "this" })).resolves.toEqual({ ok: true });
    await expect(anonCaller().campaigns.unsubscribeEmailFollow({ token: "z".repeat(32), scope: "all" })).resolves.toEqual({ ok: true });
    await expect(anonCaller().campaigns.unsubscribeEmailFollow({ token: "short", scope: "this" } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Ann also joins the waitlist.
    await dbHelpers.upsertWaitlist({ seasonNumber: 1, email: mail("ann"), unsubscribeToken: T.cara });

    const database = await dbHelpers.getDb();
    const annRows = async () => ({
      follows: (await database!.select().from(campaignFollowers).where(like(campaignFollowers.email, `ann.${stamp}@%`))).length,
      waitlist: (await database!.select().from(crowdpoolWaitlist).where(like(crowdpoolWaitlist.email, `ann.${stamp}@%`))).length,
    });
    expect(await annRows()).toEqual({ follows: 2, waitlist: 1 });

    await anonCaller().campaigns.unsubscribeEmailFollow({ token: T.annA, scope: "this" });
    expect(await annRows()).toEqual({ follows: 1, waitlist: 1 });

    await anonCaller().campaigns.unsubscribeEmailFollow({ token: T.annB, scope: "all" });
    expect(await annRows()).toEqual({ follows: 0, waitlist: 0 });
    // Bob is untouched.
    expect((await dbHelpers.getEmailFollowers({ campaignId: campaignB })).map((r) => r.email)).toEqual([mail("bob")]);
  });

  it.skipIf(skipIfNoDb)("the stop link on an all-campaigns letter takes the person off that list, not just one follow", async () => {
    // Dee follows both campaigns by email.
    await followerRow(campaignA, mail("dee"), token("deeA"));
    await followerRow(campaignB, mail("dee"), token("deeB"));
    const dee = (await resolveOutboundRecipients({ sources: [], list: { kind: "all_campaigns" } }))
      .find((r) => r.email.toLowerCase() === mail("dee"))!;
    const url = new URL(dee.unsubscribeUrl);
    // The link says which letter it came from, so the page offers only "stop all".
    expect(url.searchParams.get("list")).toBe("all");
    await anonCaller().campaigns.unsubscribeEmailFollow({ token: url.searchParams.get("token")!, scope: "all" });
    const next = await resolveOutboundRecipients({ sources: [], list: { kind: "all_campaigns" } });
    expect(next.some((r) => r.email.toLowerCase() === mail("dee"))).toBe(false);

    // A single campaign's letter keeps the plain link; the waitlist says so.
    const one = await resolveOutboundRecipients({ sources: [], list: { kind: "campaign", campaignId: campaignB } });
    expect(new URL(one[0].unsubscribeUrl).searchParams.get("list")).toBeNull();
  });
});
