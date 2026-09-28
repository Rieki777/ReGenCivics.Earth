/**
 * Season Schedule sync, against a real database.
 *
 * Runs on a made-up Season with its own name and 2030 dates, passed to
 * syncSeason directly, so it only ever touches the rows it creates: never the
 * real Season 2 episodes, settings or votes. Every call passes its own `now`.
 * EMAIL_HOLD keeps the move emails from leaving the building.
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
const SEASON = "Season Schedule Test";
const SLUG = "season_schedule:season-schedule-test:%";
const SIGNUP = "season-schedule-test@example.com";

const HOUR = 3_600_000;
// The vote starts steering Thursday 2030-01-03 00:00 UTC (Wednesday 4pm Pacific).
const FOLLOWS = new Date("2030-01-03T00:00:00Z");
const OPEN = new Date(FOLLOWS.getTime() - HOUR);

const CONFIG: SeasonScheduleConfig = {
  season: SEASON,
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
};

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ id: events.id }).from(events).where(eq(events.season, SEASON));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db.delete(eventAutoReminderSends).where(inArray(eventAutoReminderSends.eventId, ids));
    await db.delete(eventAutoReminders).where(inArray(eventAutoReminders.eventId, ids));
    await db.delete(eventSignups).where(inArray(eventSignups.eventId, ids));
    await db.delete(events).where(inArray(events.id, ids));
  }
  await db.delete(seasonScheduleVotes).where(eq(seasonScheduleVotes.season, SEASON));
  await db.delete(seasonFeedback).where(eq(seasonFeedback.season, SEASON));
  await db.delete(siteSettings).where(like(siteSettings.key, SLUG));
}

async function vote(voterKey: string, slots: string, projectName: string | null = null) {
  const db = (await getDb())!;
  await db
    .insert(seasonScheduleVotes)
    .values({ season: SEASON, voterKey: `seasonTest${voterKey}`, slots, projectName })
    .onDuplicateKeyUpdate({ set: { slots, projectName } });
}

async function starts(): Promise<Record<number, string>> {
  const db = (await getDb())!;
  const rows = await db
    .select({ week: events.episodeNumber, startTime: events.startTime })
    .from(events)
    .where(eq(events.season, SEASON));
  return Object.fromEntries(rows.map((r) => [r.week, new Date(r.startTime).toISOString()]));
}

describe.skipIf(skipIfNoDb)("Season Schedule sync", () => {
  beforeAll(async () => {
    process.env.EMAIL_HOLD = "true";
    await cleanup();
    const db = (await getDb())!;
    // Five Saturdays at 11am Pacific (19:00 UTC in January), as the catalog seeds them.
    for (let i = 0; i < CONFIG.weeks.length; i++) {
      const start = new Date(`${CONFIG.weeks[i]}T19:00:00Z`);
      await db.insert(events).values({
        title: `Week ${i + 1}: Test`,
        type: "episode",
        season: SEASON,
        episodeNumber: i + 1,
        startTime: start,
        endTime: new Date(start.getTime() + 2 * HOUR),
        timezone: "PST",
        status: "upcoming",
      });
    }
    const ids = (await db.select({ id: events.id }).from(events).where(eq(events.season, SEASON))).map((r) => r.id);
    for (const eventId of ids) {
      // A custom audience of each session's own sign-ups, so the move email's
      // recipients are exactly the one sign-up below.
      await db.insert(eventAutoReminders).values({
        eventId,
        enabled: 1,
        audienceMode: "custom",
        audienceConfig: { includeEventSignups: true },
        offsetsJson: [10080, 1440, 60, 33],
      });
      await db.insert(eventSignups).values({ eventId, email: SIGNUP, name: "Test", signupType: "reminder" });
    }
  });
  afterAll(cleanup);

  it("keeps the current time on a tie, and holds every session until the vote steers", async () => {
    const db = (await getDb())!;
    await vote("A", "wed", "Rainbow Bridge Hawaii");
    await vote("B", "wed,sat", "Tao Hermitage");
    await vote("C", "sat");
    // Wednesday 2, Saturday 2: a tie that includes the current time keeps it.
    expect((await resolveSeasonState(db, CONFIG, OPEN)).leader).toBe("sat");

    await vote("D", "wed");
    const before = await starts();
    const r = await syncSeason(db, CONFIG, OPEN);
    expect(r.moved).toBe(0);
    expect(r.slot).toEqual({ key: "sat", hourPT: 11 });
    expect(await starts()).toEqual(before);

    const state = await resolveSeasonState(db, CONFIG, OPEN);
    expect(state.following).toBe(false);
    expect(state.leader).toBe("wed");
    expect(state.leaderSince).toBe(OPEN.getTime());
    expect(state.tally.slots.find((s) => s.key === "wed")).toMatchObject({ hands: 3, projects: 2 });
    // The Selection Day video note starts from the Season's default, then follows the admin switch.
    expect(state.selectionVideos).toBe(true);
    await setSiteSetting(seasonSettingKey(SEASON, "selection_videos"), "off");
    expect((await resolveSeasonState(db, CONFIG, OPEN)).selectionVideos).toBe(false);
  });

  it("waits for the leader to hold the lead for a day once the vote steers", async () => {
    const db = (await getDb())!;
    // An hour after the start, Wednesday has only led for two hours.
    const r = await syncSeason(db, CONFIG, new Date(FOLLOWS.getTime() + HOUR));
    expect(r.moved).toBe(0);
    expect(r.slot).toEqual({ key: "sat", hourPT: 11 });
  });

  it("moves every session outside the freeze onto the settled leader, and emails once", async () => {
    const db = (await getDb())!;
    const now = new Date(OPEN.getTime() + 24 * HOUR + 60_000);
    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "wed", hourPT: 10 });
    expect(r.moved).toBe(4);
    // The sessions' own reminder audience: the sign-up, plus whoever the team
    // put on every reminder (ALWAYS_INCLUDE_REMINDER_RECIPIENTS).
    expect(r.notified).toBe(1 + ALWAYS_INCLUDE_REMINDER_RECIPIENTS.length);

    expect(await starts()).toEqual({
      1: "2030-01-05T19:00:00.000Z", // Saturday, inside 72 hours: stays
      2: "2030-01-09T18:00:00.000Z", // Wednesday 10am PST, same Monday-to-Sunday week
      3: "2030-01-16T18:00:00.000Z",
      4: "2030-01-23T18:00:00.000Z",
      5: "2030-01-30T18:00:00.000Z",
    });

    // Week 2's 7-day reminder was already due at its new time, so it is marked
    // handled instead of going out late as "In 7 days". Nothing else is.
    expect(r.claimedReminders).toBe(1);
    const [week2] = await db.select({ id: events.id }).from(events).where(and(eq(events.season, SEASON), eq(events.episodeNumber, 2)));
    const sends = await db.select().from(eventAutoReminderSends).where(eq(eventAutoReminderSends.eventId, week2.id));
    expect(sends.map((s) => [s.offsetMinutes, s.recipientCount])).toEqual([[10080, 0]]);

    // Idempotent: a second run moves nothing and emails nobody.
    const again = await syncSeason(db, CONFIG, now);
    expect(again.moved).toBe(0);
    expect(again.notified).toBe(0);
  });

  it("keeps following the vote: a new leader moves the Season again after its day", async () => {
    const db = (await getDb())!;
    const t = new Date(OPEN.getTime() + 25 * HOUR);
    for (const key of ["G", "H", "I", "J"]) await vote(key, "thu");
    expect((await resolveSeasonState(db, CONFIG, t)).leader).toBe("thu");

    const early = await syncSeason(db, CONFIG, new Date(t.getTime() + HOUR));
    expect(early.moved).toBe(0);
    expect(early.slot).toEqual({ key: "wed", hourPT: 10 });

    const later = await syncSeason(db, CONFIG, new Date(t.getTime() + 24 * HOUR + 60_000));
    expect(later.slot).toEqual({ key: "thu", hourPT: 12 });
    const after = await starts();
    expect(after[2]).toBe("2030-01-10T20:00:00.000Z"); // Thursday 12pm PST
    expect(after[5]).toBe("2030-01-31T20:00:00.000Z");
  });

  it("files notes against the next session, shares only what the writer chose, and lets an admin take one down", async () => {
    const db = (await getDb())!;
    // Wednesday 2030-01-02: Week 1 (Saturday the 5th) is next.
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
    const after = await starts();
    expect(after[2]).toBe("2030-01-08T22:00:00.000Z"); // Tuesday 2pm PST
    expect(after[3]).toBe("2030-01-15T22:00:00.000Z");
    expect(after[4]).toBe("2030-01-24T20:00:00.000Z"); // edited by an admin: stays on Thursday
    expect(after[5]).toBe("2030-01-29T22:00:00.000Z");
  });

  it("puts a drifted session back on the Season's time without emailing anyone", async () => {
    const db = (await getDb())!;
    const now = new Date(OPEN.getTime() + 52 * HOUR);
    await db
      .update(events)
      .set({ startTime: new Date("2030-01-29T15:00:00Z") })
      .where(and(eq(events.season, SEASON), eq(events.episodeNumber, 5)));
    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "tue", hourPT: 14 });
    expect(r.moved).toBe(1);
    expect(r.notified).toBe(0);
    expect((await starts())[5]).toBe("2030-01-29T22:00:00.000Z");
  });
});
