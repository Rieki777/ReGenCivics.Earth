/**
 * Activity Feed tRPC router.
 * Lists activity events for admin view (initially) and community feed.
 */
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const activityFeedRouter = router({
  // List recent activity events (admin sees all, public sees public+community)
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

      if (input?.eventType) {
        return db.execute(sql`
          SELECT * FROM activity_feed_events
          WHERE eventType = ${input.eventType}
          ${isAdmin ? sql`` : sql`AND visibility != 'admin'`}
          ORDER BY createdAt DESC LIMIT ${limit}
        `).then((r: any) => r[0] ?? []);
      }

      return db.execute(sql`
        SELECT * FROM activity_feed_events
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
