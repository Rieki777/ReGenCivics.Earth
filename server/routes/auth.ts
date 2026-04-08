// server/routes/auth.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, desc } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { newsletterSubscribers, userProfiles } from "../../drizzle/schema";

// Debounce lastActiveAt writes, only update once per 5 minutes per user
const lastActivePings = new Map<number, number>();
function pingLastActive(userId: number) {
  const now = Date.now();
  const last = lastActivePings.get(userId) ?? 0;
  if (now - last < 5 * 60 * 1000) return;
  lastActivePings.set(userId, now);
  getDb().then(db2 => {
    if (!db2) return;
    db2.execute(sql`UPDATE userProfiles SET lastActiveAt = NOW() WHERE userId = ${userId}`)
      .catch(() => {}); // graceful, column may not exist until migration runs
  }).catch(() => {});
}

// Clean up the ping map every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [uid, ts] of Array.from(lastActivePings.entries())) {
    if (ts < cutoff) lastActivePings.delete(uid);
  }
}, 30 * 60 * 1000);

export const authRouter = router({
  me: publicProcedure.query(opts => {
    if (opts.ctx.user) pingLastActive(opts.ctx.user.id);
    return opts.ctx.user;
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});

export const statsRouter = router({
  getPublicStats: publicProcedure.query(async () => {
    return db.getPublicStats();
  }),
});

export const userProfilesRouter = router({
  // Get current user's extended profile (path, onboarding fields, etc.)
  getMe: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserProfile(ctx.user.id);
  }),

  // Set the user's path (called once from PathSelectionScreen)
  setPath: protectedProcedure
    .input(z.object({
      path: z.enum(["investor", "land_project", "ally", "player"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertUserProfile(ctx.user.id, {
        path: input.path,
        onboardingComplete: 1,
      });
      return { success: true };
    }),

  // Update extended profile fields (called from ProfileEditForm)
  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().max(255).optional(),
      bio: z.string().optional(),
      location: z.string().max(255).optional(),
      avatarUrl: z.string().max(500).optional(),
      bannerUrl: z.string().max(500).optional(),
      investmentRange: z.string().max(255).optional(),
      projectName: z.string().max(255).optional(),
      projectUrl: z.string().max(500).optional(),
      organizationName: z.string().max(255).optional(),
      questInterests: z.string().optional(),
      website: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  // Public member list, searchable, paginated
  list: publicProcedure
    .input(z.object({
      search: z.string().max(100).optional(),
      interests: z.string().max(500).optional(), // comma-separated focus areas
      limit: z.number().max(100).default(24),
      cursor: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return { members: [], nextCursor: null };

      let rows = await db2
        .select()
        .from(userProfiles)
        .where(
          input.search
            ? sql`${userProfiles.displayName} LIKE ${`%${input.search}%`}`
            : undefined
        )
        .orderBy(desc(userProfiles.updatedAt))
        .limit(input.limit + 1)
        .offset(input.cursor ?? 0);

      // Client-side interest filter (questInterests is a comma-separated string)
      if (input.interests) {
        const wanted = input.interests.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        rows = rows.filter((r) => {
          if (!r.questInterests) return false;
          const member = r.questInterests.toLowerCase();
          return wanted.some((w) => member.includes(w));
        });
      }

      const hasMore = rows.length > input.limit;
      if (hasMore) rows = rows.slice(0, input.limit);
      return { members: rows, nextCursor: hasMore ? (input.cursor ?? 0) + input.limit : null };
    }),
});
