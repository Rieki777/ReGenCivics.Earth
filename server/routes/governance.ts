/**
 * Governance pipeline tRPC router.
 *
 * Stage 1 (forum) patterns: readiness checks, dual-key promotion, decision status.
 * Stage 2 hand-off: webhook side ships in server/webhooks/loomio.ts
 * Stage 3 hand-off: see server/lib/hypha-bridge/
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import {
  forumPosts,
  forumReplies,
  forumPromotionRequests,
  forumPostDecisions,
  forumThreadReadiness,
  forumThreadWatchers,
  governanceTenants,
  governanceTokenLedger,
  governanceAgreements,
  users,
  decisionLineage,
  governanceBackField,
  decisionStorytellerNarratives,
  forumStrawPolls,
  forumStrawPollVotes,
  governanceDelegations,
  governancePreMortemConcerns,
  playerProfiles,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ─── Constants ─────────────────────────────────────────────────────────────
// These mirror the game variables seeded in 0108. Hardcoded here as the
// fallback when game_variables is unreachable. The webhook receiver and the
// scheduled jobs will read from game_variables for live tunability.
const DEFAULT_MIN_THREAD_AGE_HOURS = 48;
const DEFAULT_MIN_UNIQUE_VOICES = 3;
const DEFAULT_COSIGNER_WINDOW_HOURS = 24;

async function readGovernanceVariable(key: string, fallback: number): Promise<number> {
  const db = await getDb();
  if (!db) return fallback;
  try {
    const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${key} LIMIT 1`).then((r: any) => r[0] ?? []);
    if (rows && rows.length > 0) {
      const v = Number(rows[0].value);
      return Number.isFinite(v) ? v : fallback;
    }
  } catch { /* table missing or DB error */ }
  return fallback;
}

interface ReadinessReport {
  ready: boolean;
  ageHours: number;
  ageOk: boolean;
  uniqueVoiceCount: number;
  voicesOk: boolean;
  hasDecisionQuestion: boolean;
  trackTagged: "fund" | "game" | "both" | null;
  missing: string[];
  thresholds: {
    minThreadAgeHours: number;
    minUniqueVoices: number;
  };
}

export const governanceRouter = router({
  /** Stage 1, Improvement #1: check the four readiness gates for promoting
   * a forum thread to a Loomio decision. Returns a structured report so the
   * UI can show exactly which gates are missing. */
  checkPromotionReadiness: publicProcedure
    .input(z.object({ threadId: z.number().int().positive() }))
    .query(async ({ input }): Promise<ReadinessReport> => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const minThreadAgeHours = await readGovernanceVariable("governance.promotion.min_thread_age_hours", DEFAULT_MIN_THREAD_AGE_HOURS);
      const minUniqueVoices = await readGovernanceVariable("governance.promotion.min_unique_voices", DEFAULT_MIN_UNIQUE_VOICES);

      // Load the thread
      const postRows = await db.select().from(forumPosts).where(eq(forumPosts.id, input.threadId)).limit(1);
      if (postRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
      const post = postRows[0];

      // Age in hours
      const createdAt = new Date(post.createdAt as any).getTime();
      const ageHours = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60));

      // Unique voices = distinct authors across the OP + replies
      const replies = await db
        .select({ authorId: forumReplies.authorId })
        .from(forumReplies)
        .where(eq(forumReplies.postId, input.threadId));
      const voices = new Set<number>();
      voices.add(post.authorId);
      for (const r of replies) voices.add(r.authorId);
      const uniqueVoiceCount = voices.size;

      // Check if there's an existing pending or signed promotion request that
      // already supplies the question + track. The UI uses these to skip the form.
      const existingRequest = await db
        .select()
        .from(forumPromotionRequests)
        .where(and(
          eq(forumPromotionRequests.forumPostId, input.threadId),
          eq(forumPromotionRequests.status, "pending"),
        ))
        .limit(1);
      const hasDecisionQuestion = existingRequest.length > 0 && (existingRequest[0].decisionQuestion?.length ?? 0) >= 10;
      const trackTagged: "fund" | "game" | "both" | null = existingRequest.length > 0 ? (existingRequest[0].decisionTrack as any) : null;

      const ageOk = ageHours >= minThreadAgeHours;
      const voicesOk = uniqueVoiceCount >= minUniqueVoices;
      const missing: string[] = [];
      if (!ageOk) missing.push(`Thread is ${ageHours}h old, needs at least ${minThreadAgeHours}h`);
      if (!voicesOk) missing.push(`${uniqueVoiceCount} of ${minUniqueVoices} citizens have replied`);
      if (!hasDecisionQuestion) missing.push("Decision question is missing");
      if (!trackTagged) missing.push("Track (Fund / Game / Both) is missing");

      // Persist the latest snapshot for cheap reads from the forum thread page
      try {
        await db.execute(sql`
          INSERT INTO forumThreadReadiness (forumPostId, ageHours, uniqueVoiceCount, hasDecisionQuestion, trackTagged, isReadyToPromote)
          VALUES (${input.threadId}, ${ageHours}, ${uniqueVoiceCount}, ${hasDecisionQuestion ? 1 : 0}, ${trackTagged}, ${ageOk && voicesOk && hasDecisionQuestion && trackTagged ? 1 : 0})
          ON DUPLICATE KEY UPDATE
            ageHours = VALUES(ageHours),
            uniqueVoiceCount = VALUES(uniqueVoiceCount),
            hasDecisionQuestion = VALUES(hasDecisionQuestion),
            trackTagged = VALUES(trackTagged),
            isReadyToPromote = VALUES(isReadyToPromote)
        `);
      } catch (err) {
        console.warn("[governance] failed to persist readiness snapshot:", err);
      }

      return {
        ready: ageOk && voicesOk && hasDecisionQuestion && !!trackTagged,
        ageHours,
        ageOk,
        uniqueVoiceCount,
        voicesOk,
        hasDecisionQuestion,
        trackTagged,
        missing,
        thresholds: { minThreadAgeHours, minUniqueVoices },
      };
    }),

  /** Stage 1, Improvement #2: file a dual-key promotion request. The proposer
   * is the authenticated user. A second citizen must co-sign within the
   * cosigner_window_hours window or the request expires. */
  requestPromotion: protectedProcedure
    .input(z.object({
      threadId: z.number().int().positive(),
      decisionQuestion: z.string().min(10).max(500),
      track: z.enum(["fund", "game", "both"]),
      suggestedTemplate: z.string().min(2).max(40).default("consent"),
      reversibility: z.enum(["reversible", "semi_reversible", "one_way_door"]).default("reversible"),
      bioregionScope: z.array(z.string()).optional(),
      sunsetAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Reject if there's already a pending request for this thread
      const existing = await db
        .select()
        .from(forumPromotionRequests)
        .where(and(
          eq(forumPromotionRequests.forumPostId, input.threadId),
          eq(forumPromotionRequests.status, "pending"),
        ))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A promotion request is already pending for this thread" });
      }

      const cosignerWindowHours = await readGovernanceVariable("governance.promotion.cosigner_window_hours", DEFAULT_COSIGNER_WINDOW_HOURS);
      const expiresAt = new Date(Date.now() + cosignerWindowHours * 60 * 60 * 1000);

      const result = await db.insert(forumPromotionRequests).values({
        forumPostId: input.threadId,
        proposerId: ctx.user.id,
        decisionTrack: input.track,
        decisionQuestion: input.decisionQuestion,
        suggestedTemplate: input.suggestedTemplate,
        reversibility: input.reversibility,
        bioregionScope: input.bioregionScope ? JSON.stringify(input.bioregionScope) : null,
        sunsetAt: input.sunsetAt ? new Date(input.sunsetAt) : null,
        status: "pending",
        expiresAt,
      } as any);
      const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
      return { id: insertId, expiresAt };
    }),

  /** Stage 1, Improvement #2: a second citizen co-signs an open promotion
   * request. Cannot be the original proposer. */
  coSignPromotion: protectedProcedure
    .input(z.object({ promotionRequestId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db.select().from(forumPromotionRequests).where(eq(forumPromotionRequests.id, input.promotionRequestId)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Promotion request not found" });
      const req = rows[0];
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: `Promotion is ${req.status}, cannot co-sign` });
      if (req.proposerId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot co-sign your own promotion" });
      if (new Date(req.expiresAt as any).getTime() < Date.now()) {
        await db.update(forumPromotionRequests).set({ status: "expired" } as any).where(eq(forumPromotionRequests.id, input.promotionRequestId));
        throw new TRPCError({ code: "BAD_REQUEST", message: "Promotion request has expired" });
      }

      await db
        .update(forumPromotionRequests)
        .set({ status: "signed", coSignerId: ctx.user.id, coSignedAt: new Date() } as any)
        .where(eq(forumPromotionRequests.id, input.promotionRequestId));

      // The Loomio webhook sender lives in server/webhooks/loomio.ts via
      // sendPromotionToLoomio. The cron-style worker that calls it will pick
      // this up on its next pass. We do not call it inline to avoid blocking
      // the co-sign action on a third-party API.
      return { ok: true };
    }),

  /** Stage 1, Improvement #4: read the current decision status for the
   * living backlink banner shown at the top of a forum thread. Returns null
   * if the thread has no associated decision yet. */
  getDecisionStatus: publicProcedure
    .input(z.object({ threadId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.forumPostId, input.threadId))
        .orderBy(desc(forumPostDecisions.createdAt))
        .limit(1);
      if (rows.length === 0) return null;
      const d = rows[0];
      return {
        id: d.id,
        status: d.status,
        track: d.track,
        loomioDecisionUrl: d.loomioDecisionUrl,
        closesAt: d.closesAt,
        closedAt: d.closedAt,
        outcomeSummary: d.outcomeSummary,
        stanceCount: d.stanceCount,
        sunsetAt: d.sunsetAt,
        hyphaBridgeId: d.hyphaBridgeId,
      };
    }),

  /** Add a watcher who should be notified when a thread's promotion gates pass. */
  watchForReady: protectedProcedure
    .input(z.object({ threadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      try {
        await db.insert(forumThreadWatchers).values({
          forumPostId: input.threadId,
          userId: ctx.user.id,
          watchType: "promotion_ready",
        } as any);
      } catch (err: any) {
        // Ignore unique-key collisions: idempotent watcher add
        if (err?.code !== "ER_DUP_ENTRY") throw err;
      }
      return { ok: true };
    }),

  /** List all governance tenants the current user is a member of. Powers the
   * cross-tenant load dashboard. */
  myTenants: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT t.id, t.slug, t.tenantType, t.displayName, t.hyphaDhoSlug, m.role
      FROM governanceTenants t
      JOIN governanceTenantMembers m ON m.tenantId = t.id
      WHERE m.userId = ${ctx.user.id} AND m.leftAt IS NULL
      ORDER BY t.displayName
    `).then((r: any) => r[0] ?? []);
    return rows as any[];
  }),

  /** Sum of unclaimed internal token balance for the current user, across all
   * tenants. Used by the bridge button on the profile page to show "X tokens
   * ready to claim". */
  myUnclaimedBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, byTenant: [] };
    const rows = await db.execute(sql`
      SELECT tenantId, SUM(amount) AS total
      FROM governanceTokenLedger
      WHERE userId = ${ctx.user.id} AND claimedAt IS NULL
      GROUP BY tenantId
    `).then((r: any) => r[0] ?? []);
    const byTenant = (rows as any[]).map((r) => ({ tenantId: r.tenantId, total: Number(r.total) }));
    const total = byTenant.reduce((acc, b) => acc + b.total, 0);
    return { total, byTenant };
  }),

  /** Claim eligibility: has the player crossed the internal token threshold? */
  getClaimEligibility: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { balance: 0, threshold: 1000, eligible: false };
    const threshold = await readGovernanceVariable("governance.claim_threshold_tokens", 1000);
    const rows = await db
      .select({ total: sql`SUM(amount)` })
      .from(governanceTokenLedger)
      .where(and(eq(governanceTokenLedger.userId, ctx.user.id), sql`${governanceTokenLedger.claimedAt} IS NULL`));
    const balance = Number((rows as any)[0]?.total ?? 0);
    return { balance, threshold, eligible: balance >= threshold };
  }),

  // ─── Phase 3: Tenant management (multi-tenant governance) ────────────────

  /** Create a new governance tenant. Bioregions, land projects, organizations,
   * or sub-orgs of the platform. The creator becomes the first admin. */
  createTenant: protectedProcedure
    .input(z.object({
      slug: z.string().min(2).max(80).regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/),
      tenantType: z.enum(["bioregion", "land_project", "organization"]),
      displayName: z.string().min(2).max(200),
      description: z.string().max(2000).optional(),
      hyphaDhoSlug: z.string().max(80).optional(),
      bannerUrl: z.string().url().optional(),
      logoUrl: z.string().url().optional(),
      accentColor: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Reject if slug already taken
      const existing = await db.select().from(governanceTenants).where(eq(governanceTenants.slug, input.slug)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "That slug is already taken" });

      const result = await db.insert(governanceTenants).values({
        slug: input.slug,
        tenantType: input.tenantType,
        displayName: input.displayName,
        description: input.description ?? null,
        bannerUrl: input.bannerUrl ?? null,
        logoUrl: input.logoUrl ?? null,
        accentColor: input.accentColor ?? null,
        hyphaDhoSlug: input.hyphaDhoSlug ?? null,
        ownerUserId: ctx.user.id,
      } as any);
      const tenantId = (result as any)[0]?.insertId ?? (result as any).insertId;

      // Auto-add the creator as admin
      await db.insert((await import("../../drizzle/schema")).governanceTenantMembers).values({
        tenantId,
        userId: ctx.user.id,
        role: "admin",
      } as any);

      return { id: tenantId, slug: input.slug };
    }),

  /** List all tenants visible to the current user. Used by /gov directory. */
  listAllTenants: publicProcedure
    .input(z.object({ tenantType: z.enum(["bioregion", "land_project", "organization", "platform"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const where = input?.tenantType ? eq(governanceTenants.tenantType, input.tenantType) : undefined;
      return where
        ? db.select().from(governanceTenants).where(where).orderBy(governanceTenants.displayName)
        : db.select().from(governanceTenants).orderBy(governanceTenants.displayName);
    }),

  /** Get a single tenant by slug. */
  getTenantBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(2).max(80) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(governanceTenants).where(eq(governanceTenants.slug, input.slug)).limit(1);
      if (rows.length === 0) return null;
      const tenant = rows[0];
      // Pull member count
      const memberRows = await db.execute(sql`SELECT COUNT(*) AS c FROM governanceTenantMembers WHERE tenantId = ${tenant.id} AND leftAt IS NULL`).then((r: any) => r[0] ?? []);
      const memberCount = Number(memberRows[0]?.c ?? 0);
      return { ...tenant, memberCount };
    }),

  /** Join a tenant. Self-service membership for tenants that allow it. */
  joinTenant: protectedProcedure
    .input(z.object({ slug: z.string().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenants = await db.select().from(governanceTenants).where(eq(governanceTenants.slug, input.slug)).limit(1);
      if (tenants.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      const tenant = tenants[0];
      try {
        await db.insert((await import("../../drizzle/schema")).governanceTenantMembers).values({
          tenantId: tenant.id,
          userId: ctx.user.id,
          role: "member",
        } as any);
      } catch (err: any) {
        if (err?.code !== "ER_DUP_ENTRY") throw err;
      }
      return { ok: true };
    }),

  // ─── Phase 2: Lineage ────────────────────────────────────────────────────

  /** Decision lineage: cite a parent decision when promoting a new one. */
  addLineage: protectedProcedure
    .input(z.object({
      childDecisionId: z.number().int().positive(),
      parentDecisionId: z.number().int().positive(),
      relationship: z.enum(["builds_on", "supersedes", "references"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      try {
        await db.insert(decisionLineage).values(input as any);
      } catch (err: any) {
        if (err?.code !== "ER_DUP_ENTRY") throw err;
      }
      return { ok: true };
    }),

  /** Read all parents and children for a decision. Returns up to `depth` levels. */
  getLineage: publicProcedure
    .input(z.object({ decisionId: z.number().int().positive(), depth: z.number().int().min(1).max(3).default(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { parents: [], children: [] };
      const parents = await db.select().from(decisionLineage).where(eq(decisionLineage.childDecisionId, input.decisionId));
      const children = await db.select().from(decisionLineage).where(eq(decisionLineage.parentDecisionId, input.decisionId));
      return { parents, children };
    }),

  // ─── Phase 2: Back Field (renamed parking lot) ───────────────────────────

  parkInBackField: protectedProcedure
    .input(z.object({
      tenantId: z.number().int().positive(),
      forumPostId: z.number().int().positive().optional(),
      title: z.string().min(3).max(300),
      summary: z.string().min(10).max(5000),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(governanceBackField).values({
        ...input,
        proposerId: ctx.user.id,
        status: "parked",
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),

  listBackField: publicProcedure
    .input(z.object({ tenantId: z.number().int().positive(), status: z.enum(["parked", "reviewing", "promoted", "retired"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const where = input.status
        ? and(eq(governanceBackField.tenantId, input.tenantId), eq(governanceBackField.status, input.status))
        : eq(governanceBackField.tenantId, input.tenantId);
      return db.select().from(governanceBackField).where(where).orderBy(desc(governanceBackField.createdAt));
    }),

  promoteFromBackField: protectedProcedure
    .input(z.object({ backFieldId: z.number().int().positive(), forumPostId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(governanceBackField).set({
        status: "promoted",
        forumPostId: input.forumPostId,
        reviewedAt: new Date(),
        reviewedBy: ctx.user.id,
      } as any).where(eq(governanceBackField.id, input.backFieldId));
      return { ok: true };
    }),

  // ─── Phase 2: Storytellers ───────────────────────────────────────────────

  /** Toggle storyteller availability for the current user. */
  toggleStorytellerOptIn: protectedProcedure
    .input(z.object({ available: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(users).set({ availableAsStoryteller: input.available ? 1 : 0 } as any).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  /** Submit or update a storyteller narrative. Word count enforced from
   * game variables (governance.storyteller_narrative_min_words / max_words). */
  publishStorytellerNarrative: protectedProcedure
    .input(z.object({
      forumPostDecisionId: z.number().int().positive(),
      title: z.string().min(3).max(300),
      narrativeBody: z.string().min(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const minWords = await readGovernanceVariable("governance.storyteller_narrative_min_words", 300);
      const maxWords = await readGovernanceVariable("governance.storyteller_narrative_max_words", 600);
      const wordCount = input.narrativeBody.trim().split(/\s+/).length;
      if (wordCount < minWords) throw new TRPCError({ code: "BAD_REQUEST", message: `Narrative is ${wordCount} words, needs at least ${minWords}` });
      if (wordCount > maxWords) throw new TRPCError({ code: "BAD_REQUEST", message: `Narrative is ${wordCount} words, max ${maxWords}` });

      // Verify the user is the assigned storyteller for this decision
      const dec = await db.select().from(forumPostDecisions).where(eq(forumPostDecisions.id, input.forumPostDecisionId)).limit(1);
      if (dec.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found" });
      if (dec[0].storytellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You are not the assigned storyteller for this decision" });

      const result = await db.insert(decisionStorytellerNarratives).values({
        forumPostDecisionId: input.forumPostDecisionId,
        storytellerId: ctx.user.id,
        title: input.title,
        narrativeBody: input.narrativeBody,
        wordCount,
        publishedAt: new Date(),
        status: "published",
      } as any);
      const narrativeId = (result as any)[0]?.insertId ?? (result as any).insertId;
      await db.update(forumPostDecisions).set({ storytellerNarrativeId: narrativeId } as any).where(eq(forumPostDecisions.id, input.forumPostDecisionId));
      return { id: narrativeId };
    }),

  listPublishedNarratives: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(decisionStorytellerNarratives)
        .where(eq(decisionStorytellerNarratives.status, "published"))
        .orderBy(desc(decisionStorytellerNarratives.publishedAt))
        .limit(input.limit);
    }),

  // ─── Phase 2: Forum straw polls ──────────────────────────────────────────

  createStrawPoll: protectedProcedure
    .input(z.object({
      forumPostId: z.number().int().positive(),
      forumReplyId: z.number().int().positive().optional(),
      question: z.string().min(3).max(300),
      options: z.array(z.string().min(1).max(80)).min(2).max(6),
      closesInDays: z.number().int().min(1).max(30).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Cap at 5 straw polls per thread
      const existing = await db.select({ id: forumStrawPolls.id }).from(forumStrawPolls).where(eq(forumStrawPolls.forumPostId, input.forumPostId));
      if (existing.length >= 5) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 5 straw polls per thread" });
      const closesAt = new Date(Date.now() + input.closesInDays * 24 * 60 * 60 * 1000);
      const result = await db.insert(forumStrawPolls).values({
        forumPostId: input.forumPostId,
        forumReplyId: input.forumReplyId ?? null,
        creatorId: ctx.user.id,
        question: input.question,
        options: JSON.stringify(input.options),
        closesAt,
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId, closesAt };
    }),

  voteStrawPoll: protectedProcedure
    .input(z.object({ strawPollId: z.number().int().positive(), choice: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const polls = await db.select().from(forumStrawPolls).where(eq(forumStrawPolls.id, input.strawPollId)).limit(1);
      if (polls.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Straw poll not found" });
      const poll = polls[0];
      if (poll.closedAt || new Date(poll.closesAt as any).getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Straw poll is closed" });
      }
      // Upsert vote
      try {
        await db.insert(forumStrawPollVotes).values({
          strawPollId: input.strawPollId,
          userId: ctx.user.id,
          choice: input.choice,
        } as any);
      } catch (err: any) {
        if (err?.code === "ER_DUP_ENTRY") {
          await db
            .update(forumStrawPollVotes)
            .set({ choice: input.choice } as any)
            .where(and(eq(forumStrawPollVotes.strawPollId, input.strawPollId), eq(forumStrawPollVotes.userId, ctx.user.id)));
        } else {
          throw err;
        }
      }
      return { ok: true };
    }),

  getStrawPollResults: publicProcedure
    .input(z.object({ strawPollId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const polls = await db.select().from(forumStrawPolls).where(eq(forumStrawPolls.id, input.strawPollId)).limit(1);
      if (polls.length === 0) return null;
      const votes = await db.select().from(forumStrawPollVotes).where(eq(forumStrawPollVotes.strawPollId, input.strawPollId));
      const tally: Record<string, number> = {};
      for (const v of votes) tally[v.choice] = (tally[v.choice] ?? 0) + 1;
      const total = votes.length;
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      const consensusPct = top && total > 0 ? top[1] / total : 0;
      return {
        poll: polls[0],
        tally,
        total,
        consensusPct,
        readyToPromote: consensusPct >= 0.66 && total >= 5,
      };
    }),

  listStrawPollsForThread: publicProcedure
    .input(z.object({ forumPostId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(forumStrawPolls).where(eq(forumStrawPolls.forumPostId, input.forumPostId)).orderBy(desc(forumStrawPolls.createdAt));
    }),

  // ─── Phase 2: Pre-mortem concerns ────────────────────────────────────────

  postPreMortemConcern: protectedProcedure
    .input(z.object({ forumPostDecisionId: z.number().int().positive(), concernText: z.string().min(10).max(800) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(governancePreMortemConcerns).values({
        forumPostDecisionId: input.forumPostDecisionId,
        authorId: ctx.user.id,
        concernText: input.concernText,
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),

  topPreMortemConcerns: publicProcedure
    .input(z.object({ forumPostDecisionId: z.number().int().positive(), limit: z.number().int().min(1).max(10).default(3) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(governancePreMortemConcerns)
        .where(eq(governancePreMortemConcerns.forumPostDecisionId, input.forumPostDecisionId))
        .orderBy(desc(governancePreMortemConcerns.agreeCount))
        .limit(input.limit);
    }),

  // ─── Phase 2: Delegation ─────────────────────────────────────────────────

  setDelegation: protectedProcedure
    .input(z.object({
      delegateHandle: z.string().min(3).max(40),
      topicTags: z.array(z.string().min(1).max(40)).min(1).max(10),
      tenantId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const enabled = await readGovernanceVariable("governance.delegation_is_active", 0);
      if (enabled !== 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Delegation is not currently enabled" });
      const target = await db.select().from(users).where(eq(users.handle, input.delegateHandle)).limit(1);
      if (target.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Delegate not found" });
      if (target[0].id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delegate to yourself" });
      await db.insert(governanceDelegations).values({
        delegatorId: ctx.user.id,
        delegateId: target[0].id,
        topicTags: JSON.stringify(input.topicTags),
        tenantId: input.tenantId ?? null,
      } as any);
      return { ok: true };
    }),

  revokeDelegation: protectedProcedure
    .input(z.object({ delegationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(governanceDelegations)
        .set({ revokedAt: new Date() } as any)
        .where(and(eq(governanceDelegations.id, input.delegationId), eq(governanceDelegations.delegatorId, ctx.user.id)));
      return { ok: true };
    }),

  myDelegations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(governanceDelegations)
      .where(and(eq(governanceDelegations.delegatorId, ctx.user.id), sql`${governanceDelegations.revokedAt} IS NULL`));
  }),

  // ─── Phase 2: ReGen Guide drafting ───────────────────────────────────────

  /** Suggest a Loomio poll template based on the forum thread content. */
  suggestTemplate: protectedProcedure
    .input(z.object({ threadId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const post = await db.select().from(forumPosts).where(eq(forumPosts.id, input.threadId)).limit(1);
      if (post.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
      const replies = await db.select({ content: forumReplies.content }).from(forumReplies).where(eq(forumReplies.postId, input.threadId)).limit(20);

      const threadSummary = [
        `Title: ${post[0].title}`,
        `OP: ${(post[0].content ?? "").slice(0, 1500)}`,
        ...replies.map((r, i) => `Reply ${i + 1}: ${(r.content ?? "").slice(0, 400)}`),
      ].join("\n\n");

      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are ReGen Guide, the systems-thinking AI companion for the ReGen Civics governance pipeline. " +
                "Your job is to suggest the right Loomio poll template for a forum thread that's about to be promoted to a formal decision. " +
                "Available templates: consent (sociocratic, surfaces objections, best for policies and agreements), proposal (agree/abstain/disagree/block, for budget and token decisions), dot_vote (rank or pick top N), ranked_choice (full ranking), meeting (time-pick), sense_check (lightweight non-binding temperature check). " +
                "Return your answer as JSON with template (one of the values above), reasoning (one sentence), confidence (0-1).",
            },
            { role: "user", content: `Here is the forum thread:\n\n${threadSummary}\n\nWhich template fits best?` },
          ],
          maxTokens: 1024,
          outputSchema: {
            name: "template_suggestion",
            schema: {
              type: "object",
              properties: {
                template: { type: "string", enum: ["consent", "proposal", "dot_vote", "ranked_choice", "meeting", "sense_check"] },
                reasoning: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["template", "reasoning", "confidence"],
            },
          },
        });
        const raw = result.choices?.[0]?.message?.content ?? "";
        try {
          return JSON.parse(raw);
        } catch {
          return { template: "consent", reasoning: "Could not parse Guide response", confidence: 0.4, raw };
        }
      } catch (err: any) {
        console.error("[regen-guide] template suggestion failed", err);
        return { template: "consent", reasoning: "Default fallback (Guide unavailable)", confidence: 0.3 };
      }
    }),

  /** Draft a full decision page from a forum thread. The proposer reviews and edits before opening. */
  draftDecision: protectedProcedure
    .input(z.object({
      threadId: z.number().int().positive(),
      template: z.enum(["consent", "proposal", "dot_vote", "ranked_choice", "meeting", "sense_check"]).default("consent"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const post = await db.select().from(forumPosts).where(eq(forumPosts.id, input.threadId)).limit(1);
      if (post.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
      const replies = await db.select({ content: forumReplies.content, authorId: forumReplies.authorId }).from(forumReplies).where(eq(forumReplies.postId, input.threadId)).limit(50);

      const threadContent = [
        `Title: ${post[0].title}`,
        `OP: ${post[0].content ?? ""}`,
        ...replies.map((r, i) => `Reply ${i + 1}: ${(r.content ?? "").slice(0, 600)}`),
      ].join("\n\n");

      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are ReGen Guide, drafting a Loomio decision page from a forum thread for the ReGen Civics governance pipeline. " +
                "Stay neutral. No spin. Lead with the affirmative. No em-dashes. No contrast framing. No AI words like delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate. Direct, grounded, specific. " +
                "Generate a structured draft the proposer can edit before opening the formal decision. " +
                `The poll template is "${input.template}". Tailor the structure to that template.`,
            },
            { role: "user", content: `Here is the full forum thread to summarize and structure as a decision:\n\n${threadContent}` },
          ],
          maxTokens: 4000,
          outputSchema: {
            name: "decision_draft",
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                background: { type: "string" },
                question: { type: "string" },
                options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, rationale: { type: "string" } }, required: ["label", "rationale"] } },
                concerns: { type: "array", items: { type: "string" } },
                suggestedClosingDays: { type: "number" },
              },
              required: ["title", "background", "question", "concerns", "suggestedClosingDays"],
            },
          },
        });
        const raw = result.choices?.[0]?.message?.content ?? "";
        try {
          return JSON.parse(raw);
        } catch {
          return { title: "(draft unavailable)", background: raw, question: "(missing)", concerns: [], suggestedClosingDays: 7 };
        }
      } catch (err: any) {
        console.error("[regen-guide] decision draft failed", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Decision drafter is currently unavailable" });
      }
    }),

  // ─── Phase 2: Load dashboard ─────────────────────────────────────────────

  /** Decisions waiting on the current user (open, scoped to their tenants/bioregions). */
  myDecisionQueue: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(forumPostDecisions)
      .where(eq(forumPostDecisions.status, "open"))
      .orderBy(forumPostDecisions.closesAt as any)
      .limit(20);
  }),

  /** Community-wide governance load index. Compares rolling-30-day decision
   * count to the warning + critical thresholds from game variables. */
  communityLoad: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { rolling30Day: 0, warning: 15, critical: 30, level: "ok" as const };
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS c FROM forumPostDecisions WHERE createdAt > (NOW() - INTERVAL 30 DAY)
    `).then((r: any) => r[0] ?? []);
    const rolling30Day = Number(rows[0]?.c ?? 0);
    const warning = await readGovernanceVariable("governance.load.warning_threshold", 15);
    const critical = await readGovernanceVariable("governance.load.critical_threshold", 30);
    const level: "ok" | "warning" | "critical" = rolling30Day >= critical ? "critical" : rolling30Day >= warning ? "warning" : "ok";
    return { rolling30Day, warning, critical, level };
  }),

  /** Recently ratified decisions across the platform. Front page of the dashboard. */
  recentlyRatified: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.status, "ratified"))
        .orderBy(desc(forumPostDecisions.closedAt))
        .limit(input.limit);
    }),
});