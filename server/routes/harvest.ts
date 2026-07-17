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
          .limit(20);
        const lastGeneration = runs.find((r) => r.kind === "generation")?.ranAt ?? null;
        const lastBridge = runs.find((r) => r.kind === "bridge" || r.kind === "seed")?.ranAt ?? null;

        return {
          ready: true,
          threshold: RIPENESS_THRESHOLD,
          ideas,
          drafts,
          status: {
            lastGeneration,
            lastBridge,
            generationStale: lastGeneration ? Date.now() - lastGeneration.getTime() > 2 * 60 * 60 * 1000 : true,
            lastStats: runs[0]?.stats ?? null,
          },
        };
      } catch (err) {
        if (isMissingTableError(err)) {
          return { ready: false, threshold: RIPENESS_THRESHOLD, ideas: [], drafts: [], status: { lastGeneration: null, lastBridge: null, generationStale: true, lastStats: null } };
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

  /** Save an in-place edit. ai_body stays untouched for Phase 3. */
  editItem: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 60 }))
    .input(z.object({ itemId: z.number().int().positive(), body: z.string().min(1).max(60000) }))
    .mutation(async ({ ctx, input }) => {
      const item = await getOwnedItem(ctx.user.id, input.itemId);
      const db = await requireDb();
      await db.update(creationItems)
        .set({ body: input.body, status: item.status === "shipped" ? "shipped" : "edited" })
        .where(eq(creationItems.id, item.id));
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
});
