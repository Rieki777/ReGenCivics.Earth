/**
 * callTasks router (Phase 1, Movement Coordination Engine).
 *
 * Closes the second of two foundational gaps the audit found: data-driven
 * tasks that an LLM or a human can write into a holder's profile from a
 * recorded call, with the two human gates (admin approval + circle
 * consent) protecting the token economy. Phase 1 ships the full
 * lifecycle: create (manual seed), list, claim, submit, approve, decline,
 * consent + reward via creditPrivateTokens. Phases 2-4 wire the LLM
 * proposer, the admin queue UI, and the edited-cut linkage.
 *
 * Token model: every reward goes through `creditPrivateTokens` with
 * source tag `call_task_bounty` and stores the returned ledger id back
 * on `callTasks.rewardLedgerId`. Public balances are never written here.
 */
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { creditPrivateTokens, type TokenType } from "../db/tokens";
import { callTasks, roleHolders, recordings } from "../../drizzle/schema";

const StatusEnum = z.enum([
  "proposed",
  "approved",
  "open",
  "claimed",
  "submitted",
  "completed",
  "declined",
  "expired",
]);

const SociocraticOverviewSchema = z.object({
  purpose: z.string().max(2000),
  whyThisRole: z.string().max(1000).optional(),
  steps: z.array(z.string().max(500)).max(20).optional(),
  definitionOfDone: z.string().max(1000).optional(),
  consentCircle: z.string().max(128).optional(),
}).partial({ whyThisRole: true, steps: true, definitionOfDone: true, consentCircle: true });

const TokenTypeSchema = z.enum(["regen", "rcivics", "rgvoice", "rcvoice"]);

/**
 * Resolve `roleSlug` to an assignee userId via the active roleHolders row.
 * Returns null if the role is open (no holder) or the slug is unknown,
 * which is the spec's "open to the circle" state.
 */
async function resolveAssignee(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, roleSlug: string | null | undefined): Promise<number | null> {
  if (!roleSlug) return null;
  const [holder] = await db
    .select({ userId: roleHolders.userId, isActive: roleHolders.isActive })
    .from(roleHolders)
    .where(eq(roleHolders.roleSlug, roleSlug))
    .limit(1);
  if (!holder || !holder.isActive) return null;
  return holder.userId ?? null;
}

export const callTasksRouter = router({
  /**
   * Manual create. Admin-only in Phase 1. Phase 2 wires the LLM
   * extract-tasks pass through this same surface so the lifecycle stays
   * single-pathed. New rows default to status=proposed so the gate path
   * (approve / decline) holds; pass status=approved or open to skip the
   * gate when a human is the proposer.
   */
  create: adminProcedure
    .input(z.object({
      recordingId: z.number().int().positive(),
      sourceVideoId: z.string().min(1).max(32),
      roleSlug: z.string().min(1).max(64).nullable().optional(),
      title: z.string().min(3).max(255),
      summary: z.string().max(4000).optional(),
      sociocraticOverview: SociocraticOverviewSchema.optional(),
      bountyTokenType: TokenTypeSchema.default("regen"),
      bountyAmount: z.number().int().min(0).max(1_000_000).default(0),
      evidenceQuote: z.string().max(2000).optional(),
      evidenceTimestampSeconds: z.number().int().min(0).optional(),
      status: StatusEnum.default("proposed"),
      createdByAgent: z.string().max(64).default("coordination-engine"),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verify the recording exists so we never orphan a task on a
      // missing parent row.
      const [rec] = await db
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.id, input.recordingId))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND", message: "recordingId not found" });

      const assigneeUserId = await resolveAssignee(db, input.roleSlug ?? null);

      await db.insert(callTasks).values({
        recordingId: input.recordingId,
        sourceVideoId: input.sourceVideoId,
        roleSlug: input.roleSlug ?? null,
        assigneeUserId,
        title: input.title,
        summary: input.summary ?? null,
        sociocraticOverview: input.sociocraticOverview ?? null,
        bountyTokenType: input.bountyTokenType,
        bountyAmount: input.bountyAmount,
        evidenceQuote: input.evidenceQuote ?? null,
        evidenceTimestampSeconds: input.evidenceTimestampSeconds ?? null,
        status: input.status,
        createdByAgent: input.createdByAgent,
        expiresAt: input.expiresAt ?? null,
      });
      return { ok: true };
    }),

  /** Admin list with optional filters. */
  adminList: adminProcedure
    .input(z.object({
      status: StatusEnum.optional(),
      recordingId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const filters = [
        input.status ? eq(callTasks.status, input.status) : undefined,
        input.recordingId ? eq(callTasks.recordingId, input.recordingId) : undefined,
      ].filter((v): v is NonNullable<typeof v> => Boolean(v));
      const where = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);
      const rows = await db
        .select()
        .from(callTasks)
        .where(where)
        .orderBy(desc(callTasks.createdAt))
        .limit(input.limit);
      return rows;
    }),

  /** Tasks belonging to the signed-in user, by status. */
  listMine: protectedProcedure
    .input(z.object({ status: StatusEnum.optional() }).default({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const where = input.status
        ? and(eq(callTasks.assigneeUserId, ctx.user.id), eq(callTasks.status, input.status))
        : eq(callTasks.assigneeUserId, ctx.user.id);
      const rows = await db
        .select()
        .from(callTasks)
        .where(where)
        .orderBy(desc(callTasks.createdAt));
      return rows;
    }),

  /** Public-facing list for a given recording (e.g. on the Schedule page). */
  listByRecording: protectedProcedure
    .input(z.object({ recordingId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(callTasks)
        .where(eq(callTasks.recordingId, input.recordingId))
        .orderBy(desc(callTasks.createdAt));
      return rows;
    }),

  /** Approve a proposed task. Bounty can be edited at gate time. */
  approve: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      bountyAmount: z.number().int().min(0).max(1_000_000).optional(),
      assigneeUserId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const patch: Record<string, unknown> = {
        status: "open" as const,
        approvedBy: ctx.user.id,
      };
      if (input.bountyAmount !== undefined) patch.bountyAmount = input.bountyAmount;
      if (input.assigneeUserId !== undefined) patch.assigneeUserId = input.assigneeUserId;
      await db.update(callTasks).set(patch).where(eq(callTasks.id, input.id));
      return { ok: true };
    }),

  /** Decline a proposed task. Terminal. */
  decline: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(callTasks).set({ status: "declined" }).where(eq(callTasks.id, input.id));
      return { ok: true };
    }),

  /** Holder claims an open task. */
  claim: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [task] = await db
        .select()
        .from(callTasks)
        .where(eq(callTasks.id, input.id))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status !== "open") {
        throw new TRPCError({ code: "CONFLICT", message: `Task is ${task.status}, not open` });
      }
      // Open-to-circle tasks (no preset assignee) let any signed-in
      // member claim. Tasks targeted at a specific holder can only be
      // claimed by that holder.
      if (task.assigneeUserId && task.assigneeUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This task is targeted to another holder." });
      }
      await db
        .update(callTasks)
        .set({
          status: "claimed",
          assigneeUserId: ctx.user.id,
          claimedAt: new Date(),
        })
        .where(eq(callTasks.id, input.id));
      return { ok: true };
    }),

  /** Holder submits an artifact for the consent gate. */
  submit: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      artifactUrl: z.string().url().max(512).optional(),
      artifactText: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      if (!input.artifactUrl && !input.artifactText) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide artifactUrl or artifactText" });
      }
      const [task] = await db
        .select()
        .from(callTasks)
        .where(eq(callTasks.id, input.id))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.assigneeUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the assignee can submit" });
      }
      if (task.status !== "claimed" && task.status !== "open") {
        throw new TRPCError({ code: "CONFLICT", message: `Task is ${task.status}` });
      }
      await db
        .update(callTasks)
        .set({
          status: "submitted",
          submittedArtifactUrl: input.artifactUrl ?? null,
          submittedArtifactText: input.artifactText ?? null,
        })
        .where(eq(callTasks.id, input.id));
      return { ok: true };
    }),

  /**
   * Admin-triggered pipeline run. Same code path the
   * /api/cron/coordination-pipeline endpoint uses; this surface lets
   * Rye kick it from the admin UI for a single video without waiting
   * for the next cron tick. Returns the pipeline report.
   */
  runPipelineNow: adminProcedure
    .input(z.object({
      maxNew: z.number().int().min(1).max(20).default(5),
      channelId: z.string().min(1).max(64).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const { runCoordinationPipeline } = await import("../jobs/coordinationPipeline");
      return runCoordinationPipeline(input ?? {});
    }),

  /**
   * Circle steward consents and triggers the reward. Admin-gated in
   * Phase 1 (every admin can consent). Phase 4 may narrow this to "the
   * steward of the task's consentCircle" once that mapping exists.
   *
   * Reward path is the token-model contract: `creditPrivateTokens` with
   * source `call_task_bounty`, sourceId=callTaskId. We store the returned
   * `rewardLedgerId` on the task row so the audit trail closes the loop.
   * Public balances are never written here.
   */
  consentAndReward: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [task] = await db
        .select()
        .from(callTasks)
        .where(eq(callTasks.id, input.id))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status !== "submitted") {
        throw new TRPCError({ code: "CONFLICT", message: `Task is ${task.status}, not submitted` });
      }
      if (!task.assigneeUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task has no assignee" });
      }

      let ledgerId: number | null = null;
      if (task.bountyAmount > 0) {
        ledgerId = await creditPrivateTokens({
          userId: task.assigneeUserId,
          tokenType: task.bountyTokenType as TokenType,
          amount: task.bountyAmount,
          source: "call_task_bounty",
          sourceId: task.id,
          description: `Bounty for "${task.title}" from session ${task.sourceVideoId}`,
        });
      }

      await db
        .update(callTasks)
        .set({
          status: "completed",
          consentedBy: ctx.user.id,
          completedAt: new Date(),
          rewardLedgerId: ledgerId,
        })
        .where(eq(callTasks.id, input.id));
      return { ok: true, rewardLedgerId: ledgerId };
    }),
});
