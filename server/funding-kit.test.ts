/**
 * The application kit's pure logic (funding engine Phase 1): seed planning
 * (server/funding/kitSeed.ts), stage writes and packet counts
 * (server/funding/kit.ts), and that the router is admin-only. No database.
 */
import { describe, expect, it } from "vitest";
import {
  PROGRAM_FUNDERS,
  planBackfill,
  planFunderInsert,
  planFunderUpdate,
  planQuestionRows,
  programDeadline,
  trackForCategory,
  validateQuestionSeed,
  type SeedProgram,
} from "./funding/kitSeed";
import { lintAnswerBodies, lintQuestion, normalizeBody, planStageChange, summarizePacket } from "./funding/kit";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const EM_DASH = String.fromCharCode(0x2014);

const PEARX: SeedProgram = {
  program_key: "pearx_w27",
  program: "PearX W27",
  cycle: "W27",
  track: "accelerator",
  deadline_at: "2026-10-04T23:59:00-07:00",
  deadline_text: "The Regular Deadline is October 4th at 11:59PM PST.",
  deadline_verified: true,
  deadline_source_url: "https://pear.vc/pearx-application/",
  application_url: "https://pear.vc/pearx-application/",
  questions: [
    { order: 1, section: "Basic Info", text: "Company name", char_limit: null, required: true, field_type: "short_text", verified: true },
    { order: 2, section: "Pitch", text: "Describe what you do", char_limit: 280, required: true, field_type: "long_text", verified: true },
  ],
};

describe("kitSeed", () => {
  it("knows the five programs' funder rows by exact name", () => {
    expect(Object.keys(PROGRAM_FUNDERS).sort()).toEqual(["500global_b37", "emergent_ventures", "pearx_w27", "techstars_spring27", "yc_w27"]);
    expect(PROGRAM_FUNDERS.emergent_ventures.name).toBe("Emergent Ventures");
    expect(PROGRAM_FUNDERS.yc_w27.name).toBe("Y Combinator");
  });

  it("validates a seed before it touches the database", () => {
    expect(validateQuestionSeed({ programs: [PEARX] })).toEqual([]);
    const bad: SeedProgram = { ...PEARX, program_key: "Bad Key", questions: [PEARX.questions[0], { ...PEARX.questions[0] }] };
    const problems = validateQuestionSeed({ programs: [bad] });
    expect(problems.join(" ")).toContain("bad program_key");
    expect(problems.join(" ")).toContain("duplicate order 1");
    expect(validateQuestionSeed({ programs: [{ ...PEARX, program_key: "unknown_x" }] }).join(" ")).toContain("add funder_name");
  });

  it("uses a stated deadline, else parses the text, and never an approximate one", () => {
    expect(programDeadline(PEARX).at?.toISOString()).toBe("2026-10-05T06:59:00.000Z");
    const b37 = programDeadline({ ...PEARX, deadline_at: null, deadline_text: "Batch 37 Deadline: October 2, 2026" });
    expect(b37.at?.toISOString()).toBe("2026-10-02T07:00:00.000Z");
    expect(programDeadline({ ...PEARX, deadline_at: null, deadline_text: "Target Mar 1, 2027" }).at).toBeNull();
  });

  it("writes program facts on a funder row and leaves Rye's columns alone", () => {
    const { patch } = planFunderUpdate(
      PEARX,
      { id: 7, name: "PearX", track: null, cycle: null, deadlineAt: null, link: null },
      "2026-09-27T10:00:00Z",
    );
    expect(patch).toMatchObject({ track: "accelerator", cycle: "W27", deadlineSource: "https://pear.vc/pearx-application/", deadlineVerifiedAt: "2026-09-27" });
    expect((patch.deadlineAt as Date).toISOString()).toBe("2026-10-05T06:59:00.000Z");
    for (const key of ["appStatus", "stage", "owner", "nextAction", "notes", "priority"]) expect(patch).not.toHaveProperty(key);
    // A track Rye already set is kept, and a row already holding the facts gets no patch.
    const settled = {
      id: 7,
      name: "PearX",
      track: "grant",
      cycle: "W27",
      deadlineAt: "2026-10-05T06:59:00.000Z",
      deadlineSource: "https://pear.vc/pearx-application/",
      deadlineVerifiedAt: new Date("2026-09-27T00:00:00.000Z"),
      link: "x",
    };
    expect(planFunderUpdate(PEARX, settled, "2026-09-27T10:00:00Z").patch).toEqual({});
    expect(planFunderUpdate(PEARX, { ...settled, deadlineSource: null }, "2026-09-27T10:00:00Z").patch).toEqual({
      deadlineSource: "https://pear.vc/pearx-application/",
    });
  });

  it("builds a missing funder row and the question rows without drafts", () => {
    const row = planFunderInsert(PEARX, "2026-09-27", "2026-09-27T10:00:00Z");
    expect(row).toMatchObject({
      name: "PearX",
      category: "Accelerator (tech wedge)",
      priority: "P1",
      track: "accelerator",
      cycle: "W27",
      deadlineVerifiedAt: "2026-09-27",
    });
    const qs = planQuestionRows(PEARX, 42);
    expect(qs).toHaveLength(2);
    expect(qs[1]).toMatchObject({ pipelineId: 42, programKey: "pearx_w27", questionOrder: 2, charLimit: 280, isRequired: true });
    for (const q of qs) {
      expect(q).not.toHaveProperty("answerDraft");
      expect(q).not.toHaveProperty("answerId");
    }
  });

  it("maps only unambiguous categories to a track", () => {
    expect(trackForCategory("Accelerator (tech wedge)")).toBe("accelerator");
    expect(trackForCategory("RWA crypto / accelerator")).toBe("accelerator");
    expect(trackForCategory("Government")).toBe("grant");
    expect(trackForCategory("Philanthropy + climate")).toBe("grant");
    expect(trackForCategory("ReFi / web3")).toBe("public_goods");
    expect(trackForCategory("Ally / field network")).toBe("network");
    expect(trackForCategory("Real estate & land")).toBeNull();
    expect(trackForCategory("Natural capital")).toBeNull();
  });

  it("backfills gaps only and reports every row it cannot date", () => {
    const plan = planBackfill([
      { id: 1, name: "A", category: "Government", deadline: "Aug 24, 2026 (confirmed)", deadlineAt: null, track: null },
      { id: 2, name: "B", category: "Real estate & land", deadline: "Rolling", deadlineAt: null, track: null },
      { id: 3, name: "C", category: "Accelerator (tech wedge)", deadline: "Apr 22, 2027", deadlineAt: "2027-04-22T07:00:00.000Z", track: "accelerator" },
      { id: 4, name: "D", category: "Natural capital", deadline: "Target Mar 1, 2027", deadlineAt: null, track: null },
    ]);
    expect(plan.deadlines.map((d) => d.id)).toEqual([1]);
    expect(plan.tracks.map((t) => [t.id, t.track])).toEqual([[1, "grant"]]);
    expect(plan.unparsed.rolling?.map((r) => r.id)).toEqual([2]);
    expect(plan.unparsed.approximate?.map((r) => r.id)).toEqual([4]);
    expect(plan.untracked).toEqual({ "Real estate & land": 1, "Natural capital": 1 });
  });
});

describe("planStageChange", () => {
  const base = { track: "accelerator" as const, stage: null, appStatus: "not_started" as const };

  it("sets a valid stage, derives appStatus and records history", () => {
    const plan = planStageChange(base, { stage: "drafting" });
    expect(plan).toEqual({
      ok: true,
      patch: { stage: "drafting", appStatus: "preparing" },
      history: { fromStage: null, toStage: "drafting", track: "accelerator" },
    });
  });

  it("refuses a stage the track does not have, and a stage with no track", () => {
    expect(planStageChange(base, { stage: "loi" }).ok).toBe(false);
    expect(planStageChange({ ...base, track: null }, { stage: "drafting" }).ok).toBe(false);
  });

  it("refuses a track change that would strand the stage, and allows it with a new stage", () => {
    const current = { track: "accelerator" as const, stage: "interview", appStatus: "in_review" as const };
    expect(planStageChange(current, { track: "grant" }).ok).toBe(false);
    const moved = planStageChange(current, { track: "grant", stage: "drafting" });
    expect(moved.ok && moved.patch).toEqual({ track: "grant", stage: "drafting", appStatus: "preparing" });
  });

  it("lets Rye park a row while moving its stage", () => {
    const plan = planStageChange(base, { stage: "qualified", appStatus: "parked" });
    expect(plan.ok && plan.patch).toEqual({ stage: "qualified", appStatus: "parked" });
  });

  it("writes nothing when nothing changes", () => {
    const current = { track: "grant" as const, stage: "loi", appStatus: "preparing" as const };
    expect(planStageChange(current, { stage: "loi" })).toEqual({ ok: true, patch: {}, history: null });
  });
});

describe("packet lint and counts", () => {
  const confirmed = new Set<string>();

  it("normalizes a body the way a portal receives it", () => {
    expect(normalizeBody("  one\r\ntwo\r\n  ")).toBe("one\ntwo");
  });

  it("lints a draft against its question's limits and skips an empty one", () => {
    expect(lintQuestion({ answerDraft: "", charLimit: 10, wordLimit: null }, confirmed)).toBeNull();
    const lint = lintQuestion({ answerDraft: "x".repeat(12), charLimit: 10, wordLimit: null }, confirmed);
    expect(lint?.errors.join(" ")).toContain("(cut 2)");
  });

  it("counts answered, missing, over-limit, errors and warnings", () => {
    const rows = [
      { isRequired: true, answerDraft: "fine", charLimit: 100, wordLimit: null },
      { isRequired: true, answerDraft: "", charLimit: 100, wordLimit: null },
      { isRequired: false, answerDraft: "x".repeat(20), charLimit: 10, wordLimit: null },
      { isRequired: true, answerDraft: `a dash${EM_DASH}here and 66 projects`, charLimit: null, wordLimit: null },
    ];
    const lints = rows.map((r) => lintQuestion(r, confirmed));
    expect(summarizePacket(rows, lints)).toEqual({
      questions: 4,
      required: 3,
      answered: 3,
      requiredMissing: 1,
      overLimit: 1,
      withErrors: 2,
      withWarnings: 1,
    });
  });

  it("lints each answer-bank body against its target length", () => {
    const lint = lintAnswerBodies({ bodyShort: "x".repeat(60), body150: null, body500: "We are raising $X.", bodyLong: "" }, confirmed);
    expect(lint.short?.errors.join(" ")).toContain("limit 50");
    expect(lint["500"]?.errors.join(" ")).toContain("placeholder");
    expect(lint.long).toBeUndefined();
  });
});

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("fundingKit router", () => {
  const PLAYER = { id: 9, role: "user" } as unknown as TrpcContext["user"];
  const GATE = { code: expect.stringMatching(/^(UNAUTHORIZED|FORBIDDEN)$/) };

  it("refuses anonymous callers and non-admins on every procedure, at the admin gate", async () => {
    for (const user of [null, PLAYER]) {
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(caller.fundingKit.programs()).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.packet({ programKey: "pearx_w27" })).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.saveDraft({ questionId: 1, answerDraft: "x" })).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.draftHistory({ questionId: 1 })).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.answers()).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.approveAnswer({ id: 1 })).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.useAnswer({ questionId: 1, answerId: 1, variant: "long" })).rejects.toMatchObject(GATE);
      await expect(caller.fundingKit.answerHistory({ answerId: 1 })).rejects.toMatchObject(GATE);
      await expect(
        caller.fundingKit.saveAnswer({ slug: "what-we-do", canonicalQuestion: "What do you do?", bodies: { short: "x" } }),
      ).rejects.toMatchObject(GATE);
    }
  });

  it("refuses a malformed program key before any query", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "admin" } as unknown as TrpcContext["user"]));
    await expect(caller.fundingKit.packet({ programKey: "../../etc" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
