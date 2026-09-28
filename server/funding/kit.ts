/**
 * The application kit (funding engine Phase 1, plan v1.3 section 9): each
 * program's questions with their portal limits, the tailored drafts, the
 * canonical answer bank, and every saved version of both.
 *
 * Callers are admin-only (server/routes/fundingKit.ts). No LLM runs here and
 * nothing is ever submitted: the kit shows Rye every answer with its live count
 * against the limit and the same lint the draft checker runs
 * (shared/applicationLint.mjs over shared/g5Rules.mjs), so an answer that is
 * over a limit, promises upside, carries a dash or a [VERIFY] placeholder, or
 * states a number nobody confirmed is visible before it reaches a portal.
 */
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  answerBank,
  answerVersions,
  appQuestions,
  fundingPipeline,
  metrics,
  type AnswerBankRow,
  type AppQuestionRow,
  type FundingPipelineRow,
} from "../../drizzle/schema";
import { confirmedNumberSet, lintAnswer, type LintResult } from "../../shared/applicationLint.mjs";
import {
  coarseStatusFor,
  isValidStage,
  validateStageWrite,
  type CoarseStatus,
  type FundingTrack,
} from "../../shared/fundingStages";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

/** Body fields of an answer-bank entry, and the version `field` each writes. */
export const ANSWER_VARIANTS = ["short", "150", "500", "long"] as const;
export type AnswerVariant = (typeof ANSWER_VARIANTS)[number];
const VARIANT_COLUMN = {
  short: "bodyShort",
  "150": "body150",
  "500": "body500",
  long: "bodyLong",
} as const satisfies Record<AnswerVariant, keyof AnswerBankRow>;
/** The length each variant is written to, for its live count. */
export const VARIANT_TARGET_CHARS: Record<AnswerVariant, number | null> = { short: 50, "150": 150, "500": 500, long: null };

/** Line endings to \n and outer whitespace trimmed: what a portal would receive. */
export function normalizeBody(body: string): string {
  return String(body ?? "").replace(/\r\n?/g, "\n").trim();
}

/** Confirmed metric values, normalized, for the "number not in confirmed metrics" check. */
export async function confirmedNumbers(db: Exec): Promise<Set<string>> {
  const rows = await db
    .select({ displayValue: metrics.displayValue, valueNumeric: metrics.valueNumeric })
    .from(metrics)
    .where(isNotNull(metrics.confirmedAt));
  return confirmedNumberSet(rows);
}

export function lintQuestion(q: Pick<AppQuestionRow, "answerDraft" | "charLimit" | "wordLimit">, confirmed: Set<string>): LintResult | null {
  const text = q.answerDraft ?? "";
  if (!text.trim()) return null;
  return lintAnswer({ charLimit: q.charLimit, wordLimit: q.wordLimit }, text, confirmed);
}

export interface PacketSummary {
  questions: number;
  required: number;
  answered: number;
  requiredMissing: number;
  overLimit: number;
  withErrors: number;
  withWarnings: number;
}

/** Counts for a packet header or a program card. Pure. */
export function summarizePacket(
  rows: Array<Pick<AppQuestionRow, "isRequired" | "answerDraft" | "charLimit" | "wordLimit">>,
  lints: Array<LintResult | null>,
): PacketSummary {
  const s: PacketSummary = { questions: rows.length, required: 0, answered: 0, requiredMissing: 0, overLimit: 0, withErrors: 0, withWarnings: 0 };
  rows.forEach((q, i) => {
    const lint = lints[i];
    const answered = Boolean(q.answerDraft && q.answerDraft.trim());
    if (q.isRequired) s.required++;
    if (answered) s.answered++;
    if (q.isRequired && !answered) s.requiredMissing++;
    if (lint) {
      if (lint.errors.some((e) => /\blimit \d+ \(cut \d+\)/.test(e))) s.overLimit++;
      if (lint.errors.length) s.withErrors++;
      if (lint.warnings.length) s.withWarnings++;
    }
  });
  return s;
}

// ── Versions ─────────────────────────────────────────────────────────────────

type VersionSource = "rye" | "llm" | "cowork" | "import" | "seed";

/** Append a version. Exactly one owner: an answer-bank entry or a question. */
export async function appendVersion(
  db: Exec,
  v: { answerId?: number | null; questionId?: number | null; field: string; body: string; source: VersionSource; note?: string | null; createdBy?: number | null },
): Promise<number> {
  const hasAnswer = v.answerId !== undefined && v.answerId !== null;
  const hasQuestion = v.questionId !== undefined && v.questionId !== null;
  if (hasAnswer === hasQuestion) throw new Error("A version belongs to exactly one answer-bank entry or one question");
  const owner = hasAnswer
    ? and(eq(answerVersions.answerId, v.answerId as number), eq(answerVersions.field, v.field))
    : eq(answerVersions.questionId, v.questionId as number);
  const [row] = await db.select({ top: sql<number | null>`MAX(${answerVersions.version})` }).from(answerVersions).where(owner);
  const version = Number(row?.top ?? 0) + 1;
  await db.insert(answerVersions).values({
    answerId: hasAnswer ? (v.answerId as number) : null,
    questionId: hasQuestion ? (v.questionId as number) : null,
    field: v.field,
    version,
    body: v.body,
    source: v.source,
    note: v.note ?? null,
    createdBy: v.createdBy ?? null,
  });
  return version;
}

// ── Programs and packets ─────────────────────────────────────────────────────

type FunderSummary = Pick<
  FundingPipelineRow,
  "id" | "name" | "category" | "track" | "stage" | "appStatus" | "cycle" | "deadline" | "deadlineAt" | "deadlineSource" | "deadlineVerifiedAt" | "link" | "priority"
>;

function funderSummary(row: FundingPipelineRow): FunderSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    track: row.track,
    stage: row.stage,
    appStatus: row.appStatus,
    cycle: row.cycle,
    deadline: row.deadline,
    deadlineAt: row.deadlineAt,
    deadlineSource: row.deadlineSource,
    deadlineVerifiedAt: row.deadlineVerifiedAt,
    link: row.link,
    priority: row.priority,
  };
}

/** Every program cycle that has questions, with its funder and packet counts, soonest deadline first. */
export async function listPrograms(db: Exec) {
  const questions = await db.select().from(appQuestions).orderBy(asc(appQuestions.programKey), asc(appQuestions.questionOrder));
  if (questions.length === 0) return [];
  const confirmed = await confirmedNumbers(db);
  const funders = await db.select().from(fundingPipeline);
  const funderById = new Map(funders.map((f) => [f.id, f]));

  const groups = new Map<string, AppQuestionRow[]>();
  for (const q of questions) {
    const list = groups.get(q.programKey) ?? [];
    list.push(q);
    groups.set(q.programKey, list);
  }

  const out = [...groups.entries()].flatMap(([programKey, rows]) => {
    const funder = funderById.get(rows[0].pipelineId);
    if (!funder) return [];
    const lints = rows.map((q) => lintQuestion(q, confirmed));
    return [{ programKey, cycle: rows[0].cycle, funder: funderSummary(funder), summary: summarizePacket(rows, lints) }];
  });

  // Dated first, soonest first; then by name.
  return out.sort((a, b) => {
    const ta = a.funder.deadlineAt ? new Date(a.funder.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.funder.deadlineAt ? new Date(b.funder.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb || a.funder.name.localeCompare(b.funder.name);
  });
}

/** One program's packet: the funder, every question in order with its draft and lint, and the counts. */
export async function getPacket(db: Exec, programKey: string) {
  const rows = await db
    .select()
    .from(appQuestions)
    .where(eq(appQuestions.programKey, programKey))
    .orderBy(asc(appQuestions.questionOrder));
  if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: `No questions for ${programKey}` });
  const [funder] = await db.select().from(fundingPipeline).where(eq(fundingPipeline.id, rows[0].pipelineId)).limit(1);
  if (!funder) throw new TRPCError({ code: "NOT_FOUND", message: "The program's funder row is gone" });
  const confirmed = await confirmedNumbers(db);
  const lints = rows.map((q) => lintQuestion(q, confirmed));
  return {
    programKey,
    cycle: rows[0].cycle,
    funder: funderSummary(funder),
    questions: rows.map((q, i) => ({ ...q, lint: lints[i] })),
    summary: summarizePacket(rows, lints),
    // The client lints as Rye types, against the same confirmed numbers.
    confirmedNumbers: [...confirmed],
  };
}

/** Save a question's draft. A changed draft appends a version; an unchanged one writes nothing. */
export async function saveQuestionDraft(
  db: Db,
  input: { questionId: number; body: string; source?: VersionSource; note?: string | null; userId?: number | null; answerId?: number | null },
) {
  const [q] = await db.select().from(appQuestions).where(eq(appQuestions.id, input.questionId)).limit(1);
  if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
  const next = normalizeBody(input.body);
  const changed = (q.answerDraft ?? "") !== next;
  const answerChanged = input.answerId !== undefined && input.answerId !== q.answerId;
  if (changed || answerChanged) {
    await db.transaction(async (tx) => {
      const patch: Partial<AppQuestionRow> = {};
      if (changed) {
        patch.answerDraft = next || null;
        patch.draftUpdatedAt = new Date();
        patch.draftUpdatedBy = input.userId ?? null;
      }
      if (answerChanged) patch.answerId = input.answerId ?? null;
      await tx.update(appQuestions).set(patch).where(eq(appQuestions.id, q.id));
      if (changed && next) {
        await appendVersion(tx, {
          questionId: q.id,
          field: "draft",
          body: next,
          source: input.source ?? "rye",
          note: input.note ?? null,
          createdBy: input.userId ?? null,
        });
      }
    });
  }
  const [saved] = await db.select().from(appQuestions).where(eq(appQuestions.id, q.id)).limit(1);
  const confirmed = await confirmedNumbers(db);
  return { changed, question: { ...saved, lint: lintQuestion(saved, confirmed) } };
}

export async function questionHistory(db: Exec, questionId: number) {
  return db
    .select()
    .from(answerVersions)
    .where(eq(answerVersions.questionId, questionId))
    .orderBy(desc(answerVersions.version))
    .limit(50);
}

// ── Answer bank ──────────────────────────────────────────────────────────────

export async function listAnswers(db: Exec, projectId = 0) {
  const rows = await db
    .select()
    .from(answerBank)
    .where(eq(answerBank.projectId, projectId))
    .orderBy(asc(answerBank.sortOrder), asc(answerBank.slug));
  const confirmed = await confirmedNumbers(db);
  return {
    answers: rows.map((a) => ({ ...a, lint: lintAnswerBodies(a, confirmed) })),
    confirmedNumbers: [...confirmed],
  };
}

/** Lint every non-empty body of an answer-bank entry against its target length. */
export function lintAnswerBodies(a: Pick<AnswerBankRow, "bodyShort" | "body150" | "body500" | "bodyLong">, confirmed: Set<string>) {
  const out: Partial<Record<AnswerVariant, LintResult>> = {};
  for (const v of ANSWER_VARIANTS) {
    const text = a[VARIANT_COLUMN[v]];
    if (typeof text === "string" && text.trim()) out[v] = lintAnswer({ charLimit: VARIANT_TARGET_CHARS[v] }, text, confirmed);
  }
  return out;
}

export interface AnswerInput {
  id?: number;
  projectId: number;
  slug: string;
  canonicalQuestion: string;
  tags?: string[] | null;
  bodies: Partial<Record<AnswerVariant, string | null>>;
  sourceRefs?: string[] | null;
  notes?: string | null;
  sortOrder?: number;
}

/**
 * Create or update an answer-bank entry. Each changed body appends a version,
 * and editing any body of an approved entry sends it back to draft: an
 * approval covers the words that were approved, not whatever replaced them.
 */
export async function saveAnswer(db: Db, input: AnswerInput, userId: number | null, source: VersionSource = "rye") {
  return db.transaction(async (tx) => {
    let current: AnswerBankRow | undefined;
    if (input.id) {
      [current] = await tx.select().from(answerBank).where(eq(answerBank.id, input.id)).limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Answer not found" });
    } else {
      [current] = await tx
        .select()
        .from(answerBank)
        .where(and(eq(answerBank.projectId, input.projectId), eq(answerBank.slug, input.slug)))
        .limit(1);
      if (current) throw new TRPCError({ code: "CONFLICT", message: `An answer with the slug "${input.slug}" already exists` });
    }

    const changedBodies: Array<{ variant: AnswerVariant; body: string }> = [];
    const patch: Record<string, unknown> = {
      canonicalQuestion: input.canonicalQuestion.trim(),
      tags: input.tags ?? current?.tags ?? null,
      sourceRefs: input.sourceRefs ?? current?.sourceRefs ?? null,
      notes: input.notes === undefined ? (current?.notes ?? null) : input.notes,
      sortOrder: input.sortOrder ?? current?.sortOrder ?? 0,
    };
    for (const v of ANSWER_VARIANTS) {
      const incoming = input.bodies[v];
      if (incoming === undefined) continue;
      const next = incoming === null ? "" : normalizeBody(incoming);
      const before = (current?.[VARIANT_COLUMN[v]] as string | null | undefined) ?? "";
      if (next !== before) {
        patch[VARIANT_COLUMN[v]] = next || null;
        if (next) changedBodies.push({ variant: v, body: next });
      }
    }
    const bodyChanged = ANSWER_VARIANTS.some((v) => VARIANT_COLUMN[v] in patch);
    if (current?.status === "approved" && bodyChanged) {
      patch.status = "draft";
      patch.approvedAt = null;
      patch.approvedBy = null;
    }

    let id: number;
    if (current) {
      id = current.id;
      await tx.update(answerBank).set(patch).where(eq(answerBank.id, id));
    } else {
      const [inserted] = await tx
        .insert(answerBank)
        .values({
          projectId: input.projectId,
          slug: input.slug,
          ...(patch as Partial<AnswerBankRow>),
          canonicalQuestion: input.canonicalQuestion.trim(),
        })
        .$returningId();
      id = inserted.id;
    }
    for (const c of changedBodies) {
      await appendVersion(tx, { answerId: id, field: c.variant, body: c.body, source, createdBy: userId });
    }
    const [saved] = await tx.select().from(answerBank).where(eq(answerBank.id, id)).limit(1);
    return saved;
  });
}

/** Approve an entry. Refused while any body breaks a hard rule. */
export async function approveAnswer(db: Db, id: number, userId: number | null) {
  const [a] = await db.select().from(answerBank).where(eq(answerBank.id, id)).limit(1);
  if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Answer not found" });
  const lint = lintAnswerBodies(a, await confirmedNumbers(db));
  const problems = ANSWER_VARIANTS.flatMap((v) => (lint[v]?.errors ?? []).map((e) => `${v}: ${e}`));
  // An over-length variant is a warning here, not a refusal: the target
  // lengths are guides, and the portal limit is checked on the question.
  const blocking = problems.filter((p) => !/\blimit \d+ \(cut \d+\)/.test(p));
  if (blocking.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Fix before approving: ${blocking.slice(0, 5).join("; ")}` });
  }
  if (!ANSWER_VARIANTS.some((v) => typeof a[VARIANT_COLUMN[v]] === "string" && (a[VARIANT_COLUMN[v]] as string).trim())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "An answer needs at least one body before it can be approved" });
  }
  const now = new Date();
  await db.update(answerBank).set({ status: "approved", approvedAt: now, approvedBy: userId, verifiedAt: now }).where(eq(answerBank.id, id));
  const [saved] = await db.select().from(answerBank).where(eq(answerBank.id, id)).limit(1);
  return saved;
}

/** Start a question's draft from an answer-bank body. */
export async function useAnswerInQuestion(
  db: Db,
  input: { questionId: number; answerId: number; variant: AnswerVariant; userId: number | null },
) {
  const [a] = await db.select().from(answerBank).where(eq(answerBank.id, input.answerId)).limit(1);
  if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Answer not found" });
  const body = a[VARIANT_COLUMN[input.variant]];
  if (typeof body !== "string" || !body.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `That answer has no ${input.variant} body` });
  }
  const result = await saveQuestionDraft(db, {
    questionId: input.questionId,
    body,
    source: "rye",
    note: `from answer bank: ${a.slug} (${input.variant})`,
    userId: input.userId,
    answerId: a.id,
  });
  if (result.changed) {
    await db.update(answerBank).set({ usedCount: sql`${answerBank.usedCount} + 1` }).where(eq(answerBank.id, a.id));
  }
  return result;
}

export async function answerHistory(db: Exec, answerId: number) {
  return db
    .select()
    .from(answerVersions)
    .where(eq(answerVersions.answerId, answerId))
    .orderBy(asc(answerVersions.field), desc(answerVersions.version))
    .limit(100);
}

// ── Stage writes on funding_pipeline ─────────────────────────────────────────

export interface StagePatchInput {
  track?: FundingTrack | null;
  stage?: string | null;
  appStatus?: CoarseStatus;
}

export type StagePlan =
  | { ok: true; patch: { track?: FundingTrack | null; stage?: string | null; appStatus?: CoarseStatus }; history: { fromStage: string | null; toStage: string | null; track: FundingTrack | null } | null }
  | { ok: false; reason: string };

/**
 * Plan a track or stage change on a funder row. Pure. A stage must belong to
 * the row's track; a track change that would strand the current stage is
 * refused with a reason, so nothing is cleared silently. A stage move sets the
 * coarse appStatus from the stage, unless Rye is parking the row.
 */
export function planStageChange(
  current: { track: FundingTrack | null; stage: string | null; appStatus: CoarseStatus },
  input: StagePatchInput,
): StagePlan {
  const nextTrack = input.track !== undefined ? input.track : current.track;
  const nextStage = input.stage !== undefined ? (input.stage === "" ? null : input.stage) : current.stage;

  if (input.track !== undefined && input.stage === undefined && current.stage && (!nextTrack || !isValidStage(nextTrack, current.stage))) {
    return {
      ok: false,
      reason: `The stage "${current.stage}" does not exist on the ${nextTrack ?? "empty"} track. Choose a stage for the new track in the same change.`,
    };
  }
  const check = validateStageWrite(nextTrack, nextStage);
  if (!check.ok) return check;

  const patch: { track?: FundingTrack | null; stage?: string | null; appStatus?: CoarseStatus } = {};
  if (input.track !== undefined && input.track !== current.track) patch.track = input.track;
  let history: { fromStage: string | null; toStage: string | null; track: FundingTrack | null } | null = null;
  if (nextStage !== current.stage) {
    patch.stage = nextStage;
    history = { fromStage: current.stage, toStage: nextStage, track: nextTrack };
    if (nextStage && nextTrack && input.appStatus !== "parked") {
      patch.appStatus = coarseStatusFor(nextTrack, nextStage) ?? current.appStatus;
    }
  }
  if (input.appStatus !== undefined && patch.appStatus === undefined && input.appStatus !== current.appStatus) {
    patch.appStatus = input.appStatus;
  }
  return { ok: true, patch, history };
}
