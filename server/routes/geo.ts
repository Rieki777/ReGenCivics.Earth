// server/routes/geo.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, sql } from "drizzle-orm";
import { bioregions, userBioregions, playerProfiles } from "../../drizzle/schema";

// ─── C1: Bioregions ──────────────────────────────────────────────────────────
export const bioregionsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    // Only return approved bioregions to the public
    return db.select().from(bioregions).where(eq(bioregions.approved, 1)).orderBy(bioregions.name);
  }),

  suggest: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) return { success: false };
      // Check for duplicate (case-insensitive) before inserting
      const existing = await d.select({ id: bioregions.id })
        .from(bioregions)
        .where(eq(bioregions.name, input.name))
        .limit(1);
      if (existing.length > 0) return { success: false, reason: "exists" };
      await d.insert(bioregions).values({
        name: input.name,
        source: "community",
        approved: 0,
        submittedBy: ctx.user.id,
      });
      return { success: true };
    }),
});

// ─── User Bioregions (multi-bioregion selection) ──────────────────────────────
export const userBioregionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const d = await getDb();
    if (!d) return [];
    return d.select({ bioregionId: userBioregions.bioregionId, isPrimary: userBioregions.isPrimary })
            .from(userBioregions)
            .where(eq(userBioregions.userId, ctx.user.id));
  }),

  update: protectedProcedure
    .input(z.object({
      bioregionIds: z.array(z.number()),
      primaryBioregionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) return { success: false };
      // Delete all existing rows for this user
      await d.delete(userBioregions).where(eq(userBioregions.userId, ctx.user.id));
      // Insert new rows
      if (input.bioregionIds.length > 0) {
        await d.insert(userBioregions).values(
          input.bioregionIds.map(bid => ({
            userId: ctx.user.id,
            bioregionId: bid,
            isPrimary: bid === (input.primaryBioregionId ?? input.bioregionIds[0]) ? 1 : 0,
          }))
        );
        // Keep playerProfiles.bioregionId in sync with the primary
        const primaryId = input.primaryBioregionId ?? input.bioregionIds[0];
        await d.update(playerProfiles)
          .set({ bioregionId: primaryId })
          .where(eq(playerProfiles.userId, ctx.user.id));
      } else {
        await d.update(playerProfiles)
          .set({ bioregionId: null as any })
          .where(eq(playerProfiles.userId, ctx.user.id));
      }
      return { success: true };
    }),
});
