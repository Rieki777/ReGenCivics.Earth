/**
 * Pause and resume for the Season 2 and Open Access series. See
 * shared/livePause.ts for what a pause does and why; this is the database side.
 *
 * Modelled on the Interoperability Circle's pause (server/lib/interopCircle.ts,
 * cancelUpcoming / reopenCancelledWeeks), with one difference: the pause keeps
 * the ids it cancelled, so resume reopens exactly those. Season 2 rows carry
 * manualOverride from schedule moves, so the Circle's "reopen what an admin did
 * not edit" rule would leave most of Season 2 cancelled on resume.
 */
import { and, eq, gt, inArray } from "drizzle-orm";
import { eventAutoReminders, events } from "../../drizzle/schema";
import { getDb, getSiteSetting, setSiteSetting } from "../db";
import {
  LIVE_PAUSE_SETTING,
  LIVE_SERIES,
  liveSeriesOf,
  parseLivePause,
  type LivePauseState,
  type LivePauseStatus,
  type LiveSeries,
} from "@shared/livePause";
import { removeSeriesFromGoogleCalendar } from "../_core/googlecal";
import { logger } from "../_core/logger";

const log = logger("live-pause");

type StoredState = LivePauseState & { remindersOn?: number[] };

async function readState(series: LiveSeries): Promise<StoredState | null> {
  const raw = await getSiteSetting(LIVE_PAUSE_SETTING[series]);
  const parsed = parseLivePause(raw);
  if (!parsed) return null;
  let remindersOn: number[] = [];
  try {
    const r = (JSON.parse(raw as string) as { remindersOn?: unknown }).remindersOn;
    if (Array.isArray(r)) remindersOn = r.filter((n): n is number => Number.isInteger(n) && n > 0);
  } catch {
    // parseLivePause already accepted it; a missing list just means none.
  }
  return { ...parsed, remindersOn };
}

async function writeState(series: LiveSeries, state: StoredState | null): Promise<void> {
  await setSiteSetting(LIVE_PAUSE_SETTING[series], state ? JSON.stringify(state) : "");
}

export async function isSeriesPaused(series: LiveSeries): Promise<boolean> {
  return (await readState(series)) !== null;
}

export async function livePauseStatus(): Promise<LivePauseStatus> {
  const [season2, openAccess] = await Promise.all([isSeriesPaused("season2"), isSeriesPaused("open_access")]);
  return { season2, open_access: openAccess };
}

/** Upcoming (not yet started) rows of one series. */
async function upcomingSeriesRows(series: LiveSeries, now: Date) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database
    .select({
      id: events.id,
      title: events.title,
      type: events.type,
      season: events.season,
      status: events.status,
      startTime: events.startTime,
    })
    .from(events)
    .where(gt(events.startTime, now));
  return rows.filter((r) => liveSeriesOf(r) === series);
}

/**
 * Cancel every upcoming session of each paused series and switch its
 * reminders off. Idempotent; runs from the catalog sync and the reminder
 * sweep, so a session the catalog adds later is cancelled too.
 */
export async function applyLivePause(now: Date = new Date()): Promise<number> {
  const database = await getDb();
  if (!database) return 0;
  let cancelled = 0;
  for (const series of LIVE_SERIES) {
    const state = await readState(series);
    if (!state) continue;
    const live = (await upcomingSeriesRows(series, now)).filter((r) => r.status !== "cancelled");
    if (!live.length) continue;
    const ids = live.map((r) => r.id);

    const reminders = await database
      .select({ eventId: eventAutoReminders.eventId })
      .from(eventAutoReminders)
      .where(and(inArray(eventAutoReminders.eventId, ids), eq(eventAutoReminders.enabled, 1)));
    const remindersOn = reminders.map((r) => r.eventId);

    await database.update(events).set({ status: "cancelled" }).where(inArray(events.id, ids));
    if (remindersOn.length) {
      await database.update(eventAutoReminders).set({ enabled: 0 }).where(inArray(eventAutoReminders.eventId, remindersOn));
    }
    await writeState(series, {
      pausedAt: state.pausedAt,
      cancelledIds: Array.from(new Set([...state.cancelledIds, ...ids])),
      remindersOn: Array.from(new Set([...(state.remindersOn ?? []), ...remindersOn])),
    });
    cancelled += ids.length;
    log.info("cancelled paused sessions", { series, count: ids.length });
  }
  return cancelled;
}

export type SetPausedResult = { paused: boolean; cancelled: number; reopened: number };

export async function setSeriesPaused(series: LiveSeries, paused: boolean, now: Date = new Date()): Promise<SetPausedResult> {
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const current = await readState(series);

  if (paused) {
    if (!current) await writeState(series, { pausedAt: now.toISOString(), cancelledIds: [], remindersOn: [] });
    const cancelled = await applyLivePause(now);
    // Fire and forget: Google is slow and optional (skips without its env vars).
    void removeSeriesFromGoogleCalendar(series, now).catch((err) =>
      log.warn("google calendar cleanup failed", { series, err: String(err) }),
    );
    return { paused: true, cancelled, reopened: 0 };
  }

  if (!current) return { paused: false, cancelled: 0, reopened: 0 };
  let reopened = 0;
  if (current.cancelledIds.length) {
    const rows = await database
      .select({ id: events.id, status: events.status })
      .from(events)
      .where(and(inArray(events.id, current.cancelledIds), gt(events.startTime, now)));
    const ids = rows.filter((r) => r.status === "cancelled").map((r) => r.id);
    if (ids.length) {
      await database.update(events).set({ status: "upcoming" }).where(inArray(events.id, ids));
      const remindersOn = (current.remindersOn ?? []).filter((id) => ids.includes(id));
      if (remindersOn.length) {
        await database.update(eventAutoReminders).set({ enabled: 1 }).where(inArray(eventAutoReminders.eventId, remindersOn));
      }
      reopened = ids.length;
    }
  }
  await writeState(series, null);
  log.info("resumed series", { series, reopened });
  return { paused: false, cancelled: 0, reopened };
}

/** Upcoming sessions of one series, for the admin card. */
export async function upcomingSeriesSessions(series: LiveSeries, now: Date = new Date()) {
  const rows = await upcomingSeriesRows(series, now);
  return rows
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((r) => ({ id: r.id, title: r.title, startTime: r.startTime, status: r.status }));
}
