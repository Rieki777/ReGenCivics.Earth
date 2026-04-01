/**
 * Proposals tRPC routes.
 * Standalone signaling system for community proposals.
 * Co-Creator+ citizenship tier required for submissions and voting.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const PROPOSAL_CATEGORIES = [
  "fund_allocation", "game_variable", "new_quest", "food_economy",
  "platform_feature", "community", "bff_initiative", "partnership",
  "community_agreement", "other",
] as const;

/** Verify that the user holds Co-Creator tier or above. Throws FORBIDDEN otherwise. */
async function requireCoCreatorPlus(db: any, userId: number) {
  const [row] = await db.execute(
    sql`SELECT citizenshipTier FROM player_profiles WHERE userId = ${userId} LIMIT 1`
  ).then((r: any) => r[0] ?? []);
  const tier = row?.citizenshipTier;
  if (!tier || tier === "explorer") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Co-Creator tier or above required" });
  }
}

export const proposalsRouter = router({
  // ─── List proposals (public) ───────────────────────────────────────────

  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.category && input.status) {
        return db.execute(sql`
          SELECT * FROM proposals
          WHERE category = ${input.category} AND status = ${input.status}
          ORDER BY createdAt DESC
          LIMIT ${input.limit}
        `).then((r: any) => r[0] ?? []);
      }
      if (input.category) {
        return db.execute(sql`
          SELECT * FROM proposals
          WHERE category = ${input.category}
          ORDER BY createdAt DESC
          LIMIT ${input.limit}
        `).then((r: any) => r[0] ?? []);
      }
      if (input.status) {
        return db.execute(sql`
          SELECT * FROM proposals
          WHERE status = ${input.status}
          ORDER BY createdAt DESC
          LIMIT ${input.limit}
        `).then((r: any) => r[0] ?? []);
      }
      return db.execute(sql`
        SELECT * FROM proposals
        ORDER BY createdAt DESC
        LIMIT ${input.limit}
      `).then((r: any) => r[0] ?? []);
    }),

  // ─── Get single proposal by ID (public) ───────────────────────────────

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.execute(sql`
        SELECT * FROM proposals WHERE id = ${input.id} LIMIT 1
      `).then((r: any) => r[0] ?? []);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      return row;
    }),

  // ─── Create proposal (Co-Creator+) ────────────────────────────────────

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(200),
      description: z.string().min(10),
      category: z.enum(PROPOSAL_CATEGORIES),
      templateType: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requireCoCreatorPlus(db, ctx.user.id);

      const [result] = await db.execute(sql`
        INSERT INTO proposals (authorId, title, description, category, templateType)
        VALUES (${ctx.user.id}, ${input.title}, ${input.description}, ${input.category}, ${input.templateType ?? null})
      `);
      const id = (result as any).insertId as number;
      return { id };
    }),

  // ─── Cast signal vote (Co-Creator+) ───────────────────────────────────

  signalVote: protectedProcedure
    .input(z.object({ proposalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await requireCoCreatorPlus(db, ctx.user.id);

      // INSERT IGNORE: silently skip if the user already voted
      await db.execute(sql`
        INSERT IGNORE INTO proposal_votes (proposalId, userId)
        VALUES (${input.proposalId}, ${ctx.user.id})
      `);

      // Increment signal vote count
      await db.execute(sql`
        UPDATE proposals SET signalVoteCount = signalVoteCount + 1
        WHERE id = ${input.proposalId}
      `);

      // Check threshold from game_variables (default 25 if not set)
      const [thresholdRow] = await db.execute(sql`
        SELECT value FROM game_variables WHERE \`key\` = 'proposals.signal_threshold' LIMIT 1
      `).then((r: any) => r[0] ?? []);
      const threshold = thresholdRow?.value ?? 25;

      // If threshold reached, update status
      const [proposal] = await db.execute(sql`
        SELECT signalVoteCount, status FROM proposals WHERE id = ${input.proposalId} LIMIT 1
      `).then((r: any) => r[0] ?? []);

      if (proposal && proposal.signalVoteCount >= threshold && proposal.status === "signaling") {
        await db.execute(sql`
          UPDATE proposals SET status = 'threshold_reached'
          WHERE id = ${input.proposalId} AND status = 'signaling'
        `);
      }

      return { ok: true };
    }),

  // ─── Remove signal vote ───────────────────────────────────────────────

  removeVote: protectedProcedure
    .input(z.object({ proposalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db.execute(sql`
        DELETE FROM proposal_votes
        WHERE proposalId = ${input.proposalId} AND userId = ${ctx.user.id}
      `);

      await db.execute(sql`
        UPDATE proposals SET signalVoteCount = GREATEST(signalVoteCount - 1, 0)
        WHERE id = ${input.proposalId}
      `);

      return { ok: true };
    }),

  // ─── Add update to proposal (author or admin only) ────────────────────

  addUpdate: protectedProcedure
    .input(z.object({
      proposalId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Verify the current user is the proposal author or an admin
      const [proposal] = await db.execute(sql`
        SELECT authorId FROM proposals WHERE id = ${input.proposalId} LIMIT 1
      `).then((r: any) => r[0] ?? []);
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });

      const isAdmin = ctx.user.role === "admin";
      if (proposal.authorId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the proposal author or an admin can add updates" });
      }

      const [result] = await db.execute(sql`
        INSERT INTO proposal_updates (proposalId, authorId, content)
        VALUES (${input.proposalId}, ${ctx.user.id}, ${input.content})
      `);
      const id = (result as any).insertId as number;
      return { id };
    }),

  // ─── List proposals by category (public) ──────────────────────────────

  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.execute(sql`
        SELECT * FROM proposals
        WHERE category = ${input.category}
        ORDER BY createdAt DESC
      `).then((r: any) => r[0] ?? []);
    }),

  // ─── Current user's voted proposal IDs ────────────────────────────────

  myVotes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT proposalId FROM proposal_votes WHERE userId = ${ctx.user.id}
    `).then((r: any) => r[0] ?? []);
    return rows.map((r: any) => r.proposalId);
  }),
});
