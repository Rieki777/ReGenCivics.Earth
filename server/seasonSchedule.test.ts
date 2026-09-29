/**
 * Season Schedule sync, against a real database.
 *
 * Runs on made-up Seasons with their own names and 2030 dates, passed to
 * syncSeason directly, so it only ever touches the rows it creates: never the
 * real Season 2 episodes, settings or votes. Every call passes its own `now`.
 * EMAIL_HOLD keeps the decision and move emails from leaving the building.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like } from "drizzle-orm";
import { getDb, setSiteSetting } from "./db";
import {
  eventAutoReminderSends,
  eventAutoReminders,
  eventSignups,
  events,
  seasonFeedback,
  seasonScheduleVotes,
  siteSettings,
} from "../drizzle/schema";
import {
  recordSeasonFeedback,
  resolveSeasonState,
  seasonFeedbackCount,
  seasonFeedbackRows,
  seasonPublicNotes,
  setSeasonNotePublic,
  syncSeason,
} from "./lib/seasonSchedule";
import { seasonSettingKey, type SeasonScheduleConfig } from "@shared/seasonSchedule";
import { ALWAYS_INCLUDE_REMINDER_RECIPIENTS } from "@shared/eventAutoReminders";

const skipIfNoDb = !process.env.DATABASE_URL;
const SIGNUP = "season-schedule-test@example.com";
// Everyone a test session's reminders reach: its one sign-up, plus whoever the
// team put on every reminder (ALWAYS_INCLUDE_REMINDER_RECIPIENTS).
const AUDIENCE = 1 + ALWAYS_INCLUDE_REMINDER_RECIPIENTS.length;

const HOUR = 3_600_000;
// The vote decides Thursday 2030-01-03 00:00 UTC (Wednesday 4pm Pacific).
const FOLLOWS = new Date("2030-01-03T00:00:00Z");
const OPEN = new Date(FOLLOWS.getTime() - HOUR);

function testConfig(season: string): SeasonScheduleConfig {
  return {
    season,
    name: "Test Season",
    weeks: ["2030-01-05", "2030-01-12", "2030-01-19", "2030-01-26", "2030-02-02"],
    opening: { key: "sat", hourPT: 11 },
    offered: [
      { key: "tue", hourPT: 14 },
      { key: "wed", hourPT: 10 },
      { key: "thu", hourPT: 12 },
      { key: "sat", hourPT: 11 },
    ],
    followsFrom: FOLLOWS,
    minutes: 120,
    selectionVideos: true,
    revealNamesAt: 7,
  };
}

function slugOf(season: string): string {
  return `season_schedule:${season.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:%`;
}

async function cleanup(season: string) {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ id: events.id }).from(events).where(eq(events.season, season));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db.delete(eventAutoReminderSends).where(inArray(eventAutoReminderSends.eventId, ids));
    await db.delete(eventAutoReminders).where(inArray(eventAutoReminders.eventId, ids));
    await db.delete(eventSignups).where(inArray(eventSignups.eventId, ids));
    await db.delete(events).where(inArray(events.id, ids));
  }
  await db.delete(seasonScheduleVotes).where(eq(seasonScheduleVotes.season, season));
  await db.delete(seasonFeedback).where(eq(seasonFeedback.season, season));
  await db.delete(siteSettings).where(like(siteSettings.key, slugOf(season)));
}

/** Five Saturdays at 11am Pacific, each reminding one sign-up, as the catalog seeds them. */
async function seed(season: string) {
  const db = (await getDb())!;
  const config = testConfig(season);
  for (let i = 0; i < config.weeks.length; i++) {
    const start = new Date(`${config.weeks[i]}T19:00:00Z`);
    await db.insert(events).values({
      title: `Week ${i + 1}: Test`,
      type: "episode",
      season,
      episodeNumber: i + 1,
      startTime: start,
      endTime: new Date(start.getTime() + 2 * HOUR),
      timezone: "PST",
      status: "upcoming",
    });
  }
  const ids = (await db.select({ id: events.id }).from(events).where(eq(events.season, season))).map((r) => r.id);
  for (const eventId of ids) {
    await db.insert(eventAutoReminders).values({
      eventId,
      enabled: 1,
      audienceMode: "custom",
      audienceConfig: { includeEventSignups: true },
      offsetsJson: [10080, 1440, 60, 33],
    });
    await db.insert(eventSignups).values({ eventId, email: SIGNUP, name: "Test", signupType: "reminder" });
  }
}

async function vote(season: string, voterKey: string, slots: string, projectName: string | null = null) {
  const db = (await getDb())!;
  await db
    .insert(seasonScheduleVotes)
    .values({ season, voterKey: `seasonTest${voterKey}`, slots, projectName })
    .onDuplicateKeyUpdate({ set: { slots, projectName } });
}

async function starts(season: string): Promise<Record<number, string>> {
  const db = (await getDb())!;
  const rows = await db
    .select({ week: events.episodeNumber, startTime: events.startTime })
    .from(events)
    .where(eq(events.season, season));
  return Object.fromEntries(rows.map((r) => [r.week, new Date(r.startTime).toISOString()]));
}

describe.skipIf(skipIfNoDb)("Season Schedule sync", () => {
  const SEASON = "Season Schedule Test";
  const CONFIG = testConfig(SEASON);

  beforeAll(async () => {
    process.env.EMAIL_HOLD = "true";
    await cleanup(SEASON);
    await seed(SEASON);
  });
  afterAll(() => cleanup(SEASON));

  it("counts projects, keeps the current time on a tie, and holds every session until the vote decides", async () => {
    const db = (await getDb())!;
    await vote(SEASON, "A", "wed", "Rainbow Bridge Hawaii");
    await vote(SEASON, "B", "wed,sat", "Tao Hermitage");
    await vote(SEASON, "C", "sat", "Aquarella");
    // Wednesday 2 projects, Saturday 2 projects: a tie that includes the current time keeps it.
    expect((await resolveSeasonState(db, CONFIG, OPEN)).leader).toBe("sat");

    // A second person from Rainbow Bridge Hawaii adds nothing: one project, one vote.
    await vote(SEASON, "A2", "wed,thu", "rainbow bridge  hawaii");
    expect((await resolveSeasonState(db, CONFIG, OPEN)).leader).toBe("sat");

    await vote(SEASON, "D", "wed", "Living University");
    const before = await starts(SEASON);
    const r = await syncSeason(db, CONFIG, OPEN);
    expect(r.moved).toBe(0);
    expect(r.decided).toBe(false);
    expect(r.slot).toEqual({ key: "sat", hourPT: 11 });
    expect(await starts(SEASON)).toEqual(before);

    const state = await resolveSeasonState(db, CONFIG, OPEN);
    expect(state.following).toBe(false);
    expect(state.decidedAt).toBeNull();
    expect(state.leader).toBe("wed");
    expect(state.leaderSince).toBe(OPEN.getTime());
    expect(state.tally.projects).toBe(4);
    expect(state.tally.slots.find((s) => s.key === "wed")).toMatchObject({ hands: 4, projects: 3, share: 75 });
    // The Selection Day video note starts from the Season's default, then follows the admin switch.
    expect(state.selectionVideos).toBe(true);
    await setSiteSetting(seasonSettingKey(SEASON, "selection_videos"), "off");
    expect((await resolveSeasonState(db, CONFIG, OPEN)).selectionVideos).toBe(false);
  });

  it("decides at the deadline: the leader then wins at once, the next session moves too, and everyone is told", async () => {
    const db = (await getDb())!;
    const now = new Date(FOLLOWS.getTime() + 60_000);
    const r = await syncSeason(db, CONFIG, now);
    expect(r.decided).toBe(true);
    expect(r.slot).toEqual({ key: "wed", hourPT: 10 });
    // Week 1 was two days out, inside the usual 72 hours, and moves anyway:
    // the next session was always up to the vote.
    expect(r.moved).toBe(5);
    expect(r.notified).toBe(AUDIENCE);

    // Each session meets on the Wednesday on or after its week's Saturday.
    expect(await starts(SEASON)).toEqual({
      1: "2030-01-09T18:00:00.000Z",
      2: "2030-01-16T18:00:00.000Z",
      3: "2030-01-23T18:00:00.000Z",
      4: "2030-01-30T18:00:00.000Z",
      5: "2030-02-06T18:00:00.000Z",
    });

    // Week 1's 7-day reminder was already due at its new time, so it is marked
    // handled instead of going out late as "In 7 days". Nothing else is.
    expect(r.claimedReminders).toBe(1);
    const [week1] = await db.select({ id: events.id }).from(events).where(and(eq(events.season, SEASON), eq(events.episodeNumber, 1)));
    const sends = await db.select().from(eventAutoReminderSends).where(eq(eventAutoReminderSends.eventId, week1.id));
    expect(sends.map((s) => [s.offsetMinutes, s.recipientCount])).toEqual([[10080, 0]]);

    // Decided once: a second run moves nothing, emails nobody and decides nothing.
    const again = await syncSeason(db, CONFIG, now);
    expect(again).toMatchObject({ moved: 0, notified: 0, decided: false });
    expect((await resolveSeasonState(db, CONFIG, now)).decidedAt).not.toBeNull();
  });

  it("keeps following the vote: a new leader moves the Season again after a day, sessions inside 72 hours stay", async () => {
    const db = (await getDb())!;
    const t = new Date(FOLLOWS.getTime() + 2 * HOUR);
    for (const key of ["G", "H", "I", "J"]) await vote(SEASON, key, "thu", `Thursday Project ${key}`);
    expect((await resolveSeasonState(db, CONFIG, t)).leader).toBe("thu");

    const early = await syncSeason(db, CONFIG, new Date(t.getTime() + HOUR));
    expect(early.moved).toBe(0);
    expect(early.slot).toEqual({ key: "wed", hourPT: 10 });

    const later = await syncSeason(db, CONFIG, new Date(t.getTime() + 24 * HOUR + 60_000));
    expect(later.slot).toEqual({ key: "thu", hourPT: 12 });
    expect(later.notified).toBe(AUDIENCE);
    const after = await starts(SEASON);
    expect(after[1]).toBe("2030-01-10T20:00:00.000Z"); // Thursday 12pm PST, more than 72 hours out
    expect(after[5]).toBe("2030-02-07T20:00:00.000Z");
  });

  it("files notes against the next session, shares only what the writer chose, and lets an admin take one down", async () => {
    const db = (await getDb())!;
    // Wednesday 2030-01-02: Week 1 is next.
    const now = new Date("2030-01-02T20:00:00Z");
    const shared = await recordSeasonFeedback(
      db,
      CONFIG,
      { topic: "How other projects hold land together", facilitation: null, displayName: "Maya", projectName: "Rainbow Bridge Hawaii", isPublic: true },
      now,
    );
    expect(shared.week).toBe(1);
    await recordSeasonFeedback(db, CONFIG, { topic: null, facilitation: "More time for questions", displayName: null, projectName: null }, now);
    // An empty note is not stored.
    await recordSeasonFeedback(db, CONFIG, { topic: "   ", facilitation: "", displayName: "Nobody", projectName: null }, now);

    expect(await seasonFeedbackCount(db, SEASON, 1)).toBe(2);
    const rows = await seasonFeedbackRows(db, SEASON);
    const anon = rows.find((r) => r.facilitation === "More time for questions")!;
    expect(anon).toMatchObject({ week: 1, displayName: null, projectName: null, topic: null, isPublic: 0 });

    const onPage = await seasonPublicNotes(db, SEASON);
    expect(onPage.map((n) => n.topic)).toEqual(["How other projects hold land together"]);
    expect(onPage[0]).not.toHaveProperty("id");

    const sharedRow = rows.find((r) => r.isPublic === 1)!;
    await setSeasonNotePublic(db, SEASON, sharedRow.id, false);
    expect(await seasonPublicNotes(db, SEASON)).toEqual([]);
  });

  it("follows a pin, and leaves an admin-edited session where it is", async () => {
    const db = (await getDb())!;
    const now = new Date(OPEN.getTime() + 51 * HOUR);
    await db.update(events).set({ manualOverride: 1 }).where(and(eq(events.season, SEASON), eq(events.episodeNumber, 4)));
    await setSiteSetting(seasonSettingKey(SEASON, "pinned"), "tue");

    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "tue", hourPT: 14 });
    const after = await starts(SEASON);
    expect(after[1]).toBe("2030-01-08T22:00:00.000Z"); // Tuesday 2pm PST
    expect(after[2]).toBe("2030-01-15T22:00:00.000Z");
    expect(after[4]).toBe("2030-01-31T20:00:00.000Z"); // edited by an admin: stays on Thursday
    expect(after[5]).toBe("2030-02-05T22:00:00.000Z");
  });

  it("puts a drifted session back on the Season's time without emailing anyone", async () => {
    const db = (await getDb())!;
    const now = new Date(OPEN.getTime() + 52 * HOUR);
    await db
      .update(events)
      .set({ startTime: new Date("2030-02-05T15:00:00Z") })
      .where(and(eq(events.season, SEASON), eq(events.episodeNumber, 5)));
    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "tue", hourPT: 14 });
    expect(r.moved).toBe(1);
    expect(r.notified).toBe(0);
    expect((await starts(SEASON))[5]).toBe("2030-02-05T22:00:00.000Z");
  });
});

describe.skipIf(skipIfNoDb)("Season Schedule sync when Saturday wins", () => {
  const SEASON = "Season Schedule Saturday Test";
  const CONFIG = testConfig(SEASON);

  beforeAll(async () => {
    process.env.EMAIL_HOLD = "true";
    await cleanup(SEASON);
    await seed(SEASON);
  });
  afterAll(() => cleanup(SEASON));

  it("moves nothing but still tells everyone the next session is on", async () => {
    const db = (await getDb())!;
    await vote(SEASON, "S1", "sat", "Saturday Farm");
    await vote(SEASON, "S2", "sat,wed", "Weekend Commons");
    await syncSeason(db, CONFIG, OPEN);
    const before = await starts(SEASON);

    const r = await syncSeason(db, CONFIG, new Date(FOLLOWS.getTime() + 60_000));
    expect(r).toMatchObject({ decided: true, moved: 0, notified: AUDIENCE, slot: { key: "sat", hourPT: 11 } });
    expect(await starts(SEASON)).toEqual(before);
  });
});
