/**
 * Sweeps event statuses so past events auto-transition:
 *   upcoming -> live   (if startTime <= now < endTime)
 *   upcoming|live -> completed  (if endTime <= now)
 *
 * Called at the top of the public `list` query so the Schedule page
 * always reflects current reality without waiting for the cron job.
 */
import { getDb } from "../db";
import { events } from "../../drizzle/schema";
import { and, eq, lte, gt, sql, isNotNull, lt } from "drizzle-orm";

export async function sweepEventStatuses() {
  const database = await getDb();
  if (!database) return;

  const now = new Date();

  // Mark as live: upcoming events whose startTime has passed but endTime hasn't
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

  // Mark as completed: upcoming or live events whose endTime has passed
  await database
    .update(events)
    .set({ status: "completed" })
    .where(
      and(
        sql`${events.status} IN ('upcoming','live')`,
        isNotNull(events.endTime),
        lt(events.endTime as any, now),
      ),
    );
}
