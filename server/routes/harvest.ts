/**
 * harvest router: The Harvest feed at /admin-create (Phase 2).
 *
 * Everything is ownerProcedure (Rye's private creation pipeline, never
 * adminProcedure) and every query filters by owner_id from the session.
 * Develop is the primary verb: it drafts immediately for the channels Rye
 * picked. The generation worker handles hourly transitions; regenerate
 * redrafts one item (and never counts as a voice edit); editItem preserves
 * ai_body so Phase 3 can learn from the (ai_body, body) pair.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ownerProcedure, rateLimited, router } from "../_core/trpc";
import { getDb } from "../db";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { creationItems, harvestIdeas, harvestRuns, sourceIndex } from "../../drizzle/schema";
import { draftChannel, upsertDraft, runGeneration, HARVEST_CHANNELS, RIPENESS_THRESHOLD, type HarvestChannel } from "../lib/harvest";

const channelEnum = z.enum(HARVEST_CHANNELS);

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table/i.test(msg);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function getOwnedIdea(ownerId: number, ideaId: number) {
  const db = await requireDb();
  const [idea] = await db
    .select()
    .from(harvestIdeas)
    .where(and(eq(harvestIdeas.ownerId, ownerId), eq(harvestIdeas.id, ideaId)))
    .limit(1);
  if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });
  return idea;
}

async function getOwnedItem(ownerId: number, itemId: number) {
  const db = await requireDb();
  const [item] = await db
    .select()
    .from(creationItems)
    .where(and(eq(creationItems.ownerId, ownerId), eq(creationItems.id, itemId)))
    .limit(1);
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
  return item;
}

export const harvestRouter = router({
  /** The feed: ripe ideas (with why-now + score components) and drafts. */
  listFeed: ownerProcedure
    .input(z.object({ tier: z.enum(["ideas", "drafts", "all"]).default("all") }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const tier = input?.tier ?? "all";
        const now = new Date();

        const ideas = tier === "drafts" ? [] : (await db
          .select()
          .from(harvestIdeas)
          .where(and(eq(harvestIdeas.ownerId, ctx.user.id), eq(harvestIdeas.status, "ripe")))
          .orderBy(desc(harvestIdeas.ripeness))
          .limit(60))
          .filter((i) => !i.snoozedUntil || i.snoozedUntil < now);

        const drafts = tier === "ideas" ? [] : await db
          .select()
          .from(creationItems)
          .where(eq(creationItems.ownerId, ctx.user.id))
          .orderBy(desc(creationItems.updatedAt))
          .limit(120);

        const runs = await db
          .select()
          .from(harvestRuns)
          .orderBy(desc(harvestRuns.ranAt))
          .limit(40);
        const lastGeneration = runs.find((r) => r.kind === "generation")?.ranAt ?? null;
        const lastBridge = runs.find((r) => r.kind === "bridge" || r.kind === "seed")?.ranAt ?? null;
        const lastDigest = runs.find((r) => r.kind === "digest")?.ranAt ?? null;

        let lastSend: Date | null = null;
        try {
          const { harvestEmailSends } = await import("../../drizzle/schema");
          const [send] = await db.select({ createdAt: harvestEmailSends.createdAt })
            .from(harvestEmailSends)
            .where(and(eq(harvestEmailSends.ownerId, ctx.user.id), eq(harvestEmailSends.status, "sent")))
            .orderBy(desc(harvestEmailSends.createdAt))
            .limit(1);
          lastSend = send?.createdAt ?? null;
        } catch {
          // Send table not migrated yet; the status line just omits it.
        }

        return {
          ready: true,
          threshold: RIPENESS_THRESHOLD,
          ideas,
          drafts,
          status: {
            lastGeneration,
            lastBridge,
            lastDigest,
            lastSend,
            generationStale: lastGeneration ? Date.now() - lastGeneration.getTime() > 2 * 60 * 60 * 1000 : true,
            lastStats: runs[0]?.stats ?? null,
          },
        };
      } catch (err) {
        if (isMissingTableError(err)) {
          return { ready: false, threshold: RIPENESS_THRESHOLD, ideas: [], drafts: [], status: { lastGeneration: null, lastBridge: null, lastDigest: null, lastSend: null, generationStale: true, lastStats: null } };
        }
        throw err;
      }
    }),

  /** Develop: immediate generation for one idea across chosen channels. */
  develop: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({
      ideaId: z.number().int().positive(),
      channels: z.array(channelEnum).min(1).max(6),
      angle: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const idea = await getOwnedIdea(ctx.user.id, input.ideaId);
      const db = await requireDb();
      const created: number[] = [];
      for (const channel of input.channels) {
        const { body } = await draftChannel(idea, channel as HarvestChannel, { angle: input.angle });
        const itemId = await upsertDraft(idea, channel as HarvestChannel, body, input.angle);
        if (itemId) created.push(itemId);
      }
      await db.update(harvestIdeas)
        .set({ status: "developed", draftedAt: new Date() })
        .where(eq(harvestIdeas.id, idea.id));
      const rows = created.length > 0
        ? await db.select().from(creationItems).where(inArray(creationItems.id, created))
        : [];
      return { items: rows };
    }),

  /** Redraft one item with an optional nudge. Never counts as a voice edit. */
  regenerate: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({ itemId: z.number().int().positive(), nudge: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      if (item.status === "shipped") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This item already shipped; regenerating it would rewrite history." });
      }
      const db = await requireDb();
      const [idea] = item.ideaId
        ? await db.select().from(harvestIdeas).where(and(eq(harvestIdeas.ownerId, ctx.user.id), eq(harvestIdeas.id, item.ideaId))).limit(1)
        : [];
      if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "The idea behind this item is gone" });
      const { body } = await draftChannel(idea, item.channel as HarvestChannel, { angle: item.angle ?? undefined, nudge: input.nudge });
      // A regeneration resets the pair: ai_body and body move together and
      // status returns to ready (it was never an edit).
      await db.update(creationItems)
        .set({ aiBody: body, body, status: "ready" })
        .where(eq(creationItems.id, item.id));
      return { ...item, aiBody: body, body, status: "ready" as const };
    }),

  /**
   * Save an in-place edit. ai_body stays untouched, and the (ai_body, body)
   * pair feeds the learning loop with Rye's one-tap style/content call
   * (default content, the safer choice). Learning runs fire-and-forget; a
   * save never waits on a model.
   */
  editItem: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 60 }))
    .input(z.object({
      itemId: z.number().int().positive(),
      body: z.string().min(1).max(60000),
      editKind: z.enum(["style", "content"]).default("content"),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      const db = await requireDb();
      await db.update(creationItems)
        .set({ body: input.body, status: item.status === "shipped" ? "shipped" : "edited" })
        .where(eq(creationItems.id, item.id));

      if (item.aiBody && item.aiBody !== input.body) {
        const { processEdit } = await import("../lib/voice-learning");
        void processEdit({
          ownerId: ctx.user.id,
          itemId: item.id,
          channel: item.channel,
          aiVersion: item.aiBody,
          editedVersion: input.body,
          editKind: input.editKind,
        }).catch(() => undefined);
      }
      return { ok: true };
    }),

  /** The learned rules, weightiest first (the Voice rules screen's read). */
  listRules: ownerProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const { voiceRules } = await import("../../drizzle/schema");
    try {
      const rows = await db.select().from(voiceRules)
        .where(eq(voiceRules.ownerId, ctx.user.id))
        .orderBy(desc(voiceRules.weight))
        .limit(200);
      return { rules: rows };
    } catch (err) {
      if (isMissingTableError(err)) return { rules: [] };
      throw err;
    }
  }),

  /** Edit or demote one learned rule. Hard rules are not rows; they cannot be touched here. */
  updateRule: ownerProcedure
    .input(z.object({
      ruleId: z.number().int().positive(),
      rule: z.string().min(8).max(400).optional(),
      weight: z.number().min(0.1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { voiceRules } = await import("../../drizzle/schema");
      const set: Record<string, unknown> = {};
      if (input.rule !== undefined) {
        const { validateCandidateRule } = await import("../lib/voice-learning");
        // Category unchanged; validate the new text against the same screens.
        const [row] = await db.select().from(voiceRules)
          .where(and(eq(voiceRules.ownerId, ctx.user.id), eq(voiceRules.id, input.ruleId))).limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
        const problem = validateCandidateRule(row.category, input.rule);
        if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: `That edit would break the guardrails: ${problem}` });
        set.rule = input.rule;
      }
      if (input.weight !== undefined) set.weight = input.weight;
      if (Object.keys(set).length === 0) return { ok: true };
      await db.update(voiceRules)
        .set(set)
        .where(and(eq(voiceRules.ownerId, ctx.user.id), eq(voiceRules.id, input.ruleId)));
      return { ok: true };
    }),

  deleteRule: ownerProcedure
    .input(z.object({ ruleId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { voiceRules } = await import("../../drizzle/schema");
      await db.delete(voiceRules)
        .where(and(eq(voiceRules.ownerId, ctx.user.id), eq(voiceRules.id, input.ruleId)));
      return { ok: true };
    }),

  /** Mark shipped; optionally capture the final posted text (cleanest voice signal). */
  markPosted: ownerProcedure
    .input(z.object({
      itemId: z.number().int().positive(),
      postedText: z.string().max(60000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      const db = await requireDb();
      await db.update(creationItems)
        .set({ status: "shipped", postedAt: new Date(), postedText: input.postedText ?? null })
        .where(eq(creationItems.id, item.id));
      return { ok: true };
    }),

  /** Hide an idea for N days. */
  snooze: ownerProcedure
    .input(z.object({ ideaId: z.number().int().positive(), days: z.number().int().min(1).max(90).default(7) }))
    .mutation(async ({ ctx, input }) => {
      const idea = await getOwnedIdea(ctx.user.id, input.ideaId);
      const db = await requireDb();
      const until = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
      await db.update(harvestIdeas)
        .set({ status: "snoozed", snoozedUntil: until })
        .where(eq(harvestIdeas.id, idea.id));
      return { ok: true, until };
    }),

  /** Suppress an idea permanently (a negative signal into ripeness). */
  notThis: ownerProcedure
    .input(z.object({ ideaId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await getOwnedIdea(ctx.user.id, input.ideaId);
      const db = await requireDb();
      await db.update(harvestIdeas)
        .set({ status: "suppressed" })
        .where(eq(harvestIdeas.id, idea.id));
      return { ok: true };
    }),

  /** A standing steer note that future drafting for this idea always sees. */
  steer: ownerProcedure
    .input(z.object({ ideaId: z.number().int().positive(), text: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const idea = await getOwnedIdea(ctx.user.id, input.ideaId);
      const db = await requireDb();
      await db.update(harvestIdeas)
        .set({ steer: input.text })
        .where(eq(harvestIdeas.id, idea.id));
      return { ok: true };
    }),

  /** Provenance: the raw source rows, merged link tree, and related refs. */
  getSource: ownerProcedure
    .input(z.object({ itemId: z.number().int().positive().optional(), ideaId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      let refs: string[] = [];
      let ideaTitle = "";
      if (input.itemId) {
        const item = await getOwnedItem(ctx.user.id, input.itemId);
        refs = Array.isArray(item.sourceRefs) ? (item.sourceRefs as unknown[]).filter((r): r is string => typeof r === "string") : [];
        if (item.ideaId) {
          const [idea] = await db.select({ title: harvestIdeas.title }).from(harvestIdeas)
            .where(and(eq(harvestIdeas.ownerId, ctx.user.id), eq(harvestIdeas.id, item.ideaId))).limit(1);
          ideaTitle = idea?.title ?? "";
        }
      } else if (input.ideaId) {
        const idea = await getOwnedIdea(ctx.user.id, input.ideaId);
        refs = Array.isArray(idea.sourceRefs) ? (idea.sourceRefs as unknown[]).filter((r): r is string => typeof r === "string") : [];
        ideaTitle = idea.title;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "itemId or ideaId required" });
      }

      // Split refs: sm-*/uuid rows live in source_index; note refs (path-like)
      // are vault-local and render as jump links only.
      const rowRefs = refs.filter((r) => !r.includes("/"));
      const noteRefs = refs.filter((r) => r.includes("/"));
      const rows = rowRefs.length > 0
        ? await db.select().from(sourceIndex)
            .where(and(eq(sourceIndex.ownerId, ctx.user.id), inArray(sourceIndex.refId, rowRefs.slice(0, 50))))
        : [];

      const linkTree = Array.from(new Set(rows.flatMap((r) => (Array.isArray(r.links) ? (r.links as unknown[]).filter((l): l is string => typeof l === "string") : []))));
      return { ideaTitle, sources: rows, linkTree, noteRefs };
    }),

  /** Manual Refresh: run one generation pass now. */
  refresh: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 3 }))
    .mutation(async () => {
      const stats = await runGeneration();
      return { ok: true, stats };
    }),

  /**
   * Email send, step 1 of 2: the preview. Returns the rendered email, the
   * live recipient count, and a signed confirm token bound to the exact body
   * hash. Refuses raw drafts (only status 'edited' qualifies).
   */
  sendPreview: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({ itemId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      const { buildSendPreview } = await import("../lib/harvest-email");
      try {
        return await buildSendPreview({ id: item.id, channel: item.channel, status: item.status, body: item.body });
      } catch (err) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: err instanceof Error ? err.message : "Preview failed" });
      }
    }),

  /**
   * Email send, step 2 of 2: the confirmed send. Requires the preview's
   * token back; hash mismatch, caps, and idempotency are enforced in
   * server/lib/harvest-email.ts against the durable audit table.
   */
  confirmSend: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(z.object({
      itemId: z.number().int().positive(),
      confirmToken: z.string().min(20).max(2000),
      idempotencyKey: z.string().min(8).max(64),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      const { confirmAndSend } = await import("../lib/harvest-email");
      try {
        return await confirmAndSend({
          ownerId: ctx.user.id,
          item: { id: item.id, channel: item.channel, status: item.status, body: item.body, aiBody: item.aiBody },
          confirmToken: input.confirmToken,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (err) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: err instanceof Error ? err.message : "Send refused" });
      }
    }),
});
