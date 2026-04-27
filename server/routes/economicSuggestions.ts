import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql, desc, eq } from "drizzle-orm";
import { sanitizeInput } from "../_core/security";

export const economicSuggestionsRouter = router({
  // List suggestions ordered by vote count
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.category) {
        return db.execute(sql`
          SELECT * FROM economic_suggestions
          WHERE category = ${input.category}
          ORDER BY vote_count DESC
          LIMIT ${input.limit}
        `).then((r: any) => r[0] ?? []);
      }

      return db.execute(sql`
        SELECT * FROM economic_suggestions
        ORDER BY vote_count DESC
        LIMIT ${input.limit}
      `).then((r: any) => r[0] ?? []);
    }),

  // Create a new suggestion (authenticated)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(200),
      description: z.string().min(10).max(5000),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [result] = await db.execute(sql`
        INSERT INTO economic_suggestions
          (author_id, title, description, category, vote_count, created_at)
        VALUES
          (${ctx.user.id}, ${sanitizeInput(input.title)},
           ${sanitizeInput(input.description)},
           ${input.category ?? null}, 0, NOW())
      `);
      const id = (result as any).insertId as number;
      return { id };
    }),

  // Toggle vote on a suggestion (authenticated)
  vote: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      // Check for existing vote
      const existing = await db.execute(sql`
        SELECT id FROM economic_suggestion_votes
        WHERE user_id = ${ctx.user.id}
          AND suggestion_id = ${input.suggestionId}
        LIMIT 1
      `);
      const existingRows = (existing as any)[0] ?? [];

      if (existingRows.length > 0) {
        // Remove vote and decrement count
        await db.execute(sql`
          DELETE FROM economic_suggestion_votes
          WHERE user_id = ${ctx.user.id}
            AND suggestion_id = ${input.suggestionId}
        `);
        await db.execute(sql`
          UPDATE economic_suggestions
          SET vote_count = GREATEST(vote_count - 1, 0)
          WHERE id = ${input.suggestionId}
        `);
        return { voted: false };
      } else {
        // Insert vote and increment count
        await db.execute(sql`
          INSERT INTO economic_suggestion_votes (user_id, suggestion_id, created_at)
          VALUES (${ctx.user.id}, ${input.suggestionId}, NOW())
        `);
        await db.execute(sql`
          UPDATE economic_suggestions
          SET vote_count = vote_count + 1
          WHERE id = ${input.suggestionId}
        `);
        return { voted: true };
      }
    }),

  // Get suggestion IDs the current user has voted on
  myVotes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db.execute(sql`
      SELECT suggestion_id FROM economic_suggestion_votes
      WHERE user_id = ${ctx.user.id}
    `);
    const results = (rows as any)[0] ?? [];
    return results.map((r: any) => r.suggestion_id);
  }),
});
