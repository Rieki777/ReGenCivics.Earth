// server/routes/auth.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { newsletterSubscribers } from "../../drizzle/schema";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
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
      investmentRange: z.string().max(255).optional(),
      projectName: z.string().max(255).optional(),
      projectUrl: z.string().max(500).optional(),
      organizationName: z.string().max(255).optional(),
      questInterests: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});
