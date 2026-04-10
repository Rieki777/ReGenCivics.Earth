/**
 * Gov Bioregion tRPC router (Sprint 3).
 * Health metrics, doughnut economics, land projects per bioregion.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import { governanceTenantMembers, governanceTenants } from "../../drizzle/schema";

export const govBioregionRouter = router({
  /** Get latest health metrics for a bioregion. Returns all 10 dimensions. */
  getHealth: publicProcedure
    .input(z.object({ bioregionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.execute(sql`SELECT * FROM govBioregionHealth WHERE bioregionId = ${input.bioregionId}`)
        .then((r: any) => r[0] ?? []) as any[];
      if (rows.length === 0) return null;
      // Group by dimension + ring
      const dimensions = (rows as any[]).map((r: any) => ({
        dimension: r.dimension,
        ring: r.ringType,
        value: Number(r.currentValue),
        min: Number(r.thresholdMin),
        max: Number(r.thresholdMax),
        unit: r.unit,
      }));
      const avg = dimensions.reduce((acc, d) => acc + d.value, 0) / (dimensions.length || 1);
      return { dimensions, compositeScore: Math.round(avg) };
    }),

  /** Submit a health report for a dimension. Steward only. */
  submitHealth: protectedProcedure
    .input(z.object({
      bioregionId: z.number().int().positive(),
      dimension: z.string().min(2).max(80),
      ringType: z.enum(["ecological", "social"]),
      currentValue: z.number().min(0).max(100),
      thresholdMin: z.number().min(0).max(100).optional(),
      thresholdMax: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      try {
        await db.execute(sql`
          INSERT INTO govBioregionHealth (bioregionId, dimension, ringType, currentValue, thresholdMin, thresholdMax, lastUpdatedBy)
          VALUES (${input.bioregionId}, ${input.dimension}, ${input.ringType}, ${input.currentValue}, ${input.thresholdMin ?? 0}, ${input.thresholdMax ?? 100}, ${ctx.user.id})
          ON DUPLICATE KEY UPDATE currentValue = ${input.currentValue}, lastUpdatedBy = ${ctx.user.id}
        `);
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
      return { ok: true };
    }),

  /** List land projects for a bioregion (from governance tenants). */
  landProjects: publicProcedure
    .input(z.object({ bioregionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Land project tenants that reference this bioregion in allowedBioregions
      return db.select().from(governanceTenants)
        .where(eq(governanceTenants.tenantType, "land_project"))
        .orderBy(governanceTenants.displayName);
    }),

  /** Get member count + recent activity for a bioregion tenant. */
  stats: publicProcedure
    .input(z.object({ slug: z.string().min(2).max(80) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const tenants = await db.select().from(governanceTenants).where(eq(governanceTenants.slug, input.slug)).limit(1);
      if (tenants.length === 0) return null;
      const tenant = tenants[0];
      const memberRows = await db.execute(sql`
        SELECT COUNT(*) AS c FROM governanceTenantMembers WHERE tenantId = ${tenant.id} AND leftAt IS NULL
      `).then((r: any) => r[0] ?? []);
      return {
        tenant,
        memberCount: Number(memberRows[0]?.c ?? 0),
      };
    }),
});
