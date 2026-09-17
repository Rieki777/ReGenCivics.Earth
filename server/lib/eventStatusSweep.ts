/**
 * Sweeps event statuses so past events auto-transition:
 *   upcoming -> live   (if startTime <= now < endTime)
 *   upcoming|live -> completed  (if now >= endTime, or now >= startTime when endTime is missing)
 *
 * Choice when endTime is missing: treat startTime as the close bound (same as
 * admin eventTemporal and reminder eligibility). Start-only rows never linger
 * as "upcoming" after the session has begun.
 *
 * Called at the top of the public `list` query so the Schedule page
 * always reflects current reality without waiting for the cron job.
 * Also used by /api/cron/event-reminders and the nightly batch.
 */
import { getDb } from "../db";
import { events } from "../../drizzle/schema";
import { and, eq, lte, gt, sql, isNotNull, isNull, lt, or } from "drizzle-orm";


/** Pure predicates mirroring the SQL sweep (for unit tests). */
export function shouldMarkEventLive(opts: {
  status: string;
  startTime: Date;
  endTime?: Date | null;
  now: Date;
}): boolean {
  if (opts.status !== "upcoming") return false;
  const startMs = opts.startTime.getTime();
  const nowMs = opts.now.getTime();
  if (!(startMs <= nowMs)) return false;
  if (opts.endTime == null) return false;
  return opts.endTime.getTime() > nowMs;
}

export function shouldMarkEventCompleted(opts: {
  status: string;
  startTime: Date;
  endTime?: Date | null;
  now: Date;
}): boolean {
  if (opts.status !== "upcoming" && opts.status !== "live") return false;
  const nowMs = opts.now.getTime();
  if (opts.endTime != null) return opts.endTime.getTime() < nowMs;
  return opts.startTime.getTime() < nowMs;
}

export async function sweepEventStatuses(now = new Date()) {
  const database = await getDb();
  if (!database) return;

  // Mark as live: upcoming events whose startTime has passed but endTime hasn't.
  // Requires endTime — without it we complete (below) instead of leaving "live" forever.
  await database
    .update(events)
    .set({ status: "live" })
    .where(
      and(
        eq(events.status, "upcoming"),
        lte(events.startTime, now),
        isNotNull(events.endTime),
        gt(events.endTime as any, now),
      ),
    );

  // Mark as completed:
  // - endTime present and past, OR
  // - endTime missing and startTime past (fallback close bound)
  await database
    .update(events)
    .set({ status: "completed" })
    .where(
      and(
        sql`${events.status} IN ('upcoming','live')`,
        or(
          and(isNotNull(events.endTime), lt(events.endTime as any, now)),
          and(isNull(events.endTime), lt(events.startTime, now)),
        ),
      ),
    );
}
