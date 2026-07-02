// server/routes/players.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, count, and, or, like, isNotNull } from "drizzle-orm";
import { playerProfiles, playerContributions, questCompletions, activeQuestSignals, questEndorsements, orgClaims, questSuggestions, forumCategories, bannedEmails, users, playerCapitalScores, vouches, seasonalIntentions } from "../../drizzle/schema";
import { CAPITAL_TYPES, QUEST_CATEGORY_TO_CAPITAL, zeroCapitalScores, type CapitalType } from "@shared/capitals";
import { invokeLLM } from "../_core/llm";
import { sanitizeInput } from "../_core/security";

// Sanitize free-text prose fields while preserving null/undefined (so an
// unset field is not accidentally overwritten with an empty string).
const cleanText = <T extends string | null | undefined>(v: T): T =>
  (typeof v === "string" ? (sanitizeInput(v) as T) : v);

// ─── Player Profiles ──────────────────────────────────────────────────────────
export const playerProfilesRouter = router({
  // Get all active player profiles
  list: publicProcedure.query(async () => {
    return db.getAllPlayerProfiles();
  }),

  // Typeahead for @mentions in the forum composer. Returns handled accounts
  // (community members and the AI elders alike, since elders are user rows)
  // whose handle prefix or name matches the query. protectedProcedure because
  // it is only used while composing, which already requires sign-in.
  searchMentions: protectedProcedure
    .input(z.object({ query: z.string().max(40), limit: z.number().min(1).max(10).default(6) }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [] as Array<{ handle: string; name: string; avatarUrl: string | null }>;
      const q = input.query.trim().toLowerCase();
      const rows = await database
        .select({ handle: users.handle, name: users.name, avatarUrl: playerProfiles.avatarUrl })
        .from(users)
        .leftJoin(playerProfiles, eq(playerProfiles.userId, users.id))
        .where(
          and(
            isNotNull(users.handle),
            q ? or(like(sql`lower(${users.handle})`, `${q}%`), like(sql`lower(${users.name})`, `%${q}%`)) : undefined,
          ),
        )
        // Handle-prefix matches first, then the rest.
        .orderBy(sql`(lower(${users.handle}) like ${q + "%"}) desc`, users.handle)
        .limit(input.limit * 3);
      const seen = new Set<string>();
      const out: Array<{ handle: string; name: string; avatarUrl: string | null }> = [];
      for (const r of rows) {
        if (!r.handle || seen.has(r.handle)) continue;
        seen.add(r.handle);
        out.push({ handle: r.handle, name: r.name ?? r.handle, avatarUrl: r.avatarUrl ?? null });
        if (out.length >= input.limit) break;
      }
      return out;
    }),

  // Get verified players (leaderboard)
  leaderboard: publicProcedure.query(async () => {
    return db.getVerifiedPlayerProfiles();
  }),

  // Get current user's profile
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      return profile || null;
    } catch (err) {
      console.error("[playerProfiles.me] Error fetching profile for user", ctx.user.id, err);
      return null;
    }
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
        displayName: sanitizeInput(input.displayName),
        email: ctx.user.email || null,
        bio: input.bio ? sanitizeInput(input.bio) : null,
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
        ...(input.dreamingOf ? { dreamingOf: sanitizeInput(input.dreamingOf) } : {}),
        ...(input.bioregionId != null ? { bioregionId: input.bioregionId } : {}),
      });
      return { id, success: true };
    }),

  // Look up a profile by handle (public). Resolves the handle -> userId, then returns the profile.
  getByHandle: publicProcedure
    .input(z.object({ handle: z.string().min(3).max(40) }))
    .query(async ({ input }) => {
      const user = await db.getUserByHandle(input.handle);
      if (!user) return null;
      const profile = await db.getPlayerProfileByUserId(user.id);
      return profile ? { ...profile, handle: user.handle, userName: user.name } : null;
    }),

  // Update the current user's handle. Validates regex, uniqueness, and rate limit.
  updateHandle: protectedProcedure
    .input(z.object({ handle: z.string().min(3).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const handle = input.handle.toLowerCase().trim();
      if (!db.isValidHandle(handle)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Handle must be 3-40 characters, lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.",
        });
      }

      // Check rate limit: one change per 30 days
      const me = await db.getUserById(ctx.user.id);
      if (me?.handleLastChangedAt) {
        const daysSince = (Date.now() - new Date(me.handleLastChangedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You can change your handle once every 30 days. Try again in ${Math.ceil(30 - daysSince)} days.`,
          });
        }
      }

      // Check uniqueness
      const existing = await db.getUserByHandle(handle);
      if (existing && existing.id !== ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That handle is taken, try another." });
      }

      await db.updateUserHandle(ctx.user.id, handle);
      return { handle };
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
        displayName: cleanText(input.displayName),
        bio: cleanText(input.bio),
        avatarUrl: input.avatarUrl,
        baseAccountName: input.baseAccountName,
        hyphaProfileUrl: input.hyphaProfileUrl,
        walletAddress: input.walletAddress,
        questsCompleted: input.questsCompleted,
        ...(input.collaborationStatus !== undefined && { collaborationStatus: cleanText(input.collaborationStatus) }),
        ...(input.dreamingOf !== undefined && { dreamingOf: cleanText(input.dreamingOf) }),
        ...(input.bioregionId !== undefined && { bioregionId: input.bioregionId }),
        ...(input.locationLat !== undefined && { locationLat: input.locationLat }),
        ...(input.locationLng !== undefined && { locationLng: input.locationLng }),
        ...(input.locationPrecision !== undefined && { locationPrecision: input.locationPrecision }),
        ...(input.locationLabel !== undefined && { locationLabel: cleanText(input.locationLabel) }),
        ...(input.locationNomadic !== undefined && { locationNomadic: input.locationNomadic }),
        ...(input.locationEarth !== undefined && { locationEarth: input.locationEarth }),
        ...(input.currentlyWorkingOn !== undefined && { currentlyWorkingOn: cleanText(input.currentlyWorkingOn) }),
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

  // Toggle storyteller availability for governance decisions
  setStoryteller: protectedProcedure
    .input(z.object({ available: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await drizzle.update(users).set({ availableAsStoryteller: input.available ? 1 : 0 } as any).where(eq(users.id, ctx.user.id));
      return { ok: true };
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

  // Get my GitHub link status
  getMyGithub: protectedProcedure.query(async ({ ctx }) => {
    const db2 = await getDb();
    if (!db2) return { linked: false };
    const [profile] = await db2
      .select({
        githubHandle: playerProfiles.githubHandle,
        githubId: playerProfiles.githubId,
        githubLinkedAt: playerProfiles.githubLinkedAt,
      })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, ctx.user.id))
      .limit(1);
    if (!profile?.githubId) return { linked: false };
    return {
      linked: true,
      githubHandle: profile.githubHandle,
      githubId: profile.githubId,
      githubLinkedAt: profile.githubLinkedAt,
    };
  }),

  // Unlink GitHub account
  unlinkGithub: protectedProcedure.mutation(async ({ ctx }) => {
    const db2 = await getDb();
    if (!db2) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    await db2.update(playerProfiles).set({
      githubHandle: null,
      githubId: null,
      githubLinkedAt: null,
    }).where(eq(playerProfiles.userId, ctx.user.id));
    return { ok: true };
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

      const { fetchAllTokenBalances } = await import("../blockchain");
      const balances = await fetchAllTokenBalances(wallet);

      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rgvoice,
        rgenBalance: balances.regen,
        rcvoicePublic: balances.rcvoice,
        rcivicsPublic: balances.rcivics,
        lastTokenSync: new Date(),
      });

      return { rvoice: balances.rgvoice, rgen: balances.regen, cached: false };
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
      const { fetchAllTokenBalances } = await import("../blockchain");
      const balances = await fetchAllTokenBalances(wallet);
      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rgvoice,
        rgenBalance: balances.regen,
        rcvoicePublic: balances.rcvoice,
        rcivicsPublic: balances.rcivics,
        lastTokenSync: new Date(),
      });
      return { rvoice: balances.rgvoice, rgen: balances.regen };
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
      const { fetchAllTokenBalances } = await import("../blockchain");
      const balances = await fetchAllTokenBalances(wallet);
      await db.updatePlayerProfile(profile.id, {
        rvoiceBalance: balances.rgvoice,
        rgenBalance: balances.regen,
        rcvoicePublic: balances.rcvoice,
        rcivicsPublic: balances.rcivics,
        lastTokenSync: new Date(),
      });
      return { rvoice: balances.rgvoice, rgen: balances.regen, cached: false };
    }),

  /**
   * Return the logged-in user's four-token picture: for each of RCVoice,
   * RGVoice, $RCivics, $ReGen report public (Base blockchain cache),
   * private (our off-chain ledger), and total. Also returns the wallet
   * address if one is linked and the last sync timestamp. Used by the
   * profile token boxes and their detail dialog.
   *
   * If the user has no player_profile yet, returns all zeros rather
   * than erroring.
   */
  getMyTokens: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getPlayerProfileByUserId(ctx.user.id);
    if (!profile) {
      const zero = { public: 0, private: 0, total: 0 };
      return {
        walletAddress: null,
        lastTokenSync: null,
        rgvoice: zero,
        regen: zero,
        rcvoice: zero,
        rcivics: zero,
      };
    }
    const pair = (publicBal: number, privateBal: number) => ({
      public: publicBal,
      private: privateBal,
      total: publicBal + privateBal,
    });
    return {
      walletAddress: profile.walletAddress ?? profile.baseAccountName ?? null,
      lastTokenSync: profile.lastTokenSync,
      rgvoice: pair(profile.rvoiceBalance ?? 0, (profile as any).rgvoicePrivate ?? 0),
      regen: pair(profile.rgenBalance ?? 0, (profile as any).regenPrivate ?? 0),
      rcvoice: pair((profile as any).rcvoicePublic ?? 0, (profile as any).rcvoicePrivate ?? 0),
      rcivics: pair((profile as any).rcivicsPublic ?? 0, (profile as any).rcivicsPrivate ?? 0),
    };
  }),

  /**
   * Return the ledger history for the logged-in user (newest first). Shown
   * inside the token detail dialog so players can see where their private
   * balance came from.
   */
  myTokenLedger: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserTokenLedger(ctx.user.id, input?.limit ?? 50);
    }),

  /**
   * In-flight claims for the logged-in user. Each row represents one
   * token's portion of an active claim (Hypha claims pairs together,
   * but we track each token's leg independently so the on-chain
   * Transfer event matches one row 1:1). Used by the profile UI to
   * show "N claiming on Hypha…" alongside the private balance.
   */
  myPendingClaims: protectedProcedure.query(async ({ ctx }) => {
    const drizzleDb = await getDb();
    if (!drizzleDb) return [];
    const { hyphaBridges } = await import("../../drizzle/schema");
    const rows = await drizzleDb
      .select()
      .from(hyphaBridges)
      .where(and(
        eq(hyphaBridges.initiatorUserId, ctx.user.id),
        eq(hyphaBridges.source, "redeem_tokens"),
      ));
    // Filter to in-flight statuses on the client-friendly side.
    const IN_FLIGHT = new Set(["created", "handoff_sent", "on_chain_detected"]);
    return rows
      .filter((r: any) => IN_FLIGHT.has(r.status))
      .map((r: any) => {
        let payload: any = null;
        try {
          payload = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload;
        } catch { /* ignore */ }
        return {
          bridgeKey: r.bridgeKey,
          status: r.status,
          tokenType: payload?.metadata?.tokenType ?? null,
          requestedAmount: payload?.metadata?.requestedAmount ?? 0,
          pair: payload?.metadata?.pair ?? null,
          createdAt: r.createdAt,
        };
      });
  }),

  /**
   * Begin a claim for one or more tokens.
   *
   * Hypha can redeem any subset of tokens within the same DHO in one
   * proposal: just $ReGen, just RGVoice, both, etc. (Game DHO holds
   * RGVoice + $ReGen; Fund DHO holds RCVoice + $RCivics. A single
   * proposal cannot mix Game and Fund tokens.)
   *
   * Input shape:
   *   - tokens: list of token types to claim. The user's full private
   *     balance for each listed token is requested. Server validates
   *     all listed tokens belong to the same DHO.
   *   - pair: convenience shorthand. pair='game' expands to
   *     ['rgvoice','regen']; pair='fund' expands to ['rcvoice','rcivics'].
   *     Either pair OR tokens must be present.
   *
   * **Threshold gate (OR within the request)**: at least ONE of the
   * listed tokens must be at or above its own threshold. So a single-
   * token claim of $ReGen needs $ReGen >= 1000; a bundled $ReGen +
   * RGVoice claim is OK as long as $ReGen alone hits 1000 (the
   * RGVoice rides along, even if its balance is 5).
   *
   * **Debit-at-request**: each token's full private balance is
   * debited the moment the bridge is created. Refunded by
   * cancelClaim, the failure cascade, or the nightly stale-cleanup
   * job if the claim is abandoned.
   *
   * Tokens with 0 balance are silently dropped (no Transfer fires for
   * them anyway).
   */
  requestClaim: protectedProcedure
    .input(z.object({
      pair: z.enum(["game", "fund"]).optional(),
      tokens: z.array(z.enum(["rgvoice", "regen", "rcvoice", "rcivics"])).min(1).optional(),
    }).refine(d => d.pair !== undefined || (d.tokens && d.tokens.length > 0), {
      message: "Provide either pair or tokens.",
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      // Wallet check.
      const profile = await db.getPlayerProfileByUserId(ctx.user.id);
      const wallet = (profile?.walletAddress || profile?.baseAccountName || (ctx.user as any).baseWalletAddress) as string | undefined;
      if (!wallet || !wallet.startsWith("0x")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link a Base wallet on your profile before claiming." });
      }

      // Guard against concurrent / duplicate claims. Two requestClaim calls
      // fired in parallel would each read the same private balance, each open
      // a Hypha bridge for the full amount, and each debit it, driving the
      // private ledger negative and creating multiple full-value pending
      // claims. Reject if the user already has an open redeem bridge. States
      // created/handoff_sent/on_chain_detected are "in flight"; passed/failed/
      // cancelled are settled and don't block a new claim.
      {
        const { hyphaBridges } = await import("../../drizzle/schema");
        const { inArray } = await import("drizzle-orm");
        const openBridges = await drizzleDb
          .select({ id: hyphaBridges.id })
          .from(hyphaBridges)
          .where(and(
            eq(hyphaBridges.initiatorUserId, ctx.user.id),
            eq(hyphaBridges.source, "redeem_tokens"),
            inArray(hyphaBridges.status, ["created", "handoff_sent", "on_chain_detected"]),
          ))
          .limit(1);
        if (openBridges.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You already have a claim in progress. Finish or cancel it on Hypha before starting another.",
          });
        }
      }

      // Resolve the requested token list. pair shorthand expands here.
      const requestedTokenTypes: ("rgvoice" | "regen" | "rcvoice" | "rcivics")[] = input.tokens ?? (
        input.pair === "game"
          ? ["rgvoice", "regen"]
          : ["rcvoice", "rcivics"]
      );

      // All requested tokens must belong to the same DHO. Mixing Game
      // and Fund tokens in one Hypha proposal is not supported.
      const { TOKEN_CONTRACTS } = await import("../blockchain");
      const dhoSlugs = new Set(requestedTokenTypes.map(t => TOKEN_CONTRACTS[t]?.dhoSlug).filter(Boolean));
      if (dhoSlugs.size > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot claim Game and Fund tokens in the same proposal. Submit separate claims.",
        });
      }
      const dhoSlug = Array.from(dhoSlugs)[0] ?? "regen-games";

      // Build the per-token balance + threshold view for the requested set.
      const balanceFor = (t: string): number => (profile as any)?.[`${t}Private`] ?? 0;
      const requestedTokens = requestedTokenTypes.map(t => ({
        tokenType: t,
        balance: balanceFor(t),
      }));

      // Threshold check (OR within the requested set).
      const thresholdKey = (t: string) => `governance.claim_threshold_${t}`;
      const thresholds = await Promise.all(
        requestedTokens.map(async (t) => {
          const rows = await drizzleDb.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${thresholdKey(t.tokenType)} LIMIT 1`).then((r: any) => r[0] ?? []);
          return Number(rows[0]?.value ?? (t.tokenType === "regen" || t.tokenType === "rcivics" ? 1000 : 20));
        }),
      );
      const anyAboveThreshold = requestedTokens.some((t, i) => t.balance >= thresholds[i]);
      if (!anyAboveThreshold) {
        const lines = requestedTokens.map((t, i) => `${t.tokenType} ${t.balance}/${thresholds[i]}`).join("; ");
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No requested token meets its threshold (${lines}). Earn more in any of these tokens to unlock the claim.`,
        });
      }

      // Build a bridge per non-zero token. Tokens with 0 balance are
      // dropped here since Hypha would not emit a Transfer for them.
      const { createHyphaBridge, getBridge, buildHyphaTargetUrl } = await import("../lib/hypha-bridge");
      const parentClaimId = `claim:${ctx.user.id}:${requestedTokenTypes.join("+")}:${Date.now()}`;
      const pair: "game" | "fund" = input.pair ?? (dhoSlug === "regen-games" ? "game" : "fund");

      const created: { tokenType: string; bridgeKey: string }[] = [];
      let primaryBridgeKey: string | null = null;

      for (const t of requestedTokens) {
        if (t.balance <= 0) continue;
        const tokenInfo = TOKEN_CONTRACTS[t.tokenType];
        if (!tokenInfo) {
          console.warn(`[requestClaim] no contract for ${t.tokenType}, skipping`);
          continue;
        }
        const bridgeResult = await createHyphaBridge({
          source: "redeem_tokens",
          sourceId: parentClaimId,
          targetDhoSlug: dhoSlug,
          formKind: "redeem_tokens",
          title: `Redeem ${t.balance} ${tokenInfo.symbol}`,
          description: `Redeem accumulated ${tokenInfo.symbol} from the ReGen Civics private ledger to the Base blockchain.`,
          recipient: wallet as `0x${string}`,
          payouts: [{ token: tokenInfo.contract as `0x${string}`, amount: String(t.balance) }],
          initiatorUserId: ctx.user.id,
          metadata: {
            tokenType: t.tokenType,
            requestedAmount: t.balance,
            pair,
            parentClaimId,
          },
        });

        const { hyphaBridges } = await import("../../drizzle/schema");
        await drizzleDb
          .update(hyphaBridges)
          .set({
            hyphaRecipientWallet: wallet,
            hyphaTokenSymbol: tokenInfo.symbol,
            hyphaTokenAmount: t.balance,
          } as any)
          .where(eq(hyphaBridges.bridgeKey, bridgeResult.bridgeKey));

        const fresh = await drizzleDb
          .select()
          .from(hyphaBridges)
          .where(eq(hyphaBridges.bridgeKey, bridgeResult.bridgeKey))
          .limit(1);
        const bridgeId = fresh[0]?.id ?? null;

        await db.creditPrivateTokens({
          userId: ctx.user.id,
          tokenType: t.tokenType,
          amount: -t.balance,
          source: "claim_pending",
          sourceId: bridgeId,
          sourceRef: `bridge:${bridgeResult.bridgeKey}`,
          description: `Claim of ${t.balance} ${tokenInfo.symbol} pending on Hypha`,
        });

        created.push({ tokenType: t.tokenType, bridgeKey: bridgeResult.bridgeKey });
        if (!primaryBridgeKey) primaryBridgeKey = bridgeResult.bridgeKey;
      }

      if (!primaryBridgeKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No tokens with positive balance to claim." });
      }

      const primary = await getBridge(primaryBridgeKey);
      const hyphaUrl = primary ? buildHyphaTargetUrl(primary as any) : null;

      return {
        parentClaimId,
        bridges: created,
        hyphaUrl,
      };
    }),

  /**
   * User-initiated cancel of an in-flight claim. The user closes the
   * Hypha tab without finishing or changes their mind. Marks the
   * bridge cancelled and writes a reversing 'claim_released' ledger
   * row to refund the private balance.
   *
   * Idempotent: a second cancel of the same bridge is a no-op. Only
   * the bridge initiator can cancel their own bridge.
   */
  cancelClaim: protectedProcedure
    .input(z.object({ bridgeKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      const { hyphaBridges, userTokenLedger } = await import("../../drizzle/schema");
      const [bridge] = await drizzleDb
        .select()
        .from(hyphaBridges)
        .where(eq(hyphaBridges.bridgeKey, input.bridgeKey))
        .limit(1);
      if (!bridge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found." });
      }
      if ((bridge as any).initiatorUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your claim to cancel." });
      }
      const status = (bridge as any).status as string;
      if (status === "passed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Already confirmed on chain. Cannot cancel." });
      }
      if (status === "cancelled" || status === "failed") {
        return { ok: true, alreadyCancelled: true };
      }

      // Refund: write a 'claim_released' credit row sized to the
      // original 'claim_pending' debit. Idempotency: if a release row
      // already exists for this bridge, skip the credit.
      const existingRelease = await drizzleDb
        .select({ id: userTokenLedger.id })
        .from(userTokenLedger)
        .where(and(
          eq(userTokenLedger.sourceRef, `bridge:${input.bridgeKey}`),
          eq(userTokenLedger.source, "claim_released"),
        ))
        .limit(1);

      if (existingRelease.length === 0) {
        let payload: any = null;
        try {
          payload = typeof (bridge as any).payload === "string" ? JSON.parse((bridge as any).payload) : (bridge as any).payload;
        } catch { /* ignore */ }
        const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
        const requestedAmount = Number(payload?.metadata?.requestedAmount ?? 0);
        if (tokenType && requestedAmount > 0) {
          try {
            // idempotencyKey makes the refund once-only at the DB layer even
            // if cancelClaim races the nightly stale-cleanup or a failure
            // webhook (all three write claim_released for the same bridge).
            await db.creditPrivateTokens({
              userId: ctx.user.id,
              tokenType,
              amount: requestedAmount,
              source: "claim_released",
              sourceId: (bridge as any).id,
              sourceRef: `bridge:${input.bridgeKey}`,
              idempotencyKey: `claim_released:${input.bridgeKey}`,
              description: `Cancelled claim of ${requestedAmount} ${tokenType}, balance refunded`,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!/duplicate/i.test(msg) && !/unique/i.test(msg)) throw err;
            // Another writer already refunded this bridge; treat as done.
          }
        }
      }

      await drizzleDb
        .update(hyphaBridges)
        .set({ status: "cancelled" } as any)
        .where(eq(hyphaBridges.bridgeKey, input.bridgeKey));

      return { ok: true, alreadyCancelled: false };
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

  /**
   * Capital scores for a player across the 9 forms of capital.
   * Values are 0-100 percentiles ranked across the active player base.
   * Reads from the nightly cache on playerProfiles when fresh (<24h);
   * otherwise calculates live from playerContributions + questCompletions.
   */
  capitalScores: publicProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const targetUserId = input?.userId ?? ctx.user?.id;
      if (!targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "userId required" });
      }

      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Try the cache (skip if columns are missing — graceful pre-migration).
      try {
        const cached = await db2
          .select({
            scores: playerProfiles.capitalScoresJson,
            updatedAt: playerProfiles.capitalScoresUpdatedAt,
          })
          .from(playerProfiles)
          .where(eq(playerProfiles.userId, targetUserId))
          .limit(1);
        const row = cached[0];
        if (row?.scores && row.updatedAt) {
          const ageMs = Date.now() - new Date(row.updatedAt).getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            return row.scores as Record<CapitalType, number>;
          }
        }
      } catch {
        // Cache columns not present yet — fall through to live calc.
      }

      // 2. Live calculation — raw points per capital for this user.
      const raw = zeroCapitalScores();

      // (a) Self-reported contributions grouped by capitalType.
      const contribRows = await db2
        .select({
          capitalType: playerContributions.capitalType,
          total: sql<number>`COALESCE(SUM(${playerContributions.estimatedValue}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(playerContributions)
        .where(eq(playerContributions.userId, targetUserId))
        .groupBy(playerContributions.capitalType);
      for (const row of contribRows) {
        const capital = row.capitalType as CapitalType;
        if (capital in raw) {
          // Weight: each contribution is worth 10 points + value/1000 as a soft bonus.
          raw[capital] += Number(row.count) * 10 + Math.floor(Number(row.total) / 1000);
        }
      }

      // (b) Quest completions — map the quest ID prefix to a category-based capital.
      // quest_completions has a string questId; without a quests table join we apply
      // a light mapping: treat each completion as 5 points in an inferred bucket.
      const questRows = await db2
        .select({ questId: questCompletions.questId, count: sql<number>`COUNT(*)` })
        .from(questCompletions)
        .where(eq(questCompletions.userId, targetUserId))
        .groupBy(questCompletions.questId);
      for (const row of questRows) {
        const category = inferQuestCategory(row.questId);
        const capital = QUEST_CATEGORY_TO_CAPITAL[category];
        if (capital && capital in raw) {
          raw[capital] += Number(row.count) * 5;
        }
      }

      // 3. Normalise to percentile 0-100 across all active players' raw scores.
      // Pull the raw distribution per capital.
      const allPlayers = await db2
        .select({ userId: playerContributions.userId, capitalType: playerContributions.capitalType, count: sql<number>`COUNT(*)` })
        .from(playerContributions)
        .groupBy(playerContributions.userId, playerContributions.capitalType);
      const distribution: Record<CapitalType, number[]> = CAPITAL_TYPES.reduce((acc, c) => {
        acc[c] = [];
        return acc;
      }, {} as Record<CapitalType, number[]>);
      for (const r of allPlayers) {
        const capital = r.capitalType as CapitalType;
        if (capital in distribution) {
          distribution[capital].push(Number(r.count) * 10);
        }
      }

      const normalised: Record<CapitalType, number> = zeroCapitalScores();
      for (const capital of CAPITAL_TYPES) {
        const series = distribution[capital];
        const myScore = raw[capital];
        if (series.length === 0 || myScore === 0) {
          normalised[capital] = 0;
          continue;
        }
        const below = series.filter((s) => s < myScore).length;
        normalised[capital] = Math.min(100, Math.round((below / series.length) * 100));
      }

      // 4. Side-effect cache for the calling user (self only, never poison another's row).
      if (ctx.user?.id === targetUserId) {
        try {
          await db2
            .update(playerProfiles)
            .set({
              capitalScoresJson: normalised,
              capitalScoresUpdatedAt: new Date(),
            })
            .where(eq(playerProfiles.userId, targetUserId));
        } catch {
          // Cache columns not present yet — ignore.
        }
      }

      return normalised;
    }),

  // ─── Vouches ────────────────────────────────────────────────────────────
  /**
   * Record a vouch from the caller for another player. Optional note (<=200
   * chars per the existing column). Upserts so a second call by the same
   * voucher updates the note rather than erroring on the unique index.
   */
  vouchPlayer: protectedProcedure
    .input(z.object({
      playerId: z.number().int().positive(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.playerId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot vouch for yourself." });
      }
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db2
        .select({ id: vouches.id })
        .from(vouches)
        .where(sql`${vouches.voucherId} = ${ctx.user.id} AND ${vouches.vouchedForId} = ${input.playerId}`)
        .limit(1);
      if (existing[0]) {
        await db2.update(vouches)
          .set({ note: input.note ?? null })
          .where(eq(vouches.id, existing[0].id));
        return { success: true, updated: true };
      }
      await db2.insert(vouches).values({
        voucherId: ctx.user.id,
        vouchedForId: input.playerId,
        note: input.note ?? null,
      });
      return { success: true, updated: false };
    }),

  /** Public list of vouches for a player, enriched with voucher display name + avatar. */
  listVouches: publicProcedure
    .input(z.object({ playerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return [];
      const rows = await db2
        .select({
          id: vouches.id,
          voucherId: vouches.voucherId,
          note: vouches.note,
          vouchedAt: vouches.vouchedAt,
          voucherName: playerProfiles.displayName,
          voucherAvatar: playerProfiles.avatarUrl,
        })
        .from(vouches)
        .leftJoin(playerProfiles, eq(vouches.voucherId, playerProfiles.userId))
        .where(eq(vouches.vouchedForId, input.playerId))
        .orderBy(sql`${vouches.vouchedAt} DESC`);
      return rows;
    }),

  /** Has the caller already vouched for this player? Used to hide the button on re-visit. */
  hasVouched: protectedProcedure
    .input(z.object({ playerId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) return false;
      const rows = await db2
        .select({ id: vouches.id })
        .from(vouches)
        .where(sql`${vouches.voucherId} = ${ctx.user.id} AND ${vouches.vouchedForId} = ${input.playerId}`)
        .limit(1);
      return !!rows[0];
    }),

  // ─── Focus Areas ───────────────────────────────────────────────────────
  /** Persist the caller's focus-area picks as a JSON-stringified array on playerProfiles.questInterests. */
  updateFocusAreas: protectedProcedure
    .input(z.object({ focusAreas: z.array(z.string().max(64)).max(24) }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const value = JSON.stringify(input.focusAreas);
      await db2.execute(sql`
        UPDATE player_profiles SET questInterests = ${value}
        WHERE userId = ${ctx.user.id}
      `);
      return { success: true };
    }),

  /** Read the caller's focus areas. Returns an empty array if nothing is saved. */
  getFocusAreas: protectedProcedure.query(async ({ ctx }) => {
    const db2 = await getDb();
    if (!db2) return [];
    const rows = await db2.execute(sql`
      SELECT questInterests FROM player_profiles WHERE userId = ${ctx.user.id} LIMIT 1
    `);
    const raw = ((rows as any[])[0] as any[])?.[0]?.questInterests as string | null | undefined;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }),

  // ─── Seasonal Intentions ────────────────────────────────────────────────
  /** Upsert the caller's intention for a given (season, year). */
  setIntention: protectedProcedure
    .input(z.object({
      season: z.string().min(1).max(20),
      year: z.number().int().min(2020).max(2100),
      intention: z.string().min(1).max(300),
    }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db2
        .select({ id: seasonalIntentions.id })
        .from(seasonalIntentions)
        .where(sql`${seasonalIntentions.playerId} = ${ctx.user.id} AND ${seasonalIntentions.season} = ${input.season} AND ${seasonalIntentions.year} = ${input.year}`)
        .limit(1);
      if (existing[0]) {
        await db2.update(seasonalIntentions)
          .set({ intention: input.intention })
          .where(eq(seasonalIntentions.id, existing[0].id));
        return { success: true, updated: true };
      }
      await db2.insert(seasonalIntentions).values({
        playerId: ctx.user.id,
        season: input.season,
        year: input.year,
        intention: input.intention,
      });
      return { success: true, updated: false };
    }),

  /** List all of the caller's intentions, newest first. */
  getIntentions: protectedProcedure.query(async ({ ctx }) => {
    const db2 = await getDb();
    if (!db2) return [];
    return db2
      .select()
      .from(seasonalIntentions)
      .where(eq(seasonalIntentions.playerId, ctx.user.id))
      .orderBy(sql`${seasonalIntentions.createdAt} DESC`);
  }),
});

/** Lightweight quest -> category mapper used until we have a proper join. */
function inferQuestCategory(questId: string): string {
  const id = questId.toLowerCase();
  if (id.includes("fire") || id.includes("quest-0")) return "ceremony";
  if (id.includes("food") || id.includes("soil") || id.includes("land") || id.includes("seed")) return "land-stewardship";
  if (id.includes("gov") || id.includes("proposal")) return "governance";
  if (id.includes("event") || id.includes("gather")) return "events";
  if (id.includes("heal") || id.includes("body") || id.includes("fast")) return "wellness";
  if (id.includes("story") || id.includes("write") || id.includes("song")) return "storytelling";
  if (id.includes("circle") || id.includes("community")) return "community-building";
  if (id.includes("build") || id.includes("tool") || id.includes("infra")) return "infrastructure";
  if (id.includes("fund") || id.includes("money") || id.includes("crowd")) return "fundraising";
  return "community-building"; // sensible default
}

// ─── Player Contributions ─────────────────────────────────────────────────────
export const playerContributionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getPlayerProfileByUserId(ctx.user.id);
    if (!profile) return [];
    return db.getPlayerContributionsByProfileId(profile.id);
  }),

  create: protectedProcedure
    .input(z.object({
      capitalType: z.enum(["financial","social","cultural","living","intellectual","experiential","material","spiritual","health"]),
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

  // Mark a quest complete, logs to quest_completions and updates the profile JSON blob
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

      // Token credit intentionally removed (D1, 2026-06-24).
      // Tokens are credited only when the player's Hypha proposal is confirmed
      // on-chain, via cascadeQuestPassed in webhook-receiver.ts. The amount
      // credited there is the real per-quest reward from the bridge metadata,
      // not a flat 10. Crediting here diverged from the advertised rewards and
      // counted un-reviewed deliverables.

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

      // Auto-declare ReGen Player path on first quest completion (idempotent)
      // and check tier progression. Both are non-fatal: a quest completion
      // must succeed even if the path-progression layer hiccups.
      try {
        const { declarePath, detectTierProgression } = await import("../lib/tierDetector");
        await declarePath(ctx.user.id, "player");
        await detectTierProgression(ctx.user.id);
      } catch (err) {
        console.warn("[quest.complete] tier detection failed (non-fatal):", err);
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

  // ─── Party Matching ───────────────────────────────────────────────────────
  // Toggle the "looking for party" flag on the caller's active quest signal.
  toggleLookingForParty: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db
        .select({ id: activeQuestSignals.id, lookingForParty: activeQuestSignals.lookingForParty })
        .from(activeQuestSignals)
        .where(sql`${activeQuestSignals.userId} = ${ctx.user.id} AND ${activeQuestSignals.questId} = ${input.questId} AND ${activeQuestSignals.isActive} = 1`)
        .limit(1);
      if (!existing[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start this quest before looking for a party." });
      }
      const next = existing[0].lookingForParty === 1 ? 0 : 1;
      await db.update(activeQuestSignals)
        .set({ lookingForParty: next })
        .where(sql`${activeQuestSignals.id} = ${existing[0].id}`);
      return { lookingForParty: next === 1 };
    }),

  // Who else on this quest is looking for a party?
  getPartyMembers: publicProcedure
    .input(z.object({ questId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select({
          userId: activeQuestSignals.userId,
          startedAt: activeQuestSignals.startedAt,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(activeQuestSignals)
        .leftJoin(playerProfiles, eq(activeQuestSignals.userId, playerProfiles.userId))
        .where(sql`${activeQuestSignals.questId} = ${input.questId} AND ${activeQuestSignals.isActive} = 1 AND ${activeQuestSignals.lookingForParty} = 1`)
        .limit(20);
      return rows;
    }),

  // Count players currently on a single quest (handy for per-card badges).
  getQuestPlayerCount: publicProcedure
    .input(z.object({ questId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select({ c: count() })
        .from(activeQuestSignals)
        .where(sql`${activeQuestSignals.questId} = ${input.questId} AND ${activeQuestSignals.isActive} = 1`);
      return Number(rows[0]?.c ?? 0);
    }),

  // ─── Completion Feed ──────────────────────────────────────────────────────
  // Public feed of public completions. Supports filtering by questId and
  // artifactType so the Quest Stories section can show mixed or video-only.
  getCompletionFeed: publicProcedure
    .input(z.object({
      questId: z.string().optional(),
      artifactType: z.enum(["photo", "text", "link", "video"]).optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const conditions: any[] = [sql`${questCompletions.visibility} = 'public'`];
      if (input.questId) conditions.push(sql`${questCompletions.questId} = ${input.questId}`);
      if (input.artifactType) conditions.push(sql`${questCompletions.artifactType} = ${input.artifactType}`);
      const whereExpr = conditions.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`);
      const rows = await db
        .select({
          id: questCompletions.id,
          questId: questCompletions.questId,
          questTitle: questCompletions.questTitle,
          artifactType: questCompletions.artifactType,
          artifactUrl: questCompletions.artifactUrl,
          artifactText: questCompletions.artifactText,
          caption: questCompletions.caption,
          videoThumbnailUrl: questCompletions.videoThumbnailUrl,
          videoDurationSeconds: questCompletions.videoDurationSeconds,
          completedAt: questCompletions.completedAt,
          userId: questCompletions.userId,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(questCompletions)
        .leftJoin(playerProfiles, eq(questCompletions.userId, playerProfiles.userId))
        .where(whereExpr)
        .orderBy(sql`${questCompletions.completedAt} DESC`)
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  // ─── Living Tree / Capital Scores ─────────────────────────────────────────
  // Caller's capital score row. Returns zeros if none exists yet.
  myCapitalScores: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select()
        .from(playerCapitalScores)
        .where(eq(playerCapitalScores.userId, ctx.user.id))
        .limit(1);
      if (rows[0]) return rows[0];
      return {
        id: 0,
        userId: ctx.user.id,
        intellectual: 0, social: 0, material: 0, financial: 0, living: 0,
        cultural: 0, spiritual: 0, experiential: 0, healthVital: 0,
        totalScore: 0, seasonsCompleted: 0, updatedAt: new Date(),
      };
    }),

  // Apply a capital contribution (used by quest completion hooks).
  addCapitalContribution: protectedProcedure
    .input(z.object({
      intellectual: z.number().int().default(0),
      social: z.number().int().default(0),
      material: z.number().int().default(0),
      financial: z.number().int().default(0),
      living: z.number().int().default(0),
      cultural: z.number().int().default(0),
      spiritual: z.number().int().default(0),
      experiential: z.number().int().default(0),
      healthVital: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const delta = Object.values(input).reduce((a, b) => a + b, 0);
      const existing = await db
        .select({ id: playerCapitalScores.id })
        .from(playerCapitalScores)
        .where(eq(playerCapitalScores.userId, ctx.user.id))
        .limit(1);
      if (existing[0]) {
        await db.update(playerCapitalScores)
          .set({
            intellectual: sql`${playerCapitalScores.intellectual} + ${input.intellectual}`,
            social: sql`${playerCapitalScores.social} + ${input.social}`,
            material: sql`${playerCapitalScores.material} + ${input.material}`,
            financial: sql`${playerCapitalScores.financial} + ${input.financial}`,
            living: sql`${playerCapitalScores.living} + ${input.living}`,
            cultural: sql`${playerCapitalScores.cultural} + ${input.cultural}`,
            spiritual: sql`${playerCapitalScores.spiritual} + ${input.spiritual}`,
            experiential: sql`${playerCapitalScores.experiential} + ${input.experiential}`,
            healthVital: sql`${playerCapitalScores.healthVital} + ${input.healthVital}`,
            totalScore: sql`${playerCapitalScores.totalScore} + ${delta}`,
          })
          .where(eq(playerCapitalScores.userId, ctx.user.id));
      } else {
        await db.insert(playerCapitalScores).values({
          userId: ctx.user.id,
          intellectual: input.intellectual,
          social: input.social,
          material: input.material,
          financial: input.financial,
          living: input.living,
          cultural: input.cultural,
          spiritual: input.spiritual,
          experiential: input.experiential,
          healthVital: input.healthVital,
          totalScore: delta,
          seasonsCompleted: 0,
        });
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
${page.includes('/governance') ? '- You are on the governance page. Explain how proposals work, how voice tokens are earned, and how to participate.' : ''}
${page.includes('/player') ? '- You are on the player profile page. Help them get set up.' : ''}
${page.includes('/tokenomics') ? '- You are on the tokenomics page. Explain the $RCivics token, how it works on Hypha, and where they can learn more.' : ''}
${page.includes('/community') ? '- You are on the community page. Point them to the forum, quests, or the governance pipeline.' : ''}

Keep answers short (2-4 sentences max) and link to relevant pages when possible.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const response = await invokeLLM({ messages, maxTokens: 300 });
      return { reply: response ?? "I'm having trouble responding right now. Try again in a moment." };
    }),
});