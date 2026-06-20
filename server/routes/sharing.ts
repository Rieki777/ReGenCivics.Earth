/**
 * Sharing + Referral tRPC routes.
 * Tracks share events and manages referral attribution.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { shareEvents, referrals } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull, gte } from "drizzle-orm";

/**
 * Decode the client-side hashUserId scheme:
 *   btoa(String(id)).replace(/=/g, "").slice(0, 8)
 * Re-pad and base64-decode. Returns NaN if the input is malformed; the
 * caller treats NaN as "no attribution" and silently no-ops.
 */
function decodeRefHash(ref: string): number {
  try {
    const padded = ref + "==".slice(0, (4 - (ref.length % 4)) % 4);
    return parseInt(atob(padded), 10);
  } catch {
    return NaN;
  }
}

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
      const referrerUserId = decodeRefHash(input.ref);
      if (!Number.isFinite(referrerUserId)) return { ok: true };
      await database.insert(referrals).values({
        referrerUserId,
        source: input.source ?? null,
        context: input.context ?? null,
        landingUrl: input.landingUrl ?? null,
      });
      return { ok: true };
    }),

  /**
   * Tie the stored landing row to the newly-signed-up user. Called once
   * from the client right after auth completes; reads the same ref off
   * sessionStorage and posts it here so the server can stamp
   * referredUserId + signedUpAt on the most recent matching open
   * referral row. Self-referrals are rejected. Idempotent: if the
   * caller already has a referredUserId attribution, this is a no-op.
   */
  attributeSignup: protectedProcedure
    .input(z.object({
      ref: z.string().min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) return { ok: true, attributed: false };

      const referrerUserId = decodeRefHash(input.ref);
      if (!Number.isFinite(referrerUserId)) return { ok: true, attributed: false };
      if (referrerUserId === ctx.user.id) return { ok: true, attributed: false };

      // Bail if the new user is already attributed somewhere; second
      // attempts (e.g. signup re-flow) shouldn't reassign credit.
      const [existing] = await database
        .select({ id: referrals.id })
        .from(referrals)
        .where(eq(referrals.referredUserId, ctx.user.id))
        .limit(1);
      if (existing) return { ok: true, attributed: false };

      // Look for the freshest open landing row from this referrer that
      // hasn't already been claimed by a different user. Window the
      // search to 30 days so a stale landing from months ago doesn't
      // grab credit for an unrelated signup.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const candidates = await database
        .select({ id: referrals.id })
        .from(referrals)
        .where(and(
          eq(referrals.referrerUserId, referrerUserId),
          isNull(referrals.referredUserId),
          gte(referrals.createdAt, since),
        ))
        .orderBy(desc(referrals.createdAt))
        .limit(1);

      if (candidates.length === 0) {
        // No prior landing row (older flow or session lost it). Create
        // one and attribute it in a single insert so the count is right.
        await database.insert(referrals).values({
          referrerUserId,
          referredUserId: ctx.user.id,
          signedUpAt: new Date(),
        });
        return { ok: true, attributed: true };
      }

      await database
        .update(referrals)
        .set({ referredUserId: ctx.user.id, signedUpAt: new Date() })
        .where(eq(referrals.id, candidates[0].id));
      return { ok: true, attributed: true };
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
