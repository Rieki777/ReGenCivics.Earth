/**
 * Follow a project (build spec 2026-09-27, section 12; research R05).
 *
 * A follow is on the project (user_follows targetType 'project', ref
 * 'a{applicationId}' or 'c{campaignId}'), so it lasts from season to
 * season. followProject follows only what the project page would show;
 * examples are refused. Followers hear when crowdpooling opens (never the
 * stewards or the admin who opened it) and two weeks before a close, naming
 * up to three open needs and skipping anyone who already offered (by account
 * or by email). Nothing is sent while every need is filled. The follower
 * union (campaign follows plus project follows) feeds update notices,
 * counts and the page's viewer.followsProject.
 *
 * Run against the SCRATCH database, never production. The daily job is
 * always scoped to this file's own campaigns (onlyCampaignIds).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as dbHelpers from "./db";
import {
  campaigns,
  campaignContributions,
  campaignFollowers,
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
import { runFinalStretch } from "./jobs/crowdpoolDailyJob";
import { FOLLOW } from "../shared/crowdpoolCopy";

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 988201;
const CO_STEWARD = 988202;
const FAN = 988203;
const CAMPAIGN_FAN = 988204;
const STRANGER = 988205;
const OFFERED_FAN = 988206;
const DB_TIMEOUT = 60_000;

const createdCampaignIds: number[] = [];
const createdUserOpenIds: string[] = [];
const followerIds = [FAN, CAMPAIGN_FAN, STRANGER, OFFERED_FAN, OWNER, CO_STEWARD];
const insertMock = vi.mocked(insertNotification);

beforeEach(() => insertMock.mockClear());

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaignUpdates).where(inArray(campaignUpdates.campaignId, createdCampaignIds));
    await database!.delete(campaignFollowers).where(inArray(campaignFollowers.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await database!.delete(userFollows).where(inArray(userFollows.userId, followerIds));
  if (createdUserOpenIds.length) {
    const made = await database!.select({ id: users.id }).from(users).where(inArray(users.openId, createdUserOpenIds));
    if (made.length) await database!.delete(userFollows).where(inArray(userFollows.userId, made.map((u) => u.id)));
    await database!.delete(users).where(inArray(users.openId, createdUserOpenIds));
  }
  await cleanupFixtureApplications();
});

type Item = Parameters<ReturnType<typeof stewardCaller>["campaigns"]["create"]>[0]["items"][number];
const seed = (name = "Seed", quantityWanted = 10): Item => ({ category: "resource", resourceName: name, resourceDescription: name, estimatedValue: 1000, quantityWanted });

async function campaignFor(applicationId: number | undefined, title: string, items: Item[] = [seed()], publish = true) {
  const caller = applicationId ? stewardCaller(OWNER) : adminCaller();
  const { id } = await caller.campaigns.create({
    title: `Test Follow ${title}`,
    description: "Follow fixture",
    projectName: `Test Follow ${title}`,
    currency: "USD",
    financialTarget: 0,
    durationDays: 90,
    ...(applicationId ? { applicationId } : {}),
    items,
  });
  createdCampaignIds.push(id);
  if (publish) await adminCaller().campaigns.updateStatus({ id, status: "active" });
  return id;
}

async function followRows(userId: number) {
  const database = await dbHelpers.getDb();
  return database!.select({ targetType: userFollows.targetType, targetId: userFollows.targetId })
    .from(userFollows).where(eq(userFollows.userId, userId));
}

async function realUser(tag: string, email: string): Promise<number> {
  const database = await dbHelpers.getDb();
  const openId = `fixture-open-follow-${tag}-${Date.now()}`;
  createdUserOpenIds.push(openId);
  const r: any = await database!.insert(users).values({ openId, email, name: tag, loginMethod: "email", role: "user" });
  return Number(r?.[0]?.insertId);
}

describe("followProject", () => {
  it.skipIf(skipIfNoDb)("follows by application key and by campaign key, once; unfollow removes campaign follows too", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const id = await campaignFor(applicationId, "Keys");
    const fan = stewardCaller(FAN);
    expect(await fan.campaigns.followProject({ key: `${applicationId}-any-slug` })).toEqual({ following: true });
    // A campaign key of a campaign with an application follows the application.
    await fan.campaigns.followProject({ key: `c${id}` });
    await fan.campaigns.follow({ campaignId: id });
    expect((await followRows(FAN)).map((r) => `${r.targetType}:${r.targetId}`).sort())
      .toEqual([`campaign:${id}`, `project:a${applicationId}`].sort());
    expect((await fan.projects.getPublic({ key: String(applicationId) })).viewer).toEqual({ followsProject: true });
    expect((await stewardCaller(STRANGER).projects.getPublic({ key: String(applicationId) })).viewer).toEqual({ followsProject: false });
    expect((await anonCaller().projects.getPublic({ key: String(applicationId) })).viewer).toEqual({ followsProject: false });
    // Counts see the union once per person.
    expect((await stewardCaller(OWNER).campaigns.followerCounts({ campaignId: id })).accounts).toBe(1);

    expect(await fan.campaigns.unfollowProject({ key: String(applicationId) })).toEqual({ following: false });
    expect(await followRows(FAN)).toEqual([]);
    expect((await fan.projects.getPublic({ key: String(applicationId) })).viewer).toEqual({ followsProject: false });

    // A campaign without an application is its own project.
    const solo = await campaignFor(undefined, "Solo");
    await fan.campaigns.followProject({ key: `c${solo}-solo` });
    expect((await followRows(FAN)).map((r) => `${r.targetType}:${r.targetId}`)).toEqual([`project:c${solo}`]);
    // A campaign follow alone also reads as following the project.
    await stewardCaller(CAMPAIGN_FAN).campaigns.follow({ campaignId: solo });
    expect((await stewardCaller(CAMPAIGN_FAN).projects.getPublic({ key: `c${solo}` })).viewer.followsProject).toBe(true);
    await fan.campaigns.unfollowProject({ key: `c${solo}` });
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("refuses what the page would not show, and example projects", async () => {
    const inReview = await createApprovedApplication(OWNER, { status: "submitted" });
    await expect(stewardCaller(FAN).campaigns.followProject({ key: String(inReview) })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const approved = await createApprovedApplication(OWNER);
    const draft = await campaignFor(approved, "Draft", [seed()], false);
    await expect(stewardCaller(FAN).campaigns.followProject({ key: `c${draft}` })).rejects.toMatchObject({ code: "NOT_FOUND" });
    for (const key of ["", "abc", "c0", "999999998", "12;drop"]) {
      await expect(stewardCaller(FAN).campaigns.followProject({ key }), key).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    const exampleApp = await createApprovedApplication(OWNER);
    const example = await campaignFor(exampleApp, "Example");
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, example));
    await expect(stewardCaller(FAN).campaigns.followProject({ key: String(exampleApp) }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: FOLLOW.exampleRefused });
    await expect(stewardCaller(FAN).campaigns.followProject({ key: `c${example}` }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: FOLLOW.exampleRefused });
    // A guest has no account to follow with.
    await expect(anonCaller().campaigns.followProject({ key: String(approved) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await followRows(FAN)).filter((r) => r.targetId === `a${inReview}` || r.targetId === `a${exampleApp}`)).toEqual([]);
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("an email follow carries its project", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await campaignFor(applicationId, "Email follow");
    const email = `follow.email.${Date.now()}@example.com`;
    await anonCaller().campaigns.subscribeByEmail({ campaignId: id, email });
    const database = await dbHelpers.getDb();
    const [r] = await database!.select({ projectRef: campaignFollowers.projectRef }).from(campaignFollowers)
      .where(and(eq(campaignFollowers.campaignId, id), eq(campaignFollowers.email, email)));
    expect(r.projectRef).toBe(`a${applicationId}`);
  }, DB_TIMEOUT);
});

describe("crowdpooling opens", () => {
  it.skipIf(skipIfNoDb)("project followers hear once, never the stewards or the admin who opened it", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    // Following before any campaign is how the opening reaches people.
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    await stewardCaller(CO_STEWARD).campaigns.followProject({ key: String(applicationId) });
    const id = await campaignFor(applicationId, "Opens", [seed("Seed"), seed("Tools", 2)], false);
    insertMock.mockClear();
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    const opened = insertMock.mock.calls.map((c) => c[0] as any).filter((n) => n.type === "campaign_opened");
    expect(opened.map((n) => n.userId)).toEqual([FAN]);
    expect(opened[0]).toMatchObject({
      title: "Crowdpooling is open at Test Follow Opens",
      dedupeKey: `cp:opened:${id}:u${FAN}`,
    });
    expect(opened[0].body).toMatch(/^Test Follow Opens is asking for help\. 2 needs still open\. 2 things\. Closes \d{1,2} [A-Z][a-z]+ \d{4}\.$/);
    expect(opened[0].link).toMatch(new RegExp(`^/project/${applicationId}-[a-z0-9-]+\\?campaign=${id}#needs$`));
    // Asking again changes nothing and tells nobody.
    insertMock.mockClear();
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    expect(insertMock).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("an example going live tells nobody", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    const id = await campaignFor(applicationId, "Example opens", [seed()], false);
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
    insertMock.mockClear();
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    expect(insertMock.mock.calls.filter((c) => (c[0] as any).type === "campaign_opened")).toHaveLength(0);
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("the follower union feeds a steward's update notices", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await campaignFor(applicationId, "Updates");
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    await stewardCaller(CAMPAIGN_FAN).campaigns.follow({ campaignId: id });
    insertMock.mockClear();
    await stewardCaller(OWNER).campaigns.createUpdate({ campaignId: id, title: "Planting news", body: "We planted." });
    const updates = insertMock.mock.calls.map((c) => c[0] as any).filter((n) => n.type === "campaign_update");
    expect(updates.map((n) => n.userId).sort()).toEqual([FAN, CAMPAIGN_FAN].sort());
  }, DB_TIMEOUT);
});

describe("two weeks before the close", () => {
  /** Live 80 of 90 days: the close is 10 days away. */
  async function inTheWindow(id: number) {
    const database = await dbHelpers.getDb();
    await database!.execute(sql`
      UPDATE campaigns SET startedAt = NOW() - INTERVAL 80 DAY, publishedAt = NOW() - INTERVAL 80 DAY, durationDays = 90
      WHERE id = ${id}
    `);
  }

  it.skipIf(skipIfNoDb)("names up to three open needs, skips stewards and anyone who offered, sends once", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const id = await campaignFor(applicationId, "Stretch", [seed("Seed"), seed("Tools", 2), seed("Water", 3), seed("Compost", 4)]);
    const needs = await stewardCaller(OWNER).campaigns.getItems({ campaignId: id });
    // Followers: one who never offered, one who offered with their account,
    // one real account whose email is on a signed-out offer, and a steward.
    const byEmail = await realUser("byemail", `follow.byemail.${Date.now()}@example.com`);
    for (const uid of [FAN, OFFERED_FAN, byEmail, CO_STEWARD]) {
      await stewardCaller(uid).campaigns.followProject({ key: String(applicationId) });
    }
    await realOffer(stewardCaller(OFFERED_FAN).campaigns.submitContribution({
      campaignId: id, campaignItemId: needs[0].id, contributionType: "resource", title: "Some seed",
      contributorName: "Off", contributorEmail: "offered.fan@example.com", estimatedValue: 10,
    }));
    const [u] = await (await dbHelpers.getDb())!.select({ email: users.email }).from(users).where(eq(users.id, byEmail));
    await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: id, campaignItemId: needs[1].id, contributionType: "resource", title: "Some tools",
      contributorName: "Mail", contributorEmail: String(u.email).toUpperCase(), estimatedValue: 10,
    }));
    await inTheWindow(id);

    const insert = vi.fn().mockResolvedValue(true);
    const r = await runFinalStretch({ onlyCampaignIds: [id], insert });
    expect(r).toEqual({ campaigns: 1, notices: 1 });
    const [notice] = insert.mock.calls.map((c) => c[0] as any);
    expect(notice).toMatchObject({
      userId: FAN,
      type: "campaign_final_stretch",
      title: "These needs are still open at Test Follow Stretch",
      dedupeKey: `cp:stretch:${id}:u${FAN}`,
    });
    const parts = notice.body.split(". Crowdpooling at ");
    expect(parts[0].split("; ")).toHaveLength(3);
    expect(parts[1]).toMatch(/^Test Follow Stretch closes on \d{1,2} [A-Z][a-z]+ \d{4}\.$/);
    expect((await dbHelpers.getCampaignById(id))!.finalStretchNoticedAt).not.toBeNull();

    insert.mockClear();
    expect(await runFinalStretch({ onlyCampaignIds: [id], insert })).toEqual({ campaigns: 0, notices: 0 });
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("sends nothing while every need is filled, and announces a need that opens again", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await campaignFor(applicationId, "All filled", [seed("Seed", 1)]);
    const [need] = await stewardCaller(OWNER).campaigns.getItems({ campaignId: id });
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    const taken = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: id, campaignItemId: need.id, contributionType: "resource", title: "The seed",
      contributorName: "Tak", contributorEmail: "taken.stretch@example.com", estimatedValue: 10,
    }));
    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: taken.id, status: "accepted" });
    await inTheWindow(id);
    const insert = vi.fn().mockResolvedValue(true);
    expect(await runFinalStretch({ onlyCampaignIds: [id], insert })).toEqual({ campaigns: 0, notices: 0 });
    expect((await dbHelpers.getCampaignById(id))!.finalStretchNoticedAt).toBeNull();

    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: taken.id, status: "released" });
    expect(await runFinalStretch({ onlyCampaignIds: [id], insert })).toEqual({ campaigns: 1, notices: 1 });
    expect((insert.mock.calls[0][0] as any).userId).toBe(FAN);
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("a run that stops halfway through the followers: the next run reaches the rest, once each", async () => {
    // Review 2026-09-28: the campaign was claimed before the sends, so a stop
    // halfway left the rest of the followers without a notice for good.
    const applicationId = await createApprovedApplication(OWNER);
    const id = await campaignFor(applicationId, "Stretch stop", [seed("Seed"), seed("Tools", 2)]);
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    await stewardCaller(CAMPAIGN_FAN).campaigns.follow({ campaignId: id });
    await inTheWindow(id);
    // The spine's unique dedupeKey, in memory.
    const rows = new Map<string, any>();
    const spineInsert = vi.fn(async (n: any) => {
      if (rows.has(n.dedupeKey)) return false;
      rows.set(n.dedupeKey, n);
      return true;
    });
    let n = 0;
    const dying = vi.fn(async (input: any) => {
      n += 1;
      if (n === 2) throw new Error("process stopped");
      return spineInsert(input);
    });
    expect(await runFinalStretch({ onlyCampaignIds: [id], insert: dying })).toEqual({ campaigns: 0, notices: 0 });
    expect(rows.size).toBe(1);
    expect((await dbHelpers.getCampaignById(id))!.finalStretchNoticedAt).toBeNull();

    expect(await runFinalStretch({ onlyCampaignIds: [id], insert: spineInsert })).toEqual({ campaigns: 1, notices: 2 });
    expect([...rows.keys()].sort()).toEqual([`cp:stretch:${id}:u${CAMPAIGN_FAN}`, `cp:stretch:${id}:u${FAN}`].sort());
    expect((await dbHelpers.getCampaignById(id))!.finalStretchNoticedAt).not.toBeNull();
    // Two runs at once afterwards: nothing new.
    spineInsert.mockClear();
    await Promise.all([runFinalStretch({ onlyCampaignIds: [id], insert: spineInsert }), runFinalStretch({ onlyCampaignIds: [id], insert: spineInsert })]);
    expect(spineInsert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("two runs at once give each follower one row, and one run counts them", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await campaignFor(applicationId, "Stretch race", [seed("Seed")]);
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    await stewardCaller(CAMPAIGN_FAN).campaigns.follow({ campaignId: id });
    await inTheWindow(id);
    const rows = new Map<string, any>();
    const spineInsert = vi.fn(async (n: any) => {
      if (rows.has(n.dedupeKey)) return false;
      rows.set(n.dedupeKey, n);
      return true;
    });
    const results = await Promise.all([
      runFinalStretch({ onlyCampaignIds: [id], insert: spineInsert }),
      runFinalStretch({ onlyCampaignIds: [id], insert: spineInsert }),
    ]);
    expect(rows.size).toBe(2);
    expect(results.reduce((s, r) => s + r.notices, 0)).toBe(2);
    expect(results.reduce((s, r) => s + r.campaigns, 0)).toBe(1);
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("too early, too late and too new to be live a week: nothing", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const early = await campaignFor(applicationId, "Early");
    const late = await campaignFor(applicationId, "Late");
    const fresh = await campaignFor(applicationId, "Fresh");
    await stewardCaller(FAN).campaigns.followProject({ key: String(applicationId) });
    const database = await dbHelpers.getDb();
    // 20 days to go, 2 days to go, and live 3 days of a 13-day campaign.
    await database!.execute(sql`UPDATE campaigns SET startedAt = NOW() - INTERVAL 70 DAY, durationDays = 90 WHERE id = ${early}`);
    await database!.execute(sql`UPDATE campaigns SET startedAt = NOW() - INTERVAL 88 DAY, durationDays = 90 WHERE id = ${late}`);
    await database!.execute(sql`UPDATE campaigns SET startedAt = NOW() - INTERVAL 3 DAY, durationDays = 13 WHERE id = ${fresh}`);
    const insert = vi.fn().mockResolvedValue(true);
    expect(await runFinalStretch({ onlyCampaignIds: [early, late, fresh], insert })).toEqual({ campaigns: 0, notices: 0 });
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);
});
