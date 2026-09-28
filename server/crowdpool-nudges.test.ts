/**
 * Steward nudges and the contributor's "still waiting" note (build spec
 * 2026-09-27, section 8.3; Rye's ruling: stewards hear at 2 days, "to keep
 * things active"). server/jobs/crowdpoolDailyJob.ts runNudges.
 *
 * Step 1 at 2 days and step 2 at 7 go to every steward once, then never
 * again; an offer first found at day 8 is nudged once; a contributor with an
 * account hears once at 14 days, people without one never. Accepted offers
 * and examples get nothing. Two runs at once nudge once. A steward added
 * after step 1 never gets a late step 1. crowdpool.nudges = 0 pauses it.
 *
 * The job sends, then stamps (review 2026-09-28). The concurrency tests use
 * spine(), an insert that enforces the notifications table's unique
 * dedupeKey the way ON DUPLICATE KEY does, so "once" means one row per key.
 *
 * Run against the SCRATCH database, never production. Every run is scoped
 * to this file's own campaigns (onlyCampaignIds).
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
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

import { runCrowdpoolDailyJob, runNudges } from "./jobs/crowdpoolDailyJob";

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 988101;
const CO_STEWARD = 988102;
const ACC = 988103;
const LATE_STEWARD = 988104;
const ACC_TWO = 988105;
const DB_TIMEOUT = 60_000;
const on = async () => 1;

const createdCampaignIds: number[] = [];

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

async function liveCampaign(title: string) {
  const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title: `Test Nudge ${title}`,
    description: "Nudge fixture",
    projectName: `Test Nudge ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    durationDays: 90,
    items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 50 }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const [need] = await stewardCaller(OWNER).campaigns.getItems({ campaignId: id });
  return { id, applicationId, needId: need.id as number };
}

async function offer(campaignId: number, needId: number, who: { userId?: number; email: string; name: string; anonymous?: boolean }) {
  const caller = who.userId ? stewardCaller(who.userId) : anonCaller();
  const r = await realOffer(caller.campaigns.submitContribution({
    campaignId, campaignItemId: needId, contributionType: "resource", title: `${who.name}'s seed`,
    contributorName: who.name, contributorEmail: who.email, estimatedValue: 10, isAnonymous: who.anonymous,
  }));
  return r.id;
}

/** The offer was sent `days` days and `hours` hours ago. */
async function aged(contributionId: number, days: number, hours = 1) {
  const database = await dbHelpers.getDb();
  await database!.execute(sql`
    UPDATE campaign_contributions
    SET submittedAt = NOW() - INTERVAL ${days} DAY - INTERVAL ${hours} HOUR
    WHERE id = ${contributionId}
  `);
}

const row = async (id: number) => (await dbHelpers.getContributionById(id))!;
const calls = (insert: ReturnType<typeof vi.fn>) => insert.mock.calls.map((c) => c[0] as any);

/** The spine's unique dedupeKey index in memory: a repeat is a no-op, as ON DUPLICATE KEY makes it. */
function spine() {
  const rows = new Map<string, any>();
  const insert = vi.fn(async (n: any) => {
    if (rows.has(n.dedupeKey)) return false;
    rows.set(n.dedupeKey, n);
    return true;
  });
  return { insert, rows };
}

describe("steward nudges", () => {
  it.skipIf(skipIfNoDb)("step 1 at 2 days, step 2 at 7, each to every steward once, then never again", async () => {
    const f = await liveCampaign("Steps");
    const id = await offer(f.id, f.needId, { userId: ACC, email: "acc.nudge@example.com", name: "Ada" });
    const insert = vi.fn().mockResolvedValue(true);
    const run = () => runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });

    // Under 2 days: nothing.
    await aged(id, 1, 23);
    expect(await run()).toMatchObject({ stewardNudges: 0, stillWaiting: 0 });
    expect(insert).not.toHaveBeenCalled();

    await aged(id, 2);
    expect((await run()).stewardNudges).toBe(2);
    expect(calls(insert).map((n) => [n.userId, n.type, n.dedupeKey]).sort()).toEqual([
      [OWNER, "offer_waiting", `cp:nudge:${id}:s1:u${OWNER}`],
      [CO_STEWARD, "offer_waiting", `cp:nudge:${id}:s1:u${CO_STEWARD}`],
    ].sort());
    expect(calls(insert)[0].title).toBe("Ada's offer is waiting on you");
    expect((await row(id)).nudge1At).not.toBeNull();
    expect((await row(id)).nudge2At).toBeNull();

    // Day 6: already nudged once, not a week yet.
    insert.mockClear();
    await aged(id, 6);
    expect((await run()).stewardNudges).toBe(0);

    await aged(id, 7);
    expect((await run()).stewardNudges).toBe(2);
    expect(calls(insert).every((n) => n.dedupeKey.startsWith(`cp:nudge:${id}:s2:`))).toBe(true);
    expect(calls(insert)[0].title).toBe("Ada has waited a week to hear back");

    // Never again, even much later.
    insert.mockClear();
    await aged(id, 12);
    expect((await run()).stewardNudges).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("an offer first found at day 8 gets one nudge; older than 30 days, none", async () => {
    const f = await liveCampaign("Day eight");
    const late = await offer(f.id, f.needId, { email: "late.nudge@example.com", name: "Lu", anonymous: true });
    const ancient = await offer(f.id, f.needId, { email: "old.nudge@example.com", name: "Ol" });
    await aged(late, 8);
    await aged(ancient, 31);
    const insert = vi.fn().mockResolvedValue(true);
    const r = await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(r.stewardNudges).toBe(2);
    expect(calls(insert).map((n) => n.dedupeKey).sort()).toEqual([
      `cp:nudge:${late}:s2:u${CO_STEWARD}`,
      `cp:nudge:${late}:s2:u${OWNER}`,
    ].sort());
    // Anonymous: the stewards read "Someone", and the words say how long it
    // really waited (review 2026-09-28), not "a week".
    expect(calls(insert)[0].title).toBe("Someone has waited 8 days to hear back");
    expect(calls(insert)[0].body).toContain("8 days ago");
    expect((await row(late)).nudge1At).not.toBeNull();
    expect((await row(late)).nudge2At).not.toBeNull();
    expect((await row(ancient)).nudge1At).toBeNull();
    insert.mockClear();
    await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("accepted offers and example campaigns get nothing", async () => {
    const f = await liveCampaign("Accepted");
    const id = await offer(f.id, f.needId, { email: "taken.nudge@example.com", name: "Tay" });
    await stewardCaller(OWNER).campaigns.updateContributionStatus({ contributionId: id, status: "accepted" });
    await aged(id, 3);
    const example = await liveCampaign("Example");
    const exId = await offer(example.id, example.needId, { email: "ex.nudge@example.com", name: "Exa" });
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, example.id));
    await aged(exId, 3);
    const insert = vi.fn().mockResolvedValue(true);
    expect(await runNudges({ onlyCampaignIds: [f.id, example.id], insert, readSwitch: on })).toMatchObject({ stewardNudges: 0, stillWaiting: 0 });
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("two runs at once nudge once", async () => {
    const f = await liveCampaign("Concurrent");
    const id = await offer(f.id, f.needId, { email: "twice.nudge@example.com", name: "Tw" });
    await aged(id, 2);
    const s = spine();
    const results = await Promise.all([
      runNudges({ onlyCampaignIds: [f.id], insert: s.insert, readSwitch: on }),
      runNudges({ onlyCampaignIds: [f.id], insert: s.insert, readSwitch: on }),
      runNudges({ onlyCampaignIds: [f.id], insert: s.insert, readSwitch: on }),
    ]);
    // One row per steward, and only the run that stamped counts them.
    expect([...s.rows.keys()].sort()).toEqual([`cp:nudge:${id}:s1:u${CO_STEWARD}`, `cp:nudge:${id}:s1:u${OWNER}`].sort());
    expect(results.reduce((n, r) => n + r.stewardNudges, 0)).toBe(2);
    expect((await row(id)).nudge1At).not.toBeNull();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("a run that stops between the sends and the stamp loses nothing: the next run reaches the rest, once each", async () => {
    const f = await liveCampaign("Stopped");
    const id = await offer(f.id, f.needId, { email: "stopped.nudge@example.com", name: "Sto" });
    await aged(id, 2);
    const s = spine();
    // The first steward's notice lands, then the run dies on the second.
    let n = 0;
    const dying = vi.fn(async (input: any) => {
      n += 1;
      if (n === 2) throw new Error("process stopped");
      return s.insert(input);
    });
    expect((await runNudges({ onlyCampaignIds: [f.id], insert: dying, readSwitch: on })).stewardNudges).toBe(0);
    expect(s.rows.size).toBe(1);
    // Nothing was stamped, so the step is still owed.
    expect((await row(id)).nudge1At).toBeNull();

    const next = await runNudges({ onlyCampaignIds: [f.id], insert: s.insert, readSwitch: on });
    expect(next.stewardNudges).toBe(2);
    expect([...s.rows.keys()].sort()).toEqual([`cp:nudge:${id}:s1:u${CO_STEWARD}`, `cp:nudge:${id}:s1:u${OWNER}`].sort());
    expect((await row(id)).nudge1At).not.toBeNull();
    // And never again.
    s.insert.mockClear();
    await runNudges({ onlyCampaignIds: [f.id], insert: s.insert, readSwitch: on });
    expect(s.insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("a steward added after step 1 never gets a late step 1, and does get step 2", async () => {
    const f = await liveCampaign("Late steward");
    const id = await offer(f.id, f.needId, { email: "later.nudge@example.com", name: "Lat" });
    await aged(id, 2);
    const insert = vi.fn().mockResolvedValue(true);
    await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(calls(insert).map((n) => n.userId).sort()).toEqual([OWNER, CO_STEWARD].sort());
    await createApprovedLandClaim(LATE_STEWARD, f.applicationId);
    insert.mockClear();
    await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(insert).not.toHaveBeenCalled();
    await aged(id, 7);
    await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(calls(insert).map((n) => n.userId).sort()).toEqual([OWNER, CO_STEWARD, LATE_STEWARD].sort());
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("crowdpool.nudges = 0 pauses it; a failed send is handed back for the next run", async () => {
    const f = await liveCampaign("Paused");
    const id = await offer(f.id, f.needId, { email: "pause.nudge@example.com", name: "Pa" });
    await aged(id, 3);
    const insert = vi.fn().mockResolvedValue(true);
    expect(await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: async () => 0 })).toMatchObject({ paused: true, stewardNudges: 0 });
    expect(insert).not.toHaveBeenCalled();
    expect((await row(id)).nudge1At).toBeNull();

    // Every notice fails: the claim goes back, and the next run sends it.
    const failing = vi.fn().mockRejectedValue(new Error("db down"));
    expect((await runNudges({ onlyCampaignIds: [f.id], insert: failing, readSwitch: on })).stewardNudges).toBe(0);
    expect((await row(id)).nudge1At).toBeNull();
    expect((await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on })).stewardNudges).toBe(2);
  }, DB_TIMEOUT);
});

describe("the contributor's note at 14 days", () => {
  it.skipIf(skipIfNoDb)("reaches an account holder once, never someone without an account", async () => {
    const f = await liveCampaign("Still waiting");
    const acc = await offer(f.id, f.needId, { userId: ACC_TWO, email: "acc2.nudge@example.com", name: "Bea" });
    const anon = await offer(f.id, f.needId, { email: "anon.wait@example.com", name: "Cy" });
    await aged(acc, 13);
    await aged(anon, 14);
    const insert = vi.fn().mockResolvedValue(true);
    // Day 13: the stewards' week nudges go, the contributor's note waits.
    expect((await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on })).stillWaiting).toBe(0);
    await aged(acc, 14);
    insert.mockClear();
    const r = await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(r.stillWaiting).toBe(1);
    const notes = calls(insert).filter((n) => n.type === "offer_still_waiting");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      userId: ACC_TWO,
      title: "Your offer to Test Nudge Still waiting is still waiting",
      dedupeKey: `cp:wait:${acc}:u${ACC_TWO}`,
    });
    expect((await row(acc)).waitNoteAt).not.toBeNull();
    expect((await row(anon)).waitNoteAt).toBeNull();
    insert.mockClear();
    await runNudges({ onlyCampaignIds: [f.id], insert, readSwitch: on });
    expect(insert).not.toHaveBeenCalled();
  }, DB_TIMEOUT);

  it.skipIf(skipIfNoDb)("runs inside the daily job, which closes nothing that isn't due", async () => {
    const f = await liveCampaign("Daily");
    const id = await offer(f.id, f.needId, { email: "daily.nudge@example.com", name: "Dai" });
    await aged(id, 2);
    const insert = vi.fn().mockResolvedValue(true);
    const r = await runCrowdpoolDailyJob({ onlyCampaignIds: [f.id], insert, readSwitch: on, sendEmail: vi.fn() as any });
    expect(r).toMatchObject({ closed: 0, completed: 0, stewardNudges: 2, stillWaiting: 0, finalStretch: 0, errors: [] });
    expect((await dbHelpers.getCampaignById(f.id))!.status).toBe("active");
    // A dry run reports and writes nothing.
    const other = await offer(f.id, f.needId, { email: "dry.nudge@example.com", name: "Dry" });
    await aged(other, 3);
    insert.mockClear();
    const dry = await runCrowdpoolDailyJob({ onlyCampaignIds: [f.id], insert, readSwitch: on, dryRun: true });
    expect(dry.stewardNudges).toBe(2);
    expect(insert).not.toHaveBeenCalled();
    expect((await row(other)).nudge1At).toBeNull();
  }, DB_TIMEOUT);
});
