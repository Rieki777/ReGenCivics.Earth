/**
 * The application kit against a real database (funding engine Phase 1,
 * drizzle/0277): draft versions, packet counts, the approved-to-draft rule,
 * approval refusals, answer reuse, and the stage history written by
 * adminFunding.update.
 *
 * Runs in CI's integration job (mysql:9.4, every migration applied). It writes
 * rows, so it runs only against a database on this machine: the regen-civics
 * .env points at production, and a stray DATABASE_URL must never make this
 * suite write there.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { answerBank, appQuestions, fundingPipeline, fundingStageHistory } from "../drizzle/schema";
import {
  approveAnswer,
  getPacket,
  listPrograms,
  questionHistory,
  saveAnswer,
  saveQuestionDraft,
  useAnswerInQuestion,
} from "./funding/kit";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { shortenToFit } from "./funding/shorten";

const url = process.env.DATABASE_URL ?? "";
const LOCAL = /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
const EM_DASH = String.fromCharCode(0x2014);
const RUN = Date.now().toString(36);
const PROGRAM = `kit_it_${RUN}`;
const SLUG = `kit-it-${RUN}`;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function adminCaller() {
  return appRouter.createCaller({
    user: { id: 1, role: "admin" },
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    },
    res: {},
  } as unknown as TrpcContext);
}

describe.skipIf(!LOCAL)("application kit (integration)", () => {
  let db: Db;
  let pipelineId = 0;
  let q1 = 0;
  let q2 = 0;

  beforeAll(async () => {
    const got = await getDb();
    if (!got) throw new Error("no database");
    db = got;
    const [p] = await db
      .insert(fundingPipeline)
      .values({ name: `Kit test funder ${RUN}`, category: "Accelerator (tech wedge)", track: "accelerator", cycle: "T1" })
      .$returningId();
    pipelineId = p.id;
    await db.insert(appQuestions).values([
      { pipelineId, programKey: PROGRAM, cycle: "T1", questionOrder: 1, questionText: "One line about you", charLimit: 40, isRequired: true },
      { pipelineId, programKey: PROGRAM, cycle: "T1", questionOrder: 2, questionText: "Five words", wordLimit: 5, isRequired: true },
    ]);
    const rows = await db.select().from(appQuestions).where(eq(appQuestions.programKey, PROGRAM));
    q1 = rows.find((r) => r.questionOrder === 1)!.id;
    q2 = rows.find((r) => r.questionOrder === 2)!.id;
  });

  afterAll(async () => {
    if (!db) return;
    // Questions, their versions and the stage history cascade from the funder row.
    if (pipelineId) await db.delete(fundingPipeline).where(eq(fundingPipeline.id, pipelineId));
    await db.delete(answerBank).where(eq(answerBank.slug, SLUG));
  });

  it("saves a changed draft as a new version and an unchanged one as nothing", async () => {
    const first = await saveQuestionDraft(db, { questionId: q1, body: "  We help land projects hold together.\r\n", userId: 1 });
    expect(first.changed).toBe(true);
    expect(first.question.answerDraft).toBe("We help land projects hold together.");
    const again = await saveQuestionDraft(db, { questionId: q1, body: "We help land projects hold together.", userId: 1 });
    expect(again.changed).toBe(false);
    await saveQuestionDraft(db, { questionId: q1, body: "We help land projects stay whole.", userId: 1, source: "cowork" });
    const history = await questionHistory(db, q1);
    expect(history.map((h) => h.version)).toEqual([2, 1]);
    expect(history[0].source).toBe("cowork");
  });

  it("builds the packet with lint and counts, and lists the program", async () => {
    await saveQuestionDraft(db, { questionId: q2, body: `Six words here${EM_DASH}one too many`, userId: 1 });
    const packet = await getPacket(db, PROGRAM);
    expect(packet.funder.id).toBe(pipelineId);
    expect(packet.questions).toHaveLength(2);
    const second = packet.questions.find((q) => q.id === q2)!;
    expect(second.lint?.errors.join(" ")).toContain("contains an em-dash");
    expect(packet.summary).toMatchObject({ questions: 2, required: 2, answered: 2, requiredMissing: 0, withErrors: 1 });
    const programs = await listPrograms(db);
    expect(programs.some((p) => p.programKey === PROGRAM && p.summary.questions === 2)).toBe(true);
  });

  it("refuses to approve an answer that still carries a placeholder, and approves a clean one", async () => {
    const saved = await saveAnswer(
      db,
      { projectId: 0, slug: SLUG, canonicalQuestion: "What does your company do?", bodies: { short: "Tools for land projects", long: "We are raising $X." } },
      1,
    );
    expect(saved.status).toBe("draft");
    await expect(approveAnswer(db, saved.id, 1)).rejects.toThrow(/placeholder/);
    await saveAnswer(db, { id: saved.id, projectId: 0, slug: SLUG, canonicalQuestion: "What does your company do?", bodies: { long: "We build tools for land projects." } }, 1);
    const approved = await approveAnswer(db, saved.id, 1);
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe(1);
  });

  it("sends an approved answer back to draft when a body changes", async () => {
    const [row] = await db.select().from(answerBank).where(eq(answerBank.slug, SLUG));
    expect(row.status).toBe("approved");
    const edited = await saveAnswer(db, { id: row.id, projectId: 0, slug: SLUG, canonicalQuestion: row.canonicalQuestion, bodies: { short: "Tools for land projects, free" } }, 1);
    expect(edited.status).toBe("draft");
    expect(edited.approvedAt).toBeNull();
  });

  it("starts a draft from an answer-bank body and counts the use", async () => {
    const [row] = await db.select().from(answerBank).where(eq(answerBank.slug, SLUG));
    const result = await useAnswerInQuestion(db, { questionId: q1, answerId: row.id, variant: "short", userId: 1 });
    expect(result.changed).toBe(true);
    expect(result.question.answerDraft).toBe("Tools for land projects, free");
    expect(result.question.answerId).toBe(row.id);
    const [after] = await db.select().from(answerBank).where(eq(answerBank.id, row.id));
    expect(after.usedCount).toBe(row.usedCount + 1);
  });

  it("shortens an over-limit draft to fit, telling the model how far over it landed, and stores nothing", async () => {
    const long = "We help regenerative land projects hold together for decades.";
    await saveQuestionDraft(db, { questionId: q1, body: long, userId: 1 });
    const prompts: string[] = [];
    const replies = ["We help land projects hold together for many decades now.", `"We help land projects hold${EM_DASH}together."`];
    const result = await shortenToFit(db, q1, { invoke: async (_system, user) => (prompts.push(user), replies.shift() ?? "") });
    expect(result.tries).toBe(2);
    expect(result.fits).toBe(true);
    // Quotes and the em-dash are cleaned off the model's reply.
    expect(result.proposal).toBe("We help land projects hold, together.");
    expect(prompts[1]).toContain("still over 40");
    const [row] = await db.select().from(appQuestions).where(eq(appQuestions.id, q1));
    expect(row.answerDraft).toBe(long);
  });

  it("marks a proposal that adds a number the draft did not have", async () => {
    const result = await shortenToFit(db, q1, { invoke: async () => "We help 66 land projects hold together." });
    expect(result.lint?.errors.join(" ")).toContain("added a number that is not in your draft: 66");
  });

  it("records a stage move through adminFunding.update and derives appStatus", async () => {
    const caller = adminCaller();
    const moved = await caller.adminFunding.update({ id: pipelineId, stage: "drafting" });
    expect(moved.stage).toBe("drafting");
    expect(moved.appStatus).toBe("preparing");
    await expect(caller.adminFunding.update({ id: pipelineId, stage: "loi" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.adminFunding.update({ id: pipelineId, track: "investor" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const deadline = await caller.adminFunding.update({ id: pipelineId, deadlineAt: "2026-11-02T20:00:00-08:00" });
    expect(new Date(deadline.deadlineAt as unknown as string).toISOString()).toBe("2026-11-03T04:00:00.000Z");
    const history = await db.select().from(fundingStageHistory).where(eq(fundingStageHistory.pipelineId, pipelineId));
    expect(history.map((h) => [h.fromStage, h.toStage])).toEqual([[null, "drafting"]]);
  });
});
