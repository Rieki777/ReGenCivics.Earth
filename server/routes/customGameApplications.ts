/**
 * customGameApplications router: the Sylva intake pipeline for the Custom Games
 * product line (CUSTOM_GAMES_MASTER_PLAN.md, Workstream C).
 *
 * `submit` is the public write from /custom-games/apply: it validates the
 * progressive blueprint draft (shared/customGameBlueprint.ts) and the Sylva
 * transcript, computes a simple qualification score, stores one row, and mails
 * the owner. The human always submits; Sylva never does (AI-AUTOMATION-RISKS).
 * `list`/`get`/`updateStatus` power the admin queue on /admin.
 *
 * Security posture (BUILD-PLAYBOOK section 1 + 4):
 *  - publicProcedure only on submit, with checkRateLimit("custom_game_waitlist")
 *    like the waitlist form it sits beside.
 *  - Every input is zod-bounded; applicant text is sanitized before storage.
 *  - The blueprint carries provider NAMES only; the draft schema refuses
 *    credential-shaped strings, so a pasted key never lands in the DB.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { customGameApplications } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { sanitizeInput } from "../_core/security";
import { notifyOwner } from "../_core/notification";
import { blueprintDraftSchema, type BlueprintDraft } from "../../shared/customGameBlueprint";

const transcriptTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const statusEnum = z.enum(["draft", "submitted", "reviewing", "in_conversation", "accepted", "declined"]);

/** Deep-sanitize every string in the draft, preserving arrays (sanitizeObject would flatten them). */
function deepSanitizeStrings<T>(value: T): T {
  if (typeof value === "string") return sanitizeInput(value) as T;
  if (Array.isArray(value)) return value.map((v) => deepSanitizeStrings(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepSanitizeStrings(v);
    return out as T;
  }
  return value;
}

/**
 * Simple qualification score, 0 to 100. Deterministic on the draft so reviewers
 * can sort the queue by readiness:
 *  - land status:      owned 30, leased 25, committed 15, seeking 5
 *  - budget confirmed: 30 (explicit yes to the $20,000 investment)
 *  - team hours/week:  >=10 -> 20, >=5 -> 12, >=1 -> 5
 *  - timeline:         named a near-term window 20, said anything 10
 */
export function computeQualificationScore(draft: BlueprintDraft, budgetConfirmed: boolean): number {
  let score = 0;
  const land = draft.identity?.landStatus;
  if (land === "owned") score += 30;
  else if (land === "leased") score += 25;
  else if (land === "committed") score += 15;
  else if (land === "seeking") score += 5;

  if (budgetConfirmed) score += 30;

  const hours = draft.team?.hoursPerWeek ?? 0;
  if (hours >= 10) score += 20;
  else if (hours >= 5) score += 12;
  else if (hours >= 1) score += 5;

  const timeline = (draft.deployment?.timelineEstimate ?? "").trim();
  if (/asap|right away|now|immediat|month|spring|summer|fall|autumn|winter|q[1-4]|this year|202[6-9]/i.test(timeline)) score += 20;
  else if (timeline.length > 0) score += 10;

  return score;
}

export const customGameApplicationsRouter = router({
  submit: publicProcedure
    .input(z.object({
      applicantName: z.string().min(1).max(255),
      applicantEmail: z.string().email().max(255),
      applicantRole: z.enum(["founder", "investor", "core-team"]),
      projectName: z.string().min(1).max(255),
      /** Explicit human confirmation of the $20,000 investment; feeds the score. */
      budgetConfirmed: z.boolean(),
      blueprintDraft: blueprintDraftSchema,
      /** The Sylva conversation, saved so the generation session writes in their voice. Empty when they typed the form. */
      transcript: z.array(transcriptTurn).max(80).default([]),
      /** Optional needs/offers capture (Phase B2), mirrored to the board tables. */
      needsText: z.string().max(2000).optional(),
      offersText: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "custom_game_waitlist");
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The application could not be saved. Please try again." });

      const draft = deepSanitizeStrings(input.blueprintDraft);
      const transcript = input.transcript.map((t) =>
        t.role === "user" ? { role: t.role, content: sanitizeInput(t.content) } : t,
      );
      const score = computeQualificationScore(draft, input.budgetConfirmed);

      await drizzle.insert(customGameApplications).values({
        applicantName: sanitizeInput(input.applicantName),
        applicantEmail: sanitizeInput(input.applicantEmail),
        applicantRole: input.applicantRole,
        projectName: sanitizeInput(input.projectName),
        status: "submitted",
        blueprintDraft: draft,
        transcript: transcript.length > 0 ? JSON.stringify(transcript).slice(0, 2_000_000) : null,
        score,
        needsText: input.needsText ? sanitizeInput(input.needsText) : null,
        offersText: input.offersText ? sanitizeInput(input.offersText) : null,
      });

      // Mirror the optional needs/offers capture to the board tables (Phase B2, non-fatal).
      {
        const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
        await captureFormNeedsOffers({
          source: "custom_game_application",
          sourceId: null,
          contactName: input.applicantName,
          contactEmail: input.applicantEmail,
          needsText: input.needsText,
          offersText: input.offersText,
        });
      }

      await notifyOwner({
        title: "New Custom Game Application",
        content: [
          `From: ${input.applicantName} (${input.applicantEmail}), ${input.applicantRole}`,
          `Project: ${input.projectName}`,
          `Land status: ${draft.identity?.landStatus ?? "not given"}`,
          `Hosting: ${draft.deployment?.hosting ?? "not given"}`,
          `Budget confirmed: ${input.budgetConfirmed ? "yes" : "no"}`,
          `Team hours/week: ${draft.team?.hoursPerWeek ?? "not given"}`,
          `Score: ${score}/100`,
          `Review it in the admin Custom Games queue.`,
        ].join("\n"),
      });
      return { success: true };
    }),

  /** Admin queue. Excludes the transcript (fetch one row via `get` when expanding). */
  list: adminProcedure
    .input(z.object({ status: statusEnum.optional() }).optional())
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return [];
      const rows = await drizzle
        .select({
          id: customGameApplications.id,
          applicantName: customGameApplications.applicantName,
          applicantEmail: customGameApplications.applicantEmail,
          applicantRole: customGameApplications.applicantRole,
          projectName: customGameApplications.projectName,
          status: customGameApplications.status,
          blueprintDraft: customGameApplications.blueprintDraft,
          score: customGameApplications.score,
          internalNotes: customGameApplications.internalNotes,
          createdAt: customGameApplications.createdAt,
          updatedAt: customGameApplications.updatedAt,
        })
        .from(customGameApplications)
        .orderBy(desc(customGameApplications.createdAt));
      if (input?.status) return rows.filter((r) => r.status === input.status);
      return rows;
    }),

  get: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return null;
      const rows = await drizzle
        .select()
        .from(customGameApplications)
        .where(eq(customGameApplications.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: statusEnum,
      internalNotes: z.string().max(10_000).optional(),
    }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return { success: false };
      const set: { status: typeof input.status; internalNotes?: string } = { status: input.status };
      if (input.internalNotes !== undefined) set.internalNotes = sanitizeInput(input.internalNotes);
      await drizzle
        .update(customGameApplications)
        .set(set)
        .where(eq(customGameApplications.id, input.id));
      return { success: true };
    }),
});
