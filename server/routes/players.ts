// server/routes/players.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, count } from "drizzle-orm";
import { playerProfiles, questCompletions, activeQuestSignals, questEndorsements, orgClaims, questSuggestions, forumCategories, bannedEmails } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ─── Player Profiles ──────────────────────────────────────────────────────────
export const playerProfilesRouter = router({
  // Get all active player profiles
  list: publicProcedure.query(async () => {
    return db.getAllPlayerProfiles();
  }),

  // Get verified players (leaderboard)
  leaderboard: publicProcedure.query(async () => {
    return db.getVerifiedPlayerProfiles();
  }),

  // Get current user's profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getPlayerProfileByUserId(ctx.user.id);
    return profile || null;
  }),

  // Get profile by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getPlayerProfileById(input.id);
    }),

  // Create player profile
  create: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(255),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
      baseAccountName: z.string().optional(),
      hyphaProfileUrl: z.string().optional(),
      walletAddress: z.string().optional(),
      dreamingOf: z.string().optional(),
      bioregion: z.string().optional(), // plain text for now (legacy, unused)
      bioregionId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a profile
      const existing = await db.getPlayerProfileByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a player profile" });
      }

      const id = await db.createPlayerProfile({
        userId: ctx.user.id,
        displayName: input.displayName,
        email: ctx.user.email || null,
        bio: input.bio || null,
        avatarUrl: input.avatarUrl || null,
        baseAccountName: input.baseAccountName || null,
        hyphaProfileUrl: input.hyphaProfileUrl || null,
        walletAddress: input.walletAddress || null,
        badges: null,
        questsCompleted: null,
        totalContributionValue: 0,
        rvoiceBalance: 0,
        rgenBalance: 0,
        isVerified: 0,
        isActive: 1,
        ...(input.dreamingOf ? { dreamingOf: input.dreamingOf } : {}),
        ...(input.bioregionId != null ? { bioregionId: input.bioregionId } : {}),
      });
      return { id, success: true };
    }),

  // Update player profile
  update: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(255).optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
      bannerUrl: z.string().nullable().optional(),
      baseAccountName: z.string().optional(),
      hyphaProfileUrl: z.string().optional(),
      walletAddress: z.string().optional(),
      questsCompleted: z.string().optional(), // JSON array of quest IDs
      collaborationStatus: z.string().nullable().optional(),
      dreamingOf: z.string().optional(),
      bioregionId: z.number().nullable().optional(),
      // Location fields
      locationLat: z.number().nullable().optional(),
      locationLng: z.number().nullable().optional(),
      locationPrecision: z.enum(["exact", "city", "region", "hidden"]).optional(),
      locationLabel: z.string().max(255).nullable().optional(),
      locationNomadic: z.number().optional(),
      locationEarth: z.number().optional(),
      currentlyWorkingOn: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      await db.updatePlayerProfile(profile.id, {
        displayName: input.displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        baseAccountName: input.baseAccountName,
        hyphaProfileUrl: input.hyphaProfileUrl,
        walletAddress: input.walletAddress,
        questsCompleted: input.questsCompleted,
        ...(input.collaborationStatus !== undefined && { collaborationStatus: input.collaborationStatus }),
        ...(input.dreamingOf !== undefined && { dreamingOf: input.dreamingOf }),
        ...(input.bioregionId !== undefined && { bioregionId: input.bioregionId }),
        ...(input.locationLat !== undefined && { locationLat: input.locationLat }),
        ...(input.locationLng !== undefined && { locationLng: input.locationLng }),
        ...(input.locationPrecision !== undefined && { locationPrecision: input.locationPrecision }),
        ...(input.locationLabel !== undefined && { locationLabel: input.locationLabel }),
        ...(input.locationNomadic !== undefined && { locationNomadic: input.locationNomadic }),
        ...(input.locationEarth !== undefined && { locationEarth: input.locationEarth }),
        ...(input.currentlyWorkingOn !== undefined && { currentlyWorkingOn: input.currentlyWorkingOn }),
      });

      // Auto-award Welcome Aboard badge when all 10 quests are complete
      if (input.questsCompleted !== undefined) {
        const WELCOME_ABOARD_IDS = Array.from({ length: 10 }, (_, i) => `welcome-aboard-${i + 1}`);
        const completed: string[] = (() => {
          try { return JSON.parse(input.questsCompleted ?? "[]"); } catch { return []; }
        })();
        const allDone = WELCOME_ABOARD_IDS.every((id) => completed.includes(id));
        if (allDone) {
          const fresh = await db.getPlayerProfileByUserId(ctx.user.id);
          const badges: string[] = (() => {
            try { return JSON.parse(fresh?.badges ?? "[]"); } catch { return []; }
          })();
          if (!badges.includes("welcome_aboard")) {
            badges.push("welcome_aboard");
            await db.updatePlayerProfile(profile.id, { badges: JSON.stringify(badges) });
          }
        }
      }

      return { success: true };
    }),

  // Update email digest frequency preference
  updateDigestFrequency: protectedProcedure
    .input(z.object({
      frequency: z.enum(["never", "weekly", "monthly", "seasonal", "newsletter"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
      }
      await db.updatePlayerProfile(profile.id, {
        emailDigestFrequency: input.frequency,
      });
      return { success: true };
    }),

  // Update user notification preferences (community updates, quest announcements)
  updateNotificationPrefs: protectedProcedure
    .input(z.object({
      communityUpdates: z.boolean(),
      questAnnouncements: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
      }
      await db.updatePlayerProfile(profile.id, {
        notificationPrefs: JSON.stringify({
          communityUpdates: input.communityUpdates,
          questAnnouncements: input.questAnnouncements,
        }),
      });
      return { success: true };
    }),

  // Link Base blockchain account
  linkBaseAccount: protectedProcedure
    .input(z.object({
      baseAccountName: z.string().min(1),
      hyphaProfileUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
      }

      // Check if this Base account is already linked to another profile
      const existingProfile = await db.getPlayerProfileByBaseAccount(input.baseAccountName);
      if (existingProfile && existingProfile.id !== profile.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This Base account is already linked to another profile" });
      }

      await db.updatePlayerProfile(profile.id, {
        baseAccountName: input.baseAccountName,
        // walletAddress mirrors baseAccountName so token sync + UI display work correctly
        walletAddress: input.baseAccountName,
        hyphaProfileUrl: input.hyphaProfileUrl || null,
      });
      return { success: true };
    }),

  // Admin: Verify a player profile
  verify: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await db.updatePlayerProfile(input.id, { isVerified: 1 });
      return { success: true };
    }),

  // Self-service: sync own token balances from Base blockchain.
  // Rate-limited to once per 5 minutes by checking lastTokenSync.
  syncTokens: protectedProcedure
    .mutation(async ({ ctx }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found" });
      }
      const wallet = profile.walletAddress || profile.baseAccountName;
      if (!wallet) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet address on profile" });
      }

      // Rate limit: don't sync more than once per 5 minutes
      if (profile.lastTokenSync) {
        const msSince = Date.now() - new Date(profile.lastTokenSync).getTime();
        if (msSince < 5 * 60 * 1000) {
          return {
            rvoice: profile.rvoiceBalance,
            rgen: profile.rgenBalance,
            cached: true,
          };
        }
      }

      const { fetchTokenBalances } = await import("../blockchain");
      const balances = await fetchTokenBalances(wallet);

      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rvoice,
        rgenBalance: balances.rgen,
        lastTokenSync: new Date(),
      });

      return { rvoice: balances.rvoice, rgen: balances.rgen, cached: false };
    }),

  // Admin: force-sync any profile by ID
  adminSyncTokens: adminProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ input }) => {
      const profile = await db.getPlayerProfileById(input.profileId);
      const wallet = profile?.walletAddress || profile?.baseAccountName;
      if (!profile || !wallet) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Profile not found or no wallet address" });
      }
      const { fetchTokenBalances } = await import("../blockchain");
      const balances = await fetchTokenBalances(wallet);
      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rvoice,
        rgenBalance: balances.rgen,
        lastTokenSync: new Date(),
      });
      return { rvoice: balances.rvoice, rgen: balances.rgen };
    }),

  // Self-service: force-sync own token balances (no rate limit)
  forceSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found" });
      }
      const wallet = profile.walletAddress || profile.baseAccountName;
      if (!wallet) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet address on profile" });
      }
      const { fetchTokenBalances } = await import("../blockchain");
      const balances = await fetchTokenBalances(wallet);
      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rvoice,
        rgenBalance: balances.rgen,
        lastTokenSync: new Date(),
      });
      return { rvoice: balances.rvoice, rgen: balances.rgen, cached: false };
    }),

  // Admin: Unverify a player profile
  unverify: adminProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ input }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await drizzleDb.execute(sql`UPDATE player_profiles SET isVerified = 0 WHERE id = ${input.profileId}`);
      return { success: true };
    }),

  // Admin: Ban a player (adds email to bannedEmails table)
  banPlayer: adminProcedure
    .input(z.object({ profileId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const profile = await db.getPlayerProfileById(input.profileId);
      if (profile) {
        const rows = await drizzleDb.execute(sql`SELECT email FROM users WHERE id = ${(profile as any).userId}`);
        const user = (rows as any)?.[0]?.[0] ?? (rows as any)?.[0];
        const email = user?.email;
        if (email) {
          await drizzleDb.insert(bannedEmails).values({
            email,
            reason: input.reason || null,
            bannedBy: ctx.user.id,
          }).onDuplicateKeyUpdate({ set: { reason: input.reason || null } });
        }
      }
      return { success: true };
    }),

  // Admin: Delete a profile and ban the email
  deleteProfile: adminProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const profile = await db.getPlayerProfileById(input.profileId);
      if (profile) {
        const rows = await drizzleDb.execute(sql`SELECT email FROM users WHERE id = ${(profile as any).userId}`);
        const user = (rows as any)?.[0]?.[0] ?? (rows as any)?.[0];
        const email = user?.email;
        if (email) {
          await drizzleDb.insert(bannedEmails).values({
            email,
            reason: 'Account deleted',
            bannedBy: ctx.user.id,
          }).onDuplicateKeyUpdate({ set: { reason: 'Account deleted' } });
        }
      }
      await drizzleDb.execute(sql`DELETE FROM player_profiles WHERE id = ${input.profileId}`);
      return { success: true };
    }),

  // Admin: Award badge
  awardBadge: protectedProcedure
    .input(z.object({
      id: z.number(),
      badgeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const profile = await db.getPlayerProfileById(input.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      const badges: string[] = profile.badges ? JSON.parse(profile.badges) : [];
      if (!badges.includes(input.badgeId)) {
        badges.push(input.badgeId);
        await db.updatePlayerProfile(input.id, { badges: JSON.stringify(badges) });
      }
      return { success: true };
    }),
});

// ─── Player Contributions ─────────────────────────────────────────────────────
export const playerContributionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getPlayerProfileByUserId(ctx.user.id);
    if (!profile) return [];
    return db.getPlayerContributionsByProfileId(profile.id);
  }),

  create: protectedProcedure
    .input(z.object({
      capitalType: z.enum(["financial","social","cultural","living","intellectual","experiential","material","spiritual"]),
      title: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      estimatedValue: z.number().int().min(0).optional(),
      projectName: z.string().max(255).optional(),
      evidenceUrl: z.string().url().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile first" });
      const id = await db.createPlayerContribution({
        profileId: profile.id,
        userId: ctx.user.id,
        capitalType: input.capitalType,
        title: input.title,
        description: input.description,
        estimatedValue: input.estimatedValue,
        projectName: input.projectName,
        evidenceUrl: input.evidenceUrl || undefined,
      });
      // Update cached total on profile
      const all = await db.getPlayerContributionsByProfileId(profile.id);
      const total = all.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
      await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deleting
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      await db.deletePlayerContribution(input.id, ctx.user.id);
      // Recalculate cached total
      const all = await db.getPlayerContributionsByProfileId(profile.id);
      const total = all.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
      await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
      return { ok: true };
    }),

  adminVerify: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["verified", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      await db.updatePlayerContributionStatus(input.id, input.status);
      return { ok: true };
    }),
});

// Quest Suggestions
export const questsRouter = router({
  // List quest suggestions
  suggestions: publicProcedure
    .input(z.object({
      sortBy: z.enum(['votes', 'newest']).default('votes'),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const suggestions = await db.listQuestSuggestions(input.sortBy, input.limit, input.offset);
      const authorsMap = await db.getUsersByIds(suggestions.map(s => s.authorId));
      return suggestions.map((s) => ({ ...s, authorName: authorsMap[s.authorId]?.name || 'Anonymous' }));
    }),

  // Get user's votes
  myVotes: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserQuestVotes(ctx.user.id);
  }),

  // Submit a quest suggestion
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(300),
      description: z.string().min(10).max(5000),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createQuestSuggestion({
        authorId: ctx.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
      });

      // Auto-create forum thread for this quest suggestion
      try {
        const drizzle = await getDb();
        if (drizzle) {
          const [questsGameplayCat] = await drizzle
            .select({ id: forumCategories.id })
            .from(forumCategories)
            .where(eq(forumCategories.slug, 'quests-gameplay'))
            .limit(1);
          if (questsGameplayCat) {
            const forumBody = `This is the discussion thread for the "${input.title}" quest. Complete the quest and share your experience here. Questions, reflections, and completions all welcome.`;
            const forumPostId = await db.createForumPost({
              categoryId: questsGameplayCat.id,
              authorId: ctx.user.id,
              title: input.title,
              content: forumBody,
            });
            await drizzle
              .update(questSuggestions)
              .set({ questForumThreadId: forumPostId })
              .where(eq(questSuggestions.id, id));
          }
        }
      } catch (err) {
        console.error('Failed to auto-create forum thread for quest (non-fatal):', err);
      }

      return { id };
    }),

  // Vote for a quest suggestion
  toggleVote: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const voted = await db.toggleQuestVote(ctx.user.id, input.suggestionId);
      return { voted };
    }),

  // List the authenticated user's quest completions (their journal)
  myCompletions: protectedProcedure.query(async ({ ctx }) => {
    return db.getQuestCompletionsForUser(ctx.user.id);
  }),

  // Log a new quest completion
  logCompletion: protectedProcedure
    .input(z.object({
      questId: z.string().min(1).max(100),
      questTitle: z.string().min(1).max(255),
      isPublic: z.boolean().default(true),
      artifactUrl: z.string().max(1000).optional(),
      artifactText: z.string().max(10000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createQuestCompletion({
        userId: ctx.user.id,
        questId: input.questId,
        questTitle: input.questTitle,
        artifactType: "text",
        artifactUrl: input.artifactUrl ?? null,
        artifactText: input.artifactText ?? null,
        caption: null,
        visibility: input.isPublic ? "public" : "private",
      });
      return { id };
    }),

  // Update the note (artifactText) on a completion
  updateNote: protectedProcedure
    .input(z.object({
      completionId: z.number(),
      note: z.string().max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateQuestCompletionNote(input.completionId, ctx.user.id, input.note);
      return { ok: true };
    }),

  // Mark a quest complete — logs to quest_completions and updates the profile JSON blob
  complete: protectedProcedure
    .input(z.object({
      questId: z.string().min(1).max(100),
      questTitle: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) return { ok: true };

      // Log to quest_completions table
      await db2.insert(questCompletions).values({
        userId: ctx.user.id,
        questId: input.questId,
        questTitle: input.questTitle,
        artifactType: "text",
        artifactUrl: null,
        artifactText: null,
        caption: null,
        visibility: "public",
      });

      // Also update the questsCompleted JSON on playerProfiles
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      if (profile) {
        const existing: string[] = (() => {
          try { return JSON.parse(profile.questsCompleted || "[]"); } catch { return []; }
        })();
        if (!existing.includes(input.questId)) {
          existing.push(input.questId);
          await db2
            .update(playerProfiles)
            .set({ questsCompleted: JSON.stringify(existing) })
            .where(eq(playerProfiles.userId, ctx.user.id));
        }
      }

      return { ok: true };
    }),
});

// Quest router - completions, active signals, and social proof
export const questRouter = router({
  logCompletion: protectedProcedure
    .input(z.object({
      questId: z.string(),
      questTitle: z.string(),
      artifactType: z.enum(["photo", "text", "link", "video"]).default("text"),
      artifactUrl: z.string().optional(),
      artifactText: z.string().optional(),
      caption: z.string().max(500).optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(questCompletions).values({
        userId: ctx.user.id,
        questId: input.questId,
        questTitle: input.questTitle,
        artifactType: input.artifactType,
        artifactUrl: input.artifactUrl,
        artifactText: input.artifactText,
        caption: input.caption,
        visibility: input.isPublic ? "public" : "private",
        completedAt: new Date(),
      });
      // Also clear any active quest signal for this quest
      await db.delete(activeQuestSignals).where(
        sql`userId = ${ctx.user.id} AND questId = ${input.questId}`
      );
      return { success: true };
    }),

  recentCompletions: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const completions = await db
        .select({
          id: questCompletions.id,
          questId: questCompletions.questId,
          questTitle: questCompletions.questTitle,
          artifactUrl: questCompletions.artifactUrl,
          artifactText: questCompletions.artifactText,
          caption: questCompletions.caption,
          completedAt: questCompletions.completedAt,
          userId: questCompletions.userId,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(questCompletions)
        .leftJoin(playerProfiles, eq(questCompletions.userId, playerProfiles.userId))
        .where(eq(questCompletions.visibility, "public"))
        .orderBy(sql`${questCompletions.completedAt} DESC`)
        .limit(input.limit);
      return completions;
    }),

  spotlight: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const results = await db
        .select({
          id: questCompletions.id,
          questId: questCompletions.questId,
          questTitle: questCompletions.questTitle,
          artifactUrl: questCompletions.artifactUrl,
          artifactText: questCompletions.artifactText,
          caption: questCompletions.caption,
          completedAt: questCompletions.completedAt,
          userId: questCompletions.userId,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(questCompletions)
        .leftJoin(playerProfiles, eq(questCompletions.userId, playerProfiles.userId))
        .where(sql`${questCompletions.visibility} = 'public' AND ${questCompletions.artifactUrl} IS NOT NULL`)
        .orderBy(sql`${questCompletions.completedAt} DESC`)
        .limit(1);
      return results[0] ?? null;
    }),

  activeCountPerQuest: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select({
          questId: activeQuestSignals.questId,
          count: count(),
        })
        .from(activeQuestSignals)
        .where(eq(activeQuestSignals.isActive, 1))
        .groupBy(activeQuestSignals.questId);
      const result: Record<string, number> = {};
      for (const row of rows) {
        result[row.questId] = Number(row.count);
      }
      return result;
    }),

  myActiveQuests: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select({ questId: activeQuestSignals.questId })
        .from(activeQuestSignals)
        .where(sql`${activeQuestSignals.userId} = ${ctx.user.id} AND ${activeQuestSignals.isActive} = 1`);
      return rows.map(r => r.questId);
    }),

  signalActive: protectedProcedure
    .input(z.object({ questId: z.string(), questTitle: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      // Check if already exists
      const existing = await db
        .select({ id: activeQuestSignals.id })
        .from(activeQuestSignals)
        .where(sql`${activeQuestSignals.userId} = ${ctx.user.id} AND ${activeQuestSignals.questId} = ${input.questId}`)
        .limit(1);
      if (existing.length > 0) {
        await db.update(activeQuestSignals)
          .set({ isActive: 1, expiresAt })
          .where(sql`${activeQuestSignals.userId} = ${ctx.user.id} AND ${activeQuestSignals.questId} = ${input.questId}`);
      } else {
        await db.insert(activeQuestSignals).values({
          userId: ctx.user.id,
          questId: input.questId,
          questTitle: input.questTitle,
          startedAt: new Date(),
          expiresAt,
          isActive: 1,
        });
      }
      return { success: true };
    }),

  clearActive: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(activeQuestSignals)
        .set({ isActive: 0 })
        .where(sql`${activeQuestSignals.userId} = ${ctx.user.id} AND ${activeQuestSignals.questId} = ${input.questId}`);
      return { success: true };
    }),

  myCompletions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(questCompletions)
        .where(eq(questCompletions.userId, ctx.user.id))
        .orderBy(sql`${questCompletions.completedAt} DESC`);
    }),

  updateNote: protectedProcedure
    .input(z.object({ completionId: z.number(), note: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(questCompletions)
        .set({ artifactText: input.note })
        .where(sql`${questCompletions.id} = ${input.completionId} AND ${questCompletions.userId} = ${ctx.user.id}`);
      return { success: true };
    }),

  // Public: get endorsements for an org by org name (looks up claim to resolve orgId)
  getEndorsementsByOrgName: publicProcedure
    .input(z.object({ orgName: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const claim = await db
        .select({ orgId: orgClaims.orgId })
        .from(orgClaims)
        .where(sql`${orgClaims.orgName} = ${input.orgName} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) return [];
      return db.select().from(questEndorsements).where(eq(questEndorsements.orgId, claim[0].orgId));
    }),

  // Public: get all endorsements (all quests, all orgs)
  allEndorsements: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db.select().from(questEndorsements);
    }),

  // Public: get all endorsements for a specific quest
  getEndorsementsForQuest: publicProcedure
    .input(z.object({ questId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(questEndorsements)
        .where(eq(questEndorsements.questId, input.questId));
    }),

  // Protected: get the calling steward's endorsements (all quests)
  myEndorsements: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const claim = await db
        .select()
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) return { endorsements: [], orgId: null, orgType: null };
      const endorsements = await db
        .select()
        .from(questEndorsements)
        .where(eq(questEndorsements.orgId, claim[0].orgId));
      return { endorsements, orgId: claim[0].orgId, orgType: claim[0].orgType };
    }),

  // Protected: set endorsements for a given type (replaces existing for that type)
  setQuestEndorsements: protectedProcedure
    .input(z.object({
      questIds: z.array(z.string()),
      endorsementType: z.enum(["recommended", "required"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const claim = await db
        .select()
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No approved claim found." });
      const orgId = claim[0].orgId;
      const orgType = claim[0].orgType;
      // Delete all existing endorsements of this type for this org, then re-insert
      await db.delete(questEndorsements).where(
        sql`${questEndorsements.orgId} = ${orgId} AND ${questEndorsements.endorsementType} = ${input.endorsementType}`
      );
      if (input.questIds.length > 0) {
        await db.insert(questEndorsements).values(
          input.questIds.map(questId => ({
            orgId,
            orgType,
            questId,
            endorsementType: input.endorsementType,
          }))
        );
      }
      return { success: true };
    }),
});

// ─── Public Site Tour AI ──────────────────────────────────────────────────────
export const siteTourRouter = router({
  chat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(20),
      currentPage: z.string().optional(),
      userRole: z.enum(["guest", "user", "admin"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const page = input.currentPage ?? "/";
      const role = input.userRole ?? "guest";

      const systemPrompt = `You are the ReGen Civics site guide  -  a warm, knowledgeable companion helping visitors discover and navigate the platform.

Current visitor context:
- Page: ${page}
- Role: ${role}

Your knowledge base:
- ReGen Civics is a regenerative civilization venture fund + infinite collaborative game
- Fund: targets 12-18% net IRR + $RCivics token appreciation. Min investment $250K. Quarterly distributions from Year 3. 8% preferred return, 20% carry, 1.5% management fee.
- Quests: 13 original quests (gold shimmer) + growing quest library (green shimmer). Earn RVoice + ReGen tokens. Start at /quests.
- Land projects: regenerative land-backed investments. Apply at /apply. Browse approved projects at /land.
- Alliance orgs: partner organizations supporting the regenerative ecosystem. Learn at /alliance.
- Investors: submit Letter of Intent at /loi. Read the full opportunity at /opportunity. Allocation explorer at /opportunity#calculator.
- Governance: RCVoice (earned through contributions, governs proposals) vs RGVoice (broader governance). Explained at /governance.
- Tokenomics: $RCivics token on Hypha DAO. Live stats coming soon. Learn at /tokenomics.
- Player profile: create at /player-profile. Complete quests, earn tokens, link your Hypha account.
- Contribution calculator: estimate 8-forms-of-capital contribution value at /calculator.
- Crowd pooling: pool capital for land projects at /crowd-pooling.
- Regen Games: coming soon at /regen-games. Custom land games at /custom-games.
- Map: global network of projects at /map.
- Blog/Learn: insights and updates at /blog.

Page-specific context:
${page === '/' ? '- You are on the home page. Offer to explain the fund, the game, or direct them to key sections.' : ''}
${page.includes('/opportunity') ? '- You are on the investment opportunity page. Visitor may be a potential LP.' : ''}
${page.includes('/quest') ? '- You are on the quests page. Help them understand how to earn tokens.' : ''}
${page.includes('/governance') ? '- You are on the governance page. Explain the two-token model.' : ''}
${page.includes('/player') ? '- You are on the player profile page. Help them get set up.' : ''}
${page.includes('/tokenomics') ? '- You are on the tokenomics page. Token distributions have not begun yet.' : ''}
${page.includes('/land') ? '- You are on the land projects page. Help them understand the land investment thesis.' : ''}
${page.includes('/apply') ? '- You are on the application page. This visitor may be a land project looking to join.' : ''}

Guidelines:
- Keep responses concise: 2-4 sentences max unless they ask for detail