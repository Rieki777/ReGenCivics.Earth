/**
 * Season Schedule sync, against a real database.
 *
 * Runs on a made-up Season with its own name and 2030 dates, passed to
 * syncSeason directly, so it only ever touches the rows it creates: never the
 * real Season 2 episodes, settings or votes. Every call passes its own `now`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like } from "drizzle-orm";
import { getDb, setSiteSetting } from "./db";
import {
  eventAutoReminderSends,
  eventAutoReminders,
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
  syncSeason,
} from "./lib/seasonSchedule";
import { seasonSettingKey, type SeasonScheduleConfig } from "@shared/seasonSchedule";

const skipIfNoDb = !process.env.DATABASE_URL;
const SEASON = "Season Schedule Test";
const SLUG = "season_schedule:season-schedule-test:%";

const HOUR = 3_600_000;
// The vote closes Thursday 2030-01-03 00:00 UTC (Wednesday 4pm Pacific).
const CLOSE = new Date("2030-01-03T00:00:00Z");

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
  closesAt: CLOSE,
  minutes: 120,
};

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ id: events.id }).from(events).where(eq(events.season, SEASON));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db.delete(eventAutoReminderSends).where(inArray(eventAutoReminderSends.eventId, ids));
    await db.delete(eventAutoReminders).where(inArray(eventAutoReminders.eventId, ids));
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
      await db.insert(eventAutoReminders).values({
        eventId,
        enabled: 1,
        audienceMode: "season2_approved",
        offsetsJson: [10080, 1440, 60, 33],
      });
    }
  });
  afterAll(cleanup);

  it("keeps the current time on a tie, and holds every session while the vote is open", async () => {
    const db = (await getDb())!;
    const open = new Date(CLOSE.getTime() - HOUR);
    await vote("A", "wed", "Rainbow Bridge Hawaii");
    await vote("B", "wed,sat", "Tao Hermitage");
    await vote("C", "sat");
    // Wednesday 2, Saturday 2: a tie that includes the current time keeps it.
    expect((await resolveSeasonState(db, CONFIG, open)).leader).toBe("sat");

    await vote("D", "wed");
    const before = await starts();
    const r = await syncSeason(db, CONFIG, open);
    expect(r.moved).toBe(0);
    expect(r.slot).toEqual({ key: "sat", hourPT: 11 });
    expect(await starts()).toEqual(before);

    const state = await resolveSeasonState(db, CONFIG, open);
    expect(state.closed).toBe(false);
    expect(state.leader).toBe("wed");
    expect(state.tally.slots.find((s) => s.key === "wed")).toMatchObject({ hands: 3, projects: 2 });
  });

  it("moves every session outside the freeze onto the winner when the vote closes", async () => {
    const db = (await getDb())!;
    const now = new Date(CLOSE.getTime() + 60_000);
    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "wed", hourPT: 10 });
    expect(r.moved).toBe(4);

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

    // Idempotent: a second run moves nothing.
    expect((await syncSeason(db, CONFIG, now)).moved).toBe(0);
  });

  it("stays put when the vote reopens, even if the lead changes", async () => {
    const db = (await getDb())!;
    const now = new Date(CLOSE.getTime() + 2 * HOUR);
    await setSiteSetting(seasonSettingKey(SEASON, "closes_at"), new Date(now.getTime() + 48 * HOUR).toISOString());
    for (const key of ["G", "H", "I", "J"]) await vote(key, "thu");
    expect((await resolveSeasonState(db, CONFIG, now)).leader).toBe("thu");
    const before = await starts();
    const r = await syncSeason(db, CONFIG, now);
    expect(r.moved).toBe(0);
    expect(r.slot).toEqual({ key: "wed", hourPT: 10 });
    expect(await starts()).toEqual(before);
  });

  it("files notes against the next session, and keeps an unsigned one anonymous", async () => {
    const db = (await getDb())!;
    // Wednesday 2030-01-02: Week 1 (Saturday the 5th) is next.
    const now = new Date("2030-01-02T20:00:00Z");
    const signed = await recordSeasonFeedback(
      db,
      CONFIG,
      { topic: "How other projects hold land together", facilitation: null, displayName: "Maya", projectName: "Rainbow Bridge Hawaii" },
      now,
    );
    expect(signed.week).toBe(1);
    await recordSeasonFeedback(db, CONFIG, { topic: null, facilitation: "More time for questions", displayName: null, projectName: null }, now);
    // An empty note is not stored.
    await recordSeasonFeedback(db, CONFIG, { topic: "   ", facilitation: "", displayName: "Nobody", projectName: null }, now);

    expect(await seasonFeedbackCount(db, SEASON, 1)).toBe(2);
    const rows = await seasonFeedbackRows(db, SEASON);
    const anon = rows.find((r) => r.facilitation === "More time for questions")!;
    expect(anon).toMatchObject({ week: 1, displayName: null, projectName: null, topic: null });
    expect(rows.find((r) => r.topic)?.projectName).toBe("Rainbow Bridge Hawaii");
  });

  it("follows a pin, and leaves an admin-edited session where it is", async () => {
    const db = (await getDb())!;
    const now = new Date(CLOSE.getTime() + 3 * HOUR);
    await db.update(events).set({ manualOverride: 1 }).where(and(eq(events.season, SEASON), eq(events.episodeNumber, 4)));
    await setSiteSetting(seasonSettingKey(SEASON, "pinned"), "tue");

    const r = await syncSeason(db, CONFIG, now);
    expect(r.slot).toEqual({ key: "tue", hourPT: 14 });
    const after = await starts();
    expect(after[2]).toBe("2030-01-08T22:00:00.000Z"); // Tuesday 2pm PST
    expect(after[3]).toBe("2030-01-15T22:00:00.000Z");
    expect(after[4]).toBe("2030-01-23T18:00:00.000Z"); // edited by an admin: untouched
    expect(after[5]).toBe("2030-01-29T22:00:00.000Z");
  });
});
