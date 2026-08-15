/**
 * Gov Proposals tRPC router.
 * Handles the full proposal lifecycle: Draft -> Discussion -> Polling -> Staged -> Hypha.
 * Sprint 2 of the governance app build.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, or, desc, sql, count, notInArray } from "drizzle-orm";
import { govProposals, govComments, govVotes, users } from "../../drizzle/schema";
import { isAdminUser } from "../lib/public-projection";
import type { TrpcContext } from "../_core/context";

/**
 * Statuses a proposal is not published in.
 *
 * A draft is the author still writing. A withdrawn proposal is the author
 * taking it back. `body` is the whole argument, so returning either to
 * anyone who asks publishes text its author has not published, and in the
 * withdrawn case has actively retracted.
 */
export const UNPUBLISHED_PROPOSAL_STATUSES = ["draft", "withdrawn"] as const;

/**
 * What a vote looks like to anyone who is not an admin: the stance and its
 * reason, with no way to attribute either. See `listVotes` below for why.
 */
export const PUBLIC_GOV_VOTE_COLUMNS = {
  id: govVotes.id,
  proposalId: govVotes.proposalId,
  stance: govVotes.stance,
  reason: govVotes.reason,
  createdAt: govVotes.createdAt,
} as const;

/**
 * Restrict a proposal query to what this caller may see: everything for an
 * admin, published statuses plus the caller's own rows for a signed-in
 * member, published statuses only for anonymous.
 */
function visibleProposalsFilter(user: TrpcContext["user"] | undefined) {
  if (isAdminUser(user)) return undefined;
  const published = notInArray(govProposals.status, [...UNPUBLISHED_PROPOSAL_STATUSES]);
  return user ? or(published, eq(govProposals.authorId, user.id)) : published;
}

export const govProposalsRouter = router({
  /** List proposals for a tenant, filtered by status. */
  list: publicProcedure
    .input(z.object({
      tenantId: z.number().int().positive().optional(),
      status: z.enum(["draft", "discussion", "polling", "staged", "sent_to_hypha", "ratified", "declined", "withdrawn"]).optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.tenantId) conditions.push(eq(govProposals.tenantId, input.tenantId));
      if (input.status) conditions.push(eq(govProposals.status, input.status));
      // Asking for status=draft no longer hands back everyone's drafts.
      const visible = visibleProposalsFilter(ctx.user);
      if (visible) conditions.push(visible);
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(govProposals).where(where).orderBy(desc(govProposals.createdAt)).limit(input.limit).offset(input.offset);
    }),

  /** Get a single proposal by ID. */
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      // Same visibility rule as list: the id is enumerable, so without this
      // every draft body was one request away.
      const visible = visibleProposalsFilter(ctx.user);
      const rows = await db
        .select()
        .from(govProposals)
        .where(visible ? and(eq(govProposals.id, input.id), visible) : eq(govProposals.id, input.id))
        .limit(1);
      if (rows.length === 0) return null;
      const proposal = rows[0];
      // Enrich with author name
      const authorRows = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, proposal.authorId)).limit(1);
      const voteRows = await db.select({ stance: govVotes.stance }).from(govVotes).where(eq(govVotes.proposalId, input.id));
      const commentCount = await db.select({ c: count() }).from(govComments).where(eq(govComments.proposalId, input.id));
      return {
        ...proposal,
        authorName: authorRows[0]?.name ?? "Anonymous",
        authorHandle: authorRows[0]?.handle ?? null,
        voteCount: voteRows.length,
        voteTally: {
          agree: voteRows.filter((v) => v.stance === "agree").length,
          disagree: voteRows.filter((v) => v.stance === "disagree").length,
          abstain: voteRows.filter((v) => v.stance === "abstain").length,
          block: voteRows.filter((v) => v.stance === "block").length,
        },
        commentCount: Number(commentCount[0]?.c ?? 0),
      };
    }),

  /** Create a new proposal (starts as draft). */
  create: protectedProcedure
    .input(z.object({
      tenantId: z.number().int().positive(),
      title: z.string().min(5).max(500),
      body: z.string().min(20),
      decisionMethod: z.enum(["consent", "advice", "consensus", "mandate"]).default("consent"),
      track: z.enum(["fund", "game", "operational"]).default("game"),
      bioregionId: z.number().int().positive().optional(),
      minDiscussionDays: z.number().int().min(1).max(30).default(3),
      pollingDurationDays: z.number().int().min(1).max(30).default(5),
      sourceForumThreadId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(govProposals).values({
        ...input,
        authorId: ctx.user.id,
        status: "draft",
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),

  /** Publish a draft (move to discussion). */
  publish: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(govProposals).where(eq(govProposals.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (rows[0].authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (rows[0].status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only publish drafts" });
      await db.update(govProposals).set({ status: "discussion", discussionOpenedAt: new Date() } as any).where(eq(govProposals.id, input.id));
      return { ok: true };
    }),

  /** Open polling on a proposal (move discussion -> polling). */
  openPolling: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(govProposals).where(eq(govProposals.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const p = rows[0];
      if (p.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (p.status !== "discussion") throw new TRPCError({ code: "BAD_REQUEST", message: "Must be in discussion" });
      // Enforce minimum discussion period
      if (p.discussionOpenedAt) {
        const daysSince = (Date.now() - new Date(p.discussionOpenedAt as any).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSince < (p.minDiscussionDays ?? 3)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Discussion period requires ${p.minDiscussionDays} days. ${Math.ceil((p.minDiscussionDays ?? 3) - daysSince)} days remaining.` });
        }
      }
      const closesAt = new Date(Date.now() + (p.pollingDurationDays ?? 5) * 24 * 60 * 60 * 1000);
      await db.update(govProposals).set({ status: "polling", pollingOpenedAt: new Date(), pollingClosesAt: closesAt } as any).where(eq(govProposals.id, input.id));
      return { ok: true, closesAt };
    }),

  /** Cast a vote on a proposal in polling status. */
  vote: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      stance: z.enum(["agree", "disagree", "abstain", "block"]),
      reason: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const proposal = await db.select().from(govProposals).where(eq(govProposals.id, input.proposalId)).limit(1);
      if (proposal.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (proposal[0].status !== "polling") throw new TRPCError({ code: "BAD_REQUEST", message: "Voting is only open during the polling phase" });
      // Block requires a reason
      if (input.stance === "block" && (!input.reason || input.reason.trim().length < 10)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Blocks must include a reason (at least 10 characters) explaining why this proposal would cause harm." });
      }
      // Upsert vote (replaces any existing vote + overrides delegation)
      try {
        await db.insert(govVotes).values({
          proposalId: input.proposalId,
          voterId: ctx.user.id,
          stance: input.stance,
          reason: input.reason ?? null,
          weight: 1,
        } as any);
      } catch (err: any) {
        if (err?.code === "ER_DUP_ENTRY") {
          await db.update(govVotes).set({
            stance: input.stance,
            reason: input.reason ?? null,
            delegatedFromId: null, // explicit vote overrides delegation
          } as any).where(and(eq(govVotes.proposalId, input.proposalId), eq(govVotes.voterId, ctx.user.id)));
        } else {
          throw err;
        }
      }
      return { ok: true };
    }),

  /** Add a comment (threaded, one level deep). */
  addComment: protectedProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      body: z.string().min(1).max(10000),
      parentId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(govComments).values({
        proposalId: input.proposalId,
        authorId: ctx.user.id,
        parentId: input.parentId ?? null,
        body: input.body,
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),

  /** List comments for a proposal (threaded). */
  listComments: publicProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const comments = await db.select().from(govComments).where(eq(govComments.proposalId, input.proposalId)).orderBy(govComments.createdAt);
      // Enrich with author names
      const authorIds = [...new Set(comments.map((c) => c.authorId))];
      const authorMap: Record<number, { name: string | null; handle: string | null }> = {};
      if (authorIds.length > 0) {
        for (const id of authorIds) {
          const rows = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, id)).limit(1);
          if (rows[0]) authorMap[id] = rows[0];
        }
      }
      return comments.map((c) => ({
        ...c,
        authorName: authorMap[c.authorId]?.name ?? "Anonymous",
        authorHandle: authorMap[c.authorId]?.handle ?? null,
      }));
    }),

  /**
   * List votes for a proposal, unattributed.
   *
   * Withheld: `voterId` (who voted), `delegatedFromId` (who delegated to
   * them, which exposes a second person per row) and `weight` (which
   * combined with the tally lets you work backwards to individuals). The
   * stance and its reason stay: in a consent process the objection text is
   * the thing the group has to answer, and it can be answered without
   * knowing whose it is.
   *
   * This follows the hub's stated posture rather than inventing one.
   * ADR-27 keeps the binding vote on Hypha and deprecates `proposal_votes`
   * precisely so ReGen Civics "never becomes a shadow voting system", and
   * ADR-28 locks the on-platform sensing signal to aggregate-only, "never a
   * vote". `govProposals.getById` already publishes a tally, not a roll
   * call. Admins still get the full rows.
   */
  listVotes: publicProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      if (isAdminUser(ctx.user)) {
        return db.select().from(govVotes).where(eq(govVotes.proposalId, input.proposalId)).orderBy(govVotes.createdAt);
      }
      return db
        .select(PUBLIC_GOV_VOTE_COLUMNS)
        .from(govVotes)
        .where(eq(govVotes.proposalId, input.proposalId))
        .orderBy(govVotes.createdAt);
    }),

  /** Withdraw a proposal (author only, any status before ratified). */
  withdraw: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(govProposals).where(eq(govProposals.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (rows[0].authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (rows[0].status === "ratified" || rows[0].status === "sent_to_hypha") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot withdraw a ratified or submitted proposal" });
      }
      await db.update(govProposals).set({ status: "withdrawn" } as any).where(eq(govProposals.id, input.id));
      return { ok: true };
    }),
});
