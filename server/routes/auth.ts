// server/routes/auth.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, desc } from "drizzle-orm";
import { clearAllSessionCookies } from "../_core/cookies";
import { newsletterSubscribers, userProfiles } from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";

const cleanText = <T extends string | null | undefined>(v: T): T =>
  (typeof v === "string" ? (sanitizeInput(v) as T) : v);

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
    // Mirror to the unified forum profile (0169, Phase 2B): the forum reads
    // activity from playerProfiles.forumLastActiveAt, which was back-filled
    // once by the migration and drifts unless every ping lands on both tables.
    db2.execute(sql`UPDATE player_profiles SET forumLastActiveAt = NOW() WHERE userId = ${userId}`)
      .catch(() => {});
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
  // `me` is intentionally publicProcedure: every page (signed-out or
  // otherwise) calls this on mount to determine auth state. Flipping it
  // to protectedProcedure would throw UNAUTHORIZED for unauthed visitors,
  // which the global queryClient onError handler in client/src/main.tsx
  // converts into a hard redirect to OAuth. That would auto-bounce every
  // signed-out home-page visit — breaking the entire public site.
  // Returning ctx.user (which is null when unauthed) is the correct shape.
  me: publicProcedure.query(opts => {
    if (opts.ctx.user) pingLastActive(opts.ctx.user.id);
    return opts.ctx.user;
  }),
  // `logout` is publicProcedure intentionally: it must succeed even if the
  // session cookie is stale, malformed, or duplicated (multi-cookie scenario
  // where Safari sent two `app_session_id` values from different deploy
  // eras). Otherwise a user stuck with a corrupt cookie can't sign out to
  // recover. The handler clears ALL session-cookie variants regardless of
  // whether ctx.user resolved.
  logout: publicProcedure.mutation(({ ctx }) => {
    clearAllSessionCookies(ctx.req, ctx.res);
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
      // Plain-text fields go through sanitizeInput (strips tags, discards
      // script/style content) before they ever reach the DB. URL fields
      // (avatarUrl, bannerUrl, projectUrl, website) are left as-is, matching
      // the existing players.ts:update pattern. They're rendered as href
      // attributes, not innerHTML, and go through isValidUrl elsewhere.
      await db.upsertUserProfile(ctx.user.id, {
        ...input,
        displayName: cleanText(input.displayName),
        bio: cleanText(input.bio),
        location: cleanText(input.location),
        investmentRange: cleanText(input.investmentRange),
        projectName: cleanText(input.projectName),
        organizationName: cleanText(input.organizationName),
        questInterests: cleanText(input.questInterests),
      });
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
