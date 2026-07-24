/**
 * adminFunding router - the funding pipeline portal + application engine.
 *
 * Part 1 is a tracker over `funding_pipeline`: the 117 funder rows researched
 * and source-verified on 2026-07-24, with the working columns (app status,
 * owner, next action) Rye edits in /admin/funding.
 *
 * Part 2 is the application engine. `generateApplication` takes one pipeline
 * row, runs it through the positioning kernel (server/funding/positioning-
 * kernel.ts), and returns a positioning summary plus a standalone Cowork prompt
 * that executes the application process in a separate session.
 *
 * Security posture (BUILD-PLAYBOOK: new procedures + a new LLM feature):
 *  - Every procedure is adminProcedure, so CSRF protection and the admin role
 *    check both apply. Nothing here is reachable by a normal user.
 *  - generateApplication is rate-limited per IP at 10 per 15 minutes
 *    (funding_generate in server/rate-limit.ts). Each run is one complex-tier
 *    LLM call, so the cap bounds both spend and accidental loops. The global
 *    daily circuit-breaker in _core/llm.ts sits underneath it, and invokeLLM
 *    records estimated token usage against it on every call.
 *  - The model sees only pipeline row fields, which are admin-authored research
 *    text, never end-user input. There is no path from a public surface into
 *    this prompt.
 *  - The server never contacts a funder's website and never submits anything.
 *    Verification at source and submission both happen with a human present.
 *    That boundary is the whole safety story for this feature: the engine
 *    prepares, humans submit.
 */
import { z } from "zod";
import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { fundingPipeline, fundingApplications } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { invokeLLM, extractJsonObject, isLLMConfigured } from "../_core/llm";
import {
  POSITIONING_SYSTEM_PROMPT,
  POSITIONING_OUTPUT_SCHEMA,
  POSITIONING_LLM_TASK,
  buildPositioningUserMessage,
  buildCoworkPrompt,
  stripBannedDashes,
  type FunderRowForPrompt,
  type PositioningResult,
} from "../funding/positioning-kernel";

// ── Enums, mirrored from drizzle/0215_funding_pipeline.sql ───────────────────
export const PRIORITIES = ["P1", "P2", "P3", "ADV", "ALLY"] as const;
export const APP_STATUSES = [
  "not_started",
  "researching",
  "preparing",
  "cultivating",
  "submitted",
  "in_review",
  "awarded",
  "declined",
  "parked",
] as const;

const prioritySchema = z.enum(PRIORITIES);
const appStatusSchema = z.enum(APP_STATUSES);

/**
 * Statuses the engine is allowed to advance on its own. A row that is already
 * cultivating, submitted, in_review, awarded, declined, or parked keeps its
 * status: generating a fresh positioning is not a reason to walk a submitted
 * application backwards, or to reopen a declined one.
 */
const AUTO_ADVANCE_FROM: ReadonlySet<string> = new Set(["not_started", "researching"]);

/** Priority sort order for the default listing: P1 first, allies last. */
const PRIORITY_RANK = sql`FIELD(${fundingPipeline.priority}, 'P1', 'P2', 'P3', 'ADV', 'ALLY')`;

/**
 * Rows carrying a real next-action date come before rows without one, earliest
 * first. Inside a priority band that puts the dated work at the top, which is
 * the order Rye actually works the list in.
 */
const DATED_FIRST = sql`CASE WHEN ${fundingPipeline.nextActionDate} IS NULL THEN 1 ELSE 0 END`;

function requireDb() {
  return getDb().then((db) => {
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    return db;
  });
}

/** YYYY-MM-DD in UTC, for the generated filename in the Cowork prompt. */
function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? stripBannedDashes(v).trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, 20);
}

/**
 * Accept a model response only when every field is present and usable. A short
 * positioningSummary or an empty keyPoints array means the generation did not
 * do the job, so it is a retry rather than something to store as a success.
 */
function parsePositioning(raw: string): PositioningResult | null {
  const obj = extractJsonObject(raw);
  if (!obj) return null;

  // Every generated field is scrubbed of em-dashes and en-dashes here, before
  // length checks, so what gets validated is what gets stored.
  const summary = typeof obj.positioningSummary === "string" ? stripBannedDashes(obj.positioningSummary).trim() : "";
  const entity = typeof obj.entityToUse === "string" ? stripBannedDashes(obj.entityToUse).trim() : "";
  const keyPoints = asStringArray(obj.keyPoints);
  const prompt = typeof obj.coworkPrompt === "string" ? stripBannedDashes(obj.coworkPrompt).trim() : "";

  if (summary.length < 200 || keyPoints.length < 3 || !entity) return null;

  return {
    positioningSummary: summary,
    keyPoints,
    entityToUse: entity,
    flags: asStringArray(obj.flags),
    coworkPrompt: prompt,
  };
}

/** Exposed for tests. Not part of the router surface. */
export const _adminFundingInternals = { parsePositioning, asStringArray, AUTO_ADVANCE_FROM };

export const adminFundingRouter = router({
  /**
   * The pipeline listing. Default sort is priority band, then dated next
   * actions ascending, then the compiled research order, then name.
   */
  list: adminProcedure
    .input(
      z
        .object({
          priority: prioritySchema.optional(),
          appStatus: appStatusSchema.optional(),
          category: z.string().max(120).optional(),
          search: z.string().max(200).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input?.priority) conditions.push(eq(fundingPipeline.priority, input.priority));
      if (input?.appStatus) conditions.push(eq(fundingPipeline.appStatus, input.appStatus));
      if (input?.category) conditions.push(eq(fundingPipeline.category, input.category));

      const search = input?.search?.trim();
      if (search) {
        // LIKE escaping: % and _ are wildcards, so a search for "50%" must not
        // match everything.
        const term = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        const searchClause = or(
          like(fundingPipeline.name, term),
          like(fundingPipeline.category, term),
          like(fundingPipeline.notes, term),
          like(fundingPipeline.whatItFunds, term),
          like(fundingPipeline.regenEntity, term),
          like(fundingPipeline.nextAction, term)
        );
        if (searchClause) conditions.push(searchClause);
      }

      const rows = await db
        .select()
        .from(fundingPipeline)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          PRIORITY_RANK,
          DATED_FIRST,
          asc(fundingPipeline.nextActionDate),
          asc(fundingPipeline.sortOrder),
          asc(fundingPipeline.name)
        );

      return rows;
    }),

  /** Distinct categories, for the filter bar. */
  categories: adminProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .selectDistinct({ category: fundingPipeline.category })
      .from(fundingPipeline)
      .orderBy(asc(fundingPipeline.category));
    return rows.map((r) => r.category).filter(Boolean);
  }),

  /** Counts by priority and by app status, plus the two headline numbers. */
  stats: adminProcedure.query(async () => {
    const db = await requireDb();

    const byPriorityRows = await db
      .select({ priority: fundingPipeline.priority, n: sql<number>`COUNT(*)` })
      .from(fundingPipeline)
      .groupBy(fundingPipeline.priority);

    const byStatusRows = await db
      .select({ appStatus: fundingPipeline.appStatus, n: sql<number>`COUNT(*)` })
      .from(fundingPipeline)
      .groupBy(fundingPipeline.appStatus);

    const byPriority: Record<string, number> = {};
    for (const p of PRIORITIES) byPriority[p] = 0;
    for (const r of byPriorityRows) byPriority[r.priority] = Number(r.n);

    const byStatus: Record<string, number> = {};
    for (const s of APP_STATUSES) byStatus[s] = 0;
    for (const r of byStatusRows) byStatus[r.appStatus] = Number(r.n);

    const total = Object.values(byPriority).reduce((a, b) => a + b, 0);

    return {
      total,
      byPriority,
      byStatus,
      submitted: byStatus.submitted + byStatus.in_review,
      awarded: byStatus.awarded,
    };
  }),

  /**
   * Partial update of the working columns. Every call stamps lastTouch, which
   * is the point: the column records when Rye last moved this funder, not when
   * a field happened to change.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        appStatus: appStatusSchema.optional(),
        priority: prioritySchema.optional(),
        owner: z.string().max(120).nullable().optional(),
        nextAction: z.string().max(500).nullable().optional(),
        nextActionDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .nullable()
          .optional(),
        notes: z.string().max(20000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;

      const patch: Record<string, unknown> = { lastTouch: new Date() };
      for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) continue;
        patch[key] = typeof value === "string" && value.trim() === "" ? null : value;
      }

      await db.update(fundingPipeline).set(patch).where(eq(fundingPipeline.id, id));

      const [row] = await db
        .select()
        .from(fundingPipeline)
        .where(eq(fundingPipeline.id, id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Funder row not found" });
      return row;
    }),

  /** Add a funder the research pass missed. */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        category: z.string().min(1).max(120),
        capitalType: z.string().max(255).optional(),
        whatItFunds: z.string().max(20000).optional(),
        typicalSize: z.string().max(160).optional(),
        geography: z.string().max(160).optional(),
        eligibility: z.string().max(20000).optional(),
        accessStatus: z.string().max(255).optional(),
        deadline: z.string().max(160).optional(),
        fit: z.string().max(120).optional(),
        regenEntity: z.string().max(255).optional(),
        link: z.string().max(500).optional(),
        notes: z.string().max(20000).optional(),
        priority: prioritySchema.default("P2"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [existing] = await db
        .select({ id: fundingPipeline.id })
        .from(fundingPipeline)
        .where(eq(fundingPipeline.name, input.name))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A funder with that name is already in the pipeline" });
      }

      await db.insert(fundingPipeline).values({ ...input, lastTouch: new Date() });

      const [row] = await db
        .select()
        .from(fundingPipeline)
        .where(eq(fundingPipeline.name, input.name))
        .limit(1);
      return row;
    }),

  /** Remove a row. Its generation history goes with it (FK ON DELETE CASCADE). */
  remove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(fundingPipeline).where(eq(fundingPipeline.id, input.id));
      return { ok: true };
    }),

  /** Generation history for one funder, newest first. */
  getApplications: adminProcedure
    .input(z.object({ pipelineId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(fundingApplications)
        .where(eq(fundingApplications.pipelineId, input.pipelineId))
        .orderBy(desc(fundingApplications.createdAt))
        .limit(20);
    }),

  /**
   * Run the positioning kernel against one funder row.
   *
   * One complex-tier LLM call, one retry on a response that fails validation.
   * If both attempts fail, the raw text is stored with a "generation_unvalidated"
   * flag rather than discarded: a bad generation is evidence for tuning the
   * kernel, and losing it silently would hide the failure.
   *
   * The Cowork prompt is rebuilt server-side whenever the model's version comes
   * back missing or stripped of its process steps, so the funder record and the
   * five-step process never depend on the model copying them correctly.
   */
  generateApplication: adminProcedure
    .input(z.object({ pipelineId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "funding_generate");

      if (!isLLMConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No LLM provider is configured, so positioning cannot be generated.",
        });
      }

      const db = await requireDb();
      const [row] = await db
        .select()
        .from(fundingPipeline)
        .where(eq(fundingPipeline.id, input.pipelineId))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Funder row not found" });

      const today = todayYmd();
      const funder: FunderRowForPrompt = row;
      const userMessage = buildPositioningUserMessage(funder, today);

      let parsed: PositioningResult | null = null;
      let rawText = "";
      let modelUsed = "";

      for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
        try {
          const result = await invokeLLM({
            messages: [
              { role: "system", content: POSITIONING_SYSTEM_PROMPT },
              {
                role: "user",
                content:
                  attempt === 0
                    ? userMessage
                    : `${userMessage}\n\nYour previous response could not be parsed as the required JSON object, or a required field was missing or too short. Return ONLY the JSON object, with every field present, positioningSummary at 150 to 250 words, and at least five keyPoints.`,
              },
            ],
            maxTokens: 4000,
            task: POSITIONING_LLM_TASK,
            outputSchema: POSITIONING_OUTPUT_SCHEMA as never,
          });
          rawText = result.choices?.[0]?.message?.content ?? "";
          modelUsed = result.model ?? "";
          parsed = parsePositioning(rawText);
        } catch (err) {
          console.error(
            `[admin-funding] positioning attempt ${attempt + 1} failed for "${row.name}"`,
            err
          );
          if (attempt === 1) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "The positioning generator is unavailable right now. Try again in a few minutes.",
            });
          }
        }
      }

      // Both attempts came back unusable. Keep the raw text, flag it, and let
      // Rye see what the model actually said.
      if (!parsed) {
        console.error(`[admin-funding] positioning unvalidated after 2 attempts for "${row.name}"`);
        const fallbackSummary = stripBannedDashes(rawText).trim() || "(the model returned nothing)";
        await db.insert(fundingApplications).values({
          pipelineId: row.id,
          positioningSummary: fallbackSummary.slice(0, 60000),
          keyPoints: [],
          entityToUse: row.regenEntity ?? null,
          flags: ["generation_unvalidated"],
          coworkPrompt: buildCoworkPrompt(
            funder,
            {
              positioningSummary: "(generation failed validation, write the positioning yourself)",
              keyPoints: [],
              entityToUse: row.regenEntity ?? "",
              flags: ["generation_unvalidated"],
            },
            today
          ),
          modelUsed: modelUsed.slice(0, 120) || null,
          generatedBy: ctx.user.id,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "The generation came back in a shape we could not use. The raw output is saved on this funder's history, flagged generation_unvalidated. Try regenerating.",
        });
      }

      // Rebuild the prompt server-side when the model's version is missing or
      // dropped the process steps. The five steps are the whole point of it.
      const modelPrompt = parsed.coworkPrompt;
      const promptIsUsable =
        modelPrompt.length > 400 &&
        modelPrompt.includes("Do not submit anything yourself") &&
        !modelPrompt.includes("{{");
      const coworkPrompt = promptIsUsable ? modelPrompt : buildCoworkPrompt(funder, parsed, today);

      await db.insert(fundingApplications).values({
        pipelineId: row.id,
        positioningSummary: parsed.positioningSummary.slice(0, 60000),
        keyPoints: parsed.keyPoints,
        entityToUse: parsed.entityToUse.slice(0, 255),
        flags: parsed.flags,
        coworkPrompt,
        modelUsed: modelUsed.slice(0, 120) || null,
        generatedBy: ctx.user.id,
      });

      const [generation] = await db
        .select()
        .from(fundingApplications)
        .where(eq(fundingApplications.pipelineId, row.id))
        .orderBy(desc(fundingApplications.id))
        .limit(1);

      // Advance the row only from the two statuses where "preparing" is news.
      const patch: Record<string, unknown> = {
        lastTouch: new Date(),
        nextAction: "Review positioning + run Cowork prompt",
      };
      if (AUTO_ADVANCE_FROM.has(row.appStatus)) patch.appStatus = "preparing";
      await db.update(fundingPipeline).set(patch).where(eq(fundingPipeline.id, row.id));

      return generation;
    }),
});
