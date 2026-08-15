/**
 * Activity Feed tRPC router.
 * Lists activity events for admin view (initially) and community feed.
 */
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Public columns of an `activity_feed_events` row.
 *
 * Withheld: `metadata` and `actorId`.
 *
 * `metadata` is an open JSON blob. Four different call sites write it and
 * nothing constrains what goes in, so publishing it wholesale publishes
 * whatever the newest caller happened to attach. It already carried a
 * `bridgeKey` (webhook-receiver.ts, crowdpool_confirmed) and, until the
 * enum fix in the previous PR, abuse-flag reasons. A blob nobody owns is
 * not something to hand to anonymous callers.
 *
 * `actorId` names the member behind each event.
 *
 * Nothing in the client reads this procedure today. When a public feed is
 * built, give it a per-event-type metadata allowlist rather than widening
 * this one: the shape differs per event, so only the event's own writer
 * knows which keys are safe.
 *
 * sql.raw is safe here: a compile-time constant of column identifiers.
 */
export const PUBLIC_ACTIVITY_EVENT_FIELDS = [
  "id",
  "eventType",
  "actorType",
  "targetType",
  "targetId",
  "visibility",
  "createdAt",
] as const;

const PUBLIC_ACTIVITY_COLUMNS = sql.raw(PUBLIC_ACTIVITY_EVENT_FIELDS.join(", "));

export const activityFeedRouter = router({
  // List recent activity events (admin sees whole rows, everyone else a
  // public projection: no actorId, no metadata blob)
  list: publicProcedure
    .input(z.object({
      limit: z.number().max(100).default(50),
      eventType: z.string().optional(),
      visibility: z.enum(["public", "community", "admin"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 50;
      const isAdmin = ctx.user?.role === "admin" || ctx.user?.role === "superadmin";
      const columns = isAdmin ? sql.raw("*") : PUBLIC_ACTIVITY_COLUMNS;

      if (input?.eventType) {
        return db.execute(sql`
          SELECT ${columns} FROM activity_feed_events
          WHERE eventType = ${input.eventType}
          ${isAdmin ? sql`` : sql`AND visibility != 'admin'`}
          ORDER BY createdAt DESC LIMIT ${limit}
        `).then((r: any) => r[0] ?? []);
      }

      return db.execute(sql`
        SELECT ${columns} FROM activity_feed_events
        ${isAdmin ? sql`` : sql`WHERE visibility != 'admin'`}
        ORDER BY createdAt DESC LIMIT ${limit}
      `).then((r: any) => r[0] ?? []);
    }),

  // Admin: get event counts by type
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`
      SELECT eventType, COUNT(*) as count
      FROM activity_feed_events
      GROUP BY eventType
      ORDER BY count DESC
    `).then((r: any) => r[0] ?? []);
  }),
});
