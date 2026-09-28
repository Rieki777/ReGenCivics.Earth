/**
 * fundingKit router: the application kit in /admin/funding (funding engine
 * Phase 1, plan v1.3 section 9). Packets of questions with live counts and
 * lint, draft saves with version history, and the canonical answer bank.
 *
 * Security posture (BUILD-PLAYBOOK: new procedures):
 *  - Every procedure is adminProcedure: CSRF protection and the admin role
 *    check apply, and nothing here is reachable by a normal user.
 *  - Every input is zod-bounded. Bodies stop at 15,000 characters so the
 *    worst case (four bytes a character) still fits a TEXT column.
 *  - No LLM runs here, and nothing is sent or submitted anywhere. The kit
 *    stores what Rye and Cowork wrote and shows what is wrong with it.
 */
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  ANSWER_VARIANTS,
  answerHistory,
  approveAnswer,
  getPacket,
  listAnswers,
  listPrograms,
  questionHistory,
  saveAnswer,
  saveQuestionDraft,
  useAnswerInQuestion,
} from "../funding/kit";

const BODY_MAX = 15_000;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

const programKeySchema = z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, "program keys are lowercase letters, digits and _");
const variantSchema = z.enum(ANSWER_VARIANTS);

export const fundingKitRouter = router({
  /** Every program cycle with questions, soonest deadline first, with packet counts. */
  programs: adminProcedure.query(async () => listPrograms(await requireDb())),

  /** One program's packet: every question in order, its draft, its live count and lint. */
  packet: adminProcedure
    .input(z.object({ programKey: programKeySchema }))
    .query(async ({ input }) => getPacket(await requireDb(), input.programKey)),

  /** Save a draft. Unchanged text writes nothing; changed text appends a version. */
  saveDraft: adminProcedure
    .input(
      z.object({
        questionId: z.number().int().positive(),
        answerDraft: z.string().max(BODY_MAX),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) =>
      saveQuestionDraft(await requireDb(), {
        questionId: input.questionId,
        body: input.answerDraft,
        note: input.note ?? null,
        userId: ctx.user.id,
      }),
    ),

  /** A question's saved drafts, newest first. */
  draftHistory: adminProcedure
    .input(z.object({ questionId: z.number().int().positive() }))
    .query(async ({ input }) => questionHistory(await requireDb(), input.questionId)),

  /** The answer bank for ReGen Civics (projectId 0) or one land project. */
  answers: adminProcedure
    .input(z.object({ projectId: z.number().int().min(0).default(0) }).optional())
    .query(async ({ input }) => listAnswers(await requireDb(), input?.projectId ?? 0)),

  /** Create or update an answer. Editing an approved body sends it back to draft. */
  saveAnswer: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        projectId: z.number().int().min(0).default(0),
        slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "slugs are lowercase letters, digits and -"),
        canonicalQuestion: z.string().min(1).max(500),
        tags: z.array(z.string().min(1).max(60)).max(20).nullable().optional(),
        bodies: z.object({
          short: z.string().max(255).nullable().optional(),
          "150": z.string().max(1000).nullable().optional(),
          "500": z.string().max(4000).nullable().optional(),
          long: z.string().max(BODY_MAX).nullable().optional(),
        }),
        sourceRefs: z.array(z.string().min(1).max(200)).max(30).nullable().optional(),
        notes: z.string().max(5000).nullable().optional(),
        sortOrder: z.number().int().min(0).max(100_000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => saveAnswer(await requireDb(), input, ctx.user.id)),

  /** Approve an answer. Refused while a body breaks a hard rule (G5, a dash, a placeholder). */
  approveAnswer: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => approveAnswer(await requireDb(), input.id, ctx.user.id)),

  /** Start a question's draft from an answer-bank body. */
  useAnswer: adminProcedure
    .input(
      z.object({
        questionId: z.number().int().positive(),
        answerId: z.number().int().positive(),
        variant: variantSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => useAnswerInQuestion(await requireDb(), { ...input, userId: ctx.user.id })),

  /** Every saved body of an answer, by length. */
  answerHistory: adminProcedure
    .input(z.object({ answerId: z.number().int().positive() }))
    .query(async ({ input }) => answerHistory(await requireDb(), input.answerId)),
});
