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
} from "../../drizzle/schema";

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
});
