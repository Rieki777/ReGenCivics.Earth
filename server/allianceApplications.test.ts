/**
 * Alliance partner applications end to end against a real database (ADR-72):
 * apply, review, approve into the Interoperability Circle, convert an inquiry,
 * and the badges beside the call time votes. Runs only with a local
 * DATABASE_URL (server/test-db-guard.ts); emails are mocked.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { getDb } from "./db";
import {
  allianceApplicationEvents,
  allianceApplications,
  eventSignups,
  generalInquiries,
  interopTimeVotes,
  interopTools,
  organisations,
  seasonScheduleVotes,
} from "../drizzle/schema";
import { adminCaller, ctxFor } from "./test-fixtures/crowdpool";
import { appRouter } from "./routers";
import { clearBadgeCache } from "./lib/memberBadges";

const skipIfNoDb = !process.env.DATABASE_URL;

const sent: Array<{ template?: string; to: string[] }> = [];
vi.mock("./_core/email", async () => {
  const actual = await vi.importActual<typeof import("./_core/email")>("./_core/email");
  return {
    ...actual,
    sendEmail: vi.fn(async (p: { template?: string; to: string | string[] }) => {
      sent.push({ template: p.template, to: Array.isArray(p.to) ? p.to : [p.to] });
      return { id: "test", status: "sent" };
    }),
  };
});
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

const STAMP = Date.now();
const APPLICANT = 986_100 + (STAMP % 1000);
const CONVERTED = APPLICANT + 1;
const email = (id: number) => `fixture${id}@example.com`;

function caller(userId: number) {
  return appRouter.createCaller(ctxFor(userId, "user"));
}

const inquiryIds: number[] = [];

async function cleanup() {
  const d = await getDb();
  if (!d) return;
  const emails = [email(APPLICANT), email(CONVERTED)];
  const apps = await d.select({ id: allianceApplications.id }).from(allianceApplications).where(inArray(allianceApplications.contactEmail, emails));
  const ids = apps.map((a) => a.id);
  if (ids.length) {
    await d.delete(allianceApplicationEvents).where(inArray(allianceApplicationEvents.allianceApplicationId, ids));
    await d.delete(allianceApplications).where(inArray(allianceApplications.id, ids));
    await d.delete(organisations).where(inArray(organisations.orgId, ids.map((i) => `alliance-app-${i}`)));
  }
  await d.delete(interopTools).where(inArray(interopTools.email, emails));
  await d.delete(eventSignups).where(inArray(eventSignups.email, emails));
  await d.delete(interopTimeVotes).where(like(interopTimeVotes.voterKey, `fixturealliance${STAMP}%`));
  await d.delete(seasonScheduleVotes).where(like(seasonScheduleVotes.voterKey, `fixturealliance${STAMP}%`));
  if (inquiryIds.length) await d.delete(generalInquiries).where(inArray(generalInquiries.id, inquiryIds));
}

beforeAll(async () => { if (!skipIfNoDb) await cleanup(); });
afterAll(async () => { if (!skipIfNoDb) await cleanup(); });

describe.skipIf(skipIfNoDb)("alliance partner applications", () => {
  let appId = 0;

  it("saves a draft as it grows and says what is missing before it sends", async () => {
    const me = caller(APPLICANT);
    const draft = await me.allianceApplications.save({ organizationName: "Fixture Seed Commons" });
    expect(draft?.status).toBe("draft");
    expect(draft?.contactEmail).toBe(email(APPLICANT));
    appId = draft!.id;

    await expect(me.allianceApplications.submit()).rejects.toThrow(/how you support land projects/);
    await expect(me.allianceApplications.save({ organizationUrl: "javascript:alert(1)" })).rejects.toThrow(/does not look like a link/);

    await me.allianceApplications.save({
      roles: ["Funding", "Bogus"],
      supportDescription: "We run a flow fund for land projects in two bioregions.",
      toolRepoUrl: "https://github.com/fixture/seed-tool",
    });
    const res = await me.allianceApplications.submit();
    expect(res.status).toBe("submitted");
    expect(sent.some((m) => m.template === "alliance_application_received")).toBe(true);

    const [mine] = await me.allianceApplications.mine();
    expect(mine.roles).toBe(JSON.stringify(["Funding"]));
    expect(mine.submittedAt).not.toBeNull();
  });

  it("keeps one application per person", async () => {
    const again = await caller(APPLICANT).allianceApplications.save({ contactName: "Fixture Ana" });
    expect(again?.id).toBe(appId);
  });

  it("approval joins the Circle, files the tool, registers the organization and sends the invite once", async () => {
    sent.length = 0;
    const admin = adminCaller();
    const res = await admin.allianceApplications.updateStatus({ id: appId, status: "approved" });
    expect(res.changed).toBe(true);
    expect(res.handoff?.organisation).toBe("created");
    expect(["joined", "no_sessions"]).toContain(res.handoff?.circle);
    expect(res.handoff?.invite).toBe("sent");
    expect(sent.filter((m) => m.template === "alliance_partner_vote_invite")).toHaveLength(1);

    const d = (await getDb())!;
    const [org] = await d.select({ status: organisations.status }).from(organisations).where(eq(organisations.orgId, `alliance-app-${appId}`));
    expect(org?.status).toBe("active");
    const [tool] = await d.select().from(interopTools).where(eq(interopTools.email, email(APPLICANT)));
    expect(tool?.repoUrl).toBe("https://github.com/fixture/seed-tool");

    // Approving again changes nothing and sends nothing.
    const twice = await admin.allianceApplications.updateStatus({ id: appId, status: "approved" });
    expect(twice.changed).toBe(false);

    const { events } = await admin.allianceApplications.get({ id: appId });
    expect(events.map((e) => e.description)).toContain("Vote invite sent");
  });

  it("closes the application for edits once decided", async () => {
    await expect(caller(APPLICANT).allianceApplications.save({ contactName: "Late edit" })).rejects.toThrow(/already decided/);
  });

  it("badges a Circle vote by its voter, including one cast before approval", async () => {
    clearBadgeCache();
    const d = (await getDb())!;
    const key = `fixturealliance${STAMP}a`;
    await d.insert(interopTimeVotes).values({ slot: "tue,wed,thu", voterKey: key, displayName: `Fixture Ana ${STAMP}` });
    // A guest vote first; signing in attaches it.
    const linked = await caller(APPLICANT).interopSessions.linkMyVote({ voterKey: key });
    expect(linked.voted).toBe(true);
    const tally = await appRouter.createCaller(ctxFor(0, "user")).interopSessions.tally();
    const member = tally.slots.flatMap((s) => s.members).find((m) => m.name === `Fixture Ana ${STAMP}`);
    expect(member?.badges).toContain("alliance_partner");
  });

  it("links a Season vote and reports it on the status page", async () => {
    const d = (await getDb())!;
    const key = `fixturealliance${STAMP}s`;
    await d.insert(seasonScheduleVotes).values({ season: "Season 2", voterKey: key, slots: "tue", projectName: "Fixture Project" });
    const res = await caller(APPLICANT).seasonSchedule.linkMyVote({ season: "Season 2", voterKey: key });
    expect(res.voted).toBe(true);
    const [row] = await d.select({ userId: seasonScheduleVotes.userId }).from(seasonScheduleVotes).where(eq(seasonScheduleVotes.voterKey, key));
    expect(row.userId).toBe(APPLICANT);
  });

  it("converts an alliance inquiry once, and its writer claims it on sign-in", async () => {
    const d = (await getDb())!;
    const ins: any = await d.insert(generalInquiries).values({
      pathType: "alliance",
      email: email(CONVERTED),
      fullName: "Fixture Converted",
      organizationUrl: "https://converted.example",
      organizationRole: JSON.stringify(["Legal"]),
      allianceSupportCategories: JSON.stringify(["Education"]),
      allianceSupportDescription: "Legal clinics for land trusts.",
    });
    const inquiryId = Number(ins?.[0]?.insertId ?? ins?.insertId);
    inquiryIds.push(inquiryId);

    const admin = adminCaller();
    const first = await admin.allianceApplications.convertInquiry({ inquiryId, organizationName: "Fixture Converted Org", approve: false });
    expect(first.created).toBe(true);
    const again = await admin.allianceApplications.convertInquiry({ inquiryId, organizationName: "Other", approve: false });
    expect(again).toMatchObject({ created: false, id: first.id });

    const [inquiry] = await d.select({ status: generalInquiries.status }).from(generalInquiries).where(eq(generalInquiries.id, inquiryId));
    expect(inquiry.status).toBe("completed");

    const [mine] = await caller(CONVERTED).allianceApplications.mine();
    expect(mine).toMatchObject({ id: first.id, userId: CONVERTED, status: "submitted", organizationName: "Fixture Converted Org" });
    expect(JSON.parse(mine.roles ?? "[]")).toEqual(["Legal", "Education"]);
  });

  it("refuses to convert an inquiry from another path", async () => {
    const d = (await getDb())!;
    const ins: any = await d.insert(generalInquiries).values({ pathType: "live", email: email(CONVERTED) });
    const inquiryId = Number(ins?.[0]?.insertId ?? ins?.insertId);
    inquiryIds.push(inquiryId);
    await expect(adminCaller().allianceApplications.convertInquiry({ inquiryId, organizationName: "X" })).rejects.toThrow(/Only alliance inquiries/);
  });

  it("keeps the admin procedures to admins", async () => {
    await expect(caller(APPLICANT).allianceApplications.list()).rejects.toThrow();
    await expect(caller(APPLICANT).allianceApplications.updateStatus({ id: appId, status: "rejected" })).rejects.toThrow();
  });
});

