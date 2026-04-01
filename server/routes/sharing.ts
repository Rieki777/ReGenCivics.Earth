/**
 * Sharing + Referral tRPC routes.
 * Tracks share events and manages referral attribution.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { shareEvents, referrals } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const sharingRouter = router({
  // Track a share event (authenticated)
  trackShare: protectedProcedure
    .input(z.object({
      contentType: z.string().max(50),
      contentId: z.string().max(100).optional(),
      platform: z.string().max(50),
      sharedUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) return { ok: true };
      await database.insert(shareEvents).values({
        userId: ctx.user.id,
        contentType: input.contentType,
        contentId: input.contentId ?? null,
        platform: input.platform,
        sharedUrl: input.sharedUrl ?? null,
      });
      return { ok: true };
    }),

  // Record a referral landing (public, called on page load with ref param)
  recordReferral: publicProcedure
    .input(z.object({
      ref: z.string().max(20),
      source: z.string().max(50).optional(),
      context: z.string().max(100).optional(),
      landingUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: true };
      // Decode the ref hash back to userId (simple base64)
      let referrerUserId: number;
      try {
        referrerUserId = parseInt(atob(input.ref + "=="), 10);
        if (isNaN(referrerUserId)) return { ok: true };
      } catch {
        return { ok: true };
      }
      await database.insert(referrals).values({
        referrerUserId,
        source: input.source ?? null,
        context: input.context ?? null,
        landingUrl: input.landingUrl ?? null,
      });
      return { ok: true };
    }),

  // Get my referral stats (authenticated)
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return { totalShares: 0, totalReferrals: 0, regenEarned: 0 };
    const [shareCount] = await database.select({ count: sql`COUNT(*)` })
      .from(shareEvents)
      .where(eq(shareEvents.userId, ctx.user.id));
    const [refCount] = await database.select({ count: sql`COUNT(*)` })
      .from(referrals)
      .where(eq(referrals.referrerUserId, ctx.user.id));
    const [rewards] = await database.select({ total: sql`COALESCE(SUM(rewardsPaid), 0)` })
      .from(referrals)
      .where(eq(referrals.referrerUserId, ctx.user.id));
    return {
      totalShares: Number((shareCount as any)?.count ?? 0),
      totalReferrals: Number((refCount as any)?.count ?? 0),
      regenEarned: Number((rewards as any)?.total ?? 0),
    };
  }),
});
