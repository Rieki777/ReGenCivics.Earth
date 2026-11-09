/**
 * Pausing Season 2 and the Open Access sessions, against a real database.
 *
 * Rows are dated in 2030 and every call passes its own `now`, so only the
 * rows made here are upcoming. The pause settings are saved first and put
 * back after, so a run never changes the real pause state.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { getDb, getSiteSetting, setSiteSetting } from "./db";
import { eventAutoReminders, events } from "../drizzle/schema";
import { applyLivePause, isSeriesPaused, setSeriesPaused } from "./lib/livePause";
import { LIVE_PAUSE_SETTING, LIVE_SERIES, type LiveSeries } from "@shared/livePause";
import { OPEN_ACCESS_TITLE } from "@shared/sessionClock";
import { loadFeedRows, renderFeed } from "./lib/calendarFeed";

const skipIfNoDb = !process.env.DATABASE_URL;
const MARK = "LIVEPAUSE-TEST";
const NOW = new Date("2030-01-01T12:00:00Z");
const DAY = 86_400_000;

const saved: Partial<Record<LiveSeries, string | null>> = {};
let ids: { s2a: number; s2b: number; s2HandCancelled: number; oa: number } = { s2a: 0, s2b: 0, s2HandCancelled: 0, oa: 0 };

async function insertEvent(values: Partial<typeof events.$inferInsert>): Promise<number> {
  const db = (await getDb())!;
  const res = await db.insert(events).values({
    title: `${MARK} event`,
    type: "episode",
    status: "upcoming",
    startTime: new Date(NOW.getTime() + DAY),
    ...values,
  } as typeof events.$inferInsert);
  return Number((res as unknown as [{ insertId: number }])[0].insertId);
}

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ id: events.id }).from(events).where(like(events.description, `${MARK}%`));
  const rowIds = rows.map((r) => r.id);
  if (rowIds.length) {
    await db.delete(eventAutoReminders).where(inArray(eventAutoReminders.eventId, rowIds));
    await db.delete(events).where(inArray(events.id, rowIds));
  }
}

async function statusOf(id: number) {
  const db = (await getDb())!;
  const [row] = await db.select({ status: events.status }).from(events).where(eq(events.id, id));
  return row?.status;
}

async function reminderOn(id: number) {
  const db = (await getDb())!;
  const [row] = await db.select({ enabled: eventAutoReminders.enabled }).from(eventAutoReminders).where(eq(eventAutoReminders.eventId, id));
  return row?.enabled === 1;
}

describe.skipIf(skipIfNoDb)("live pause", () => {
  beforeAll(async () => {
    for (const s of LIVE_SERIES) {
      saved[s] = await getSiteSetting(LIVE_PAUSE_SETTING[s]);
      await setSiteSetting(LIVE_PAUSE_SETTING[s], "");
    }
    await cleanup();
    const db = (await getDb())!;
    ids = {
      s2a: await insertEvent({ season: "Season 2", episodeNumber: 99, title: "Week 99: Test", description: `${MARK} a` }),
      s2b: await insertEvent({
        season: "Season 2",
        episodeNumber: 98,
        title: "Week 98: Test",
        description: `${MARK} b`,
        startTime: new Date(NOW.getTime() + 8 * DAY),
        manualOverride: 1,
      }),
      s2HandCancelled: await insertEvent({
        season: "Season 2",
        episodeNumber: 97,
        title: "Week 97: Test",
        description: `${MARK} c`,
        status: "cancelled",
      }),
      oa: await insertEvent({ season: "Open", type: "open", title: OPEN_ACCESS_TITLE, description: `${MARK} oa` }),
    };
    for (const id of [ids.s2a, ids.s2b, ids.oa]) {
      await db.insert(eventAutoReminders).values({ eventId: id, enabled: 1, audienceMode: "season2_approved", offsetsJson: [60] });
    }
  });

  afterAll(async () => {
    await cleanup();
    for (const s of LIVE_SERIES) await setSiteSetting(LIVE_PAUSE_SETTING[s], saved[s] ?? "");
  });

  it("pausing Season 2 cancels its upcoming weeks and their reminders, and leaves Open Access running", async () => {
    const result = await setSeriesPaused("season2", true, NOW);
    expect(result.paused).toBe(true);
    expect(await isSeriesPaused("season2")).toBe(true);
    expect(await statusOf(ids.s2a)).toBe("cancelled");
    expect(await statusOf(ids.s2b)).toBe("cancelled");
    expect(await reminderOn(ids.s2a)).toBe(false);
    expect(await reminderOn(ids.s2b)).toBe(false);
    expect(await statusOf(ids.oa)).toBe("upcoming");
    expect(await reminderOn(ids.oa)).toBe(true);
  });

  it("cancels a week added while paused on the next sweep", async () => {
    const late = await insertEvent({ season: "Season 2", episodeNumber: 96, title: "Week 96: Test", description: `${MARK} late` });
    await applyLivePause(NOW);
    expect(await statusOf(late)).toBe("cancelled");
  });

  it("sends the paused weeks to calendars as cancelled", async () => {
    const ics = renderFeed(await loadFeedRows(NOW), "season2");
    const block = ics.split("BEGIN:VEVENT").find((b) => b.includes("Week 99: Test"));
    expect(block).toBeDefined();
    expect(block).toContain("STATUS:CANCELLED");
  });

  it("resuming reopens exactly what the pause cancelled, reminders included", async () => {
    const result = await setSeriesPaused("season2", false, NOW);
    expect(result.reopened).toBeGreaterThanOrEqual(2);
    expect(await isSeriesPaused("season2")).toBe(false);
    expect(await statusOf(ids.s2a)).toBe("upcoming");
    // manualOverride (a schedule move) does not keep a week cancelled.
    expect(await statusOf(ids.s2b)).toBe("upcoming");
    expect(await reminderOn(ids.s2a)).toBe(true);
    // A week an admin cancelled by hand before the pause stays cancelled.
    expect(await statusOf(ids.s2HandCancelled)).toBe("cancelled");
  });

  it("pauses Open Access on its own switch", async () => {
    await setSeriesPaused("open_access", true, NOW);
    expect(await statusOf(ids.oa)).toBe("cancelled");
    expect(await statusOf(ids.s2a)).toBe("upcoming");
    await setSeriesPaused("open_access", false, NOW);
    expect(await statusOf(ids.oa)).toBe("upcoming");
    expect(await reminderOn(ids.oa)).toBe(true);
  });
});
