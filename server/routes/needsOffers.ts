/**
 * Needs and Offers board (Phase B2, improvement 10): plain board first.
 *
 * Public reads list only board-sourced posts and never expose contact emails.
 * Form-sourced rows (source != "board") participate in the deterministic
 * matcher but stay off the public board; their authors wrote them inside an
 * application, not on a public surface. Matching + introduction emails live
 * in server/jobs/needsOffersMatcher.ts.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, rateLimited } from "../_core/trpc";
import { getDb } from "../db";
import { sanitizeInput } from "../_core/security";
import { bioregions, playerOffers, projectNeeds, users } from "../../drizzle/schema";
import { normalizeTags } from "../lib/needsOffers";

const postInput = z.object({
  title: z.string().min(3).max(200),
  body: z.string().max(5000).optional(),
  tags: z.array(z.string().min(2).max(100)).min(1).max(10),
  bioregionId: z.number().int().positive().nullable().optional(),
  timeWindow: z.string().max(200).optional(),
});

const listInput = z.object({
  kind: z.enum(["needs", "offers"]),
  bioregionId: z.number().int().positive().optional(),
  tag: z.string().max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const needsOffersRouter = router({
  /** Browse the public board. Board-sourced, open or matched, no emails. */
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const table = input.kind === "needs" ? projectNeeds : playerOffers;

    const conditions = [eq(table.source, "board"), inArray(table.status, ["open", "matched"])];
    if (input.bioregionId) conditions.push(eq(table.bioregionId, input.bioregionId));

    const rows = await db
      .select({
        id: table.id,
        title: table.title,
        body: table.body,
        tags: table.tags,
        bioregionId: table.bioregionId,
        bioregionName: bioregions.name,
        timeWindow: table.timeWindow,
        status: table.status,
        createdAt: table.createdAt,
        posterName: users.name,
        posterHandle: users.handle,
      })
      .from(table)
      .leftJoin(bioregions, eq(bioregions.id, table.bioregionId))
      .leftJoin(users, eq(users.id, table.ownerId))
      .where(and(...conditions))
      .orderBy(desc(table.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const tagFilter = input.tag?.trim().toLowerCase();
    const normalized = rows.map((r) => ({ ...r, tags: normalizeTags(r.tags) }));
    return tagFilter ? normalized.filter((r) => r.tags.includes(tagFilter)) : normalized;
  }),

  /** Post a need. Signed in (Friend tier). */
  postNeed: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(postInput)
    .mutation(async ({ ctx, input }) => insertBoardPost(projectNeeds, ctx.user.id, input)),

  /** Post an offer. Signed in (Friend tier). */
  postOffer: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(postInput)
    .mutation(async ({ ctx, input }) => insertBoardPost(playerOffers, ctx.user.id, input)),

  /** The signed-in player's own posts, both kinds, all statuses. */
  myPosts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { needs: [], offers: [] };
    const [needs, offers] = await Promise.all([
      db.select().from(projectNeeds).where(eq(projectNeeds.ownerId, ctx.user.id)).orderBy(desc(projectNeeds.createdAt)),
      db.select().from(playerOffers).where(eq(playerOffers.ownerId, ctx.user.id)).orderBy(desc(playerOffers.createdAt)),
    ]);
    const strip = (r: typeof needs[number]) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      tags: normalizeTags(r.tags),
      bioregionId: r.bioregionId,
      timeWindow: r.timeWindow,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt,
    });
    return { needs: needs.map(strip), offers: offers.map(strip) };
  }),

  /** Close your own post; the matcher stops considering it. */
  close: protectedProcedure
    .input(z.object({ kind: z.enum(["need", "offer"]), id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const table = input.kind === "need" ? projectNeeds : playerOffers;
      const [row] = await db.select().from(table).where(eq(table.id, input.id)).limit(1);
      if (!row || row.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
      }
      await db.update(table).set({ status: "closed" }).where(eq(table.id, input.id));
      return { ok: true };
    }),
});

async function insertBoardPost(
  table: typeof projectNeeds | typeof playerOffers,
  ownerId: number,
  input: z.infer<typeof postInput>,
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const tags = normalizeTags(input.tags);
  if (tags.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one tag so the board can match you." });
  }
  if (input.bioregionId) {
    const [bioregion] = await db
      .select({ id: bioregions.id })
      .from(bioregions)
      .where(and(eq(bioregions.id, input.bioregionId), eq(bioregions.approved, 1)))
      .limit(1);
    if (!bioregion) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a bioregion from the list." });
  }
  await db.insert(table).values({
    ownerId,
    title: sanitizeInput(input.title),
    body: input.body ? sanitizeInput(input.body) : null,
    tags,
    bioregionId: input.bioregionId ?? null,
    timeWindow: input.timeWindow ? sanitizeInput(input.timeWindow) : null,
    source: "board",
  });
  return { ok: true };
}
