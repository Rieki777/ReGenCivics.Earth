import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { featureSuggestions, featureSuggestionVotes, forumCategories } from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";

const CATEGORIES = ["Site", "Quests", "Forum", "Map", "Fund", "Game", "Events", "Other"] as const;

export const featuresRouter = router({
  // List suggestions (public)
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      sortBy: z.enum(["votes", "newest"]).default("votes"),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const order = input.sortBy === "votes"
        ? desc(featureSuggestions.voteCount)
        : desc(featureSuggestions.createdAt);
      const suggestions = await (input.status
        ? database.select().from(featureSuggestions).where(eq(featureSuggestions.status, input.status as any)).orderBy(order).limit(input.limit)
        : database.select().from(featureSuggestions).orderBy(order).limit(input.limit));
      const authorIds = suggestions.map(s => s.authorId);
      const authors = authorIds.length ? await db.getUsersByIds(authorIds) : {};
      return suggestions.map(s => ({
        ...s,
        authorName: authors[s.authorId]?.name || "Anonymous",
      }));
    }),

  // User's votes (auth)
  myVotes: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];
    const votes = await database.select().from(featureSuggestionVotes)
      .where(eq(featureSuggestionVotes.userId, ctx.user.id));
    return votes.map(v => v.suggestionId);
  }),

  // Propose a feature (auth)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(300),
      description: z.string().min(10).max(5000),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      const [result] = await database.insert(featureSuggestions).values({
        authorId: ctx.user.id,
        title: sanitizeInput(input.title),
        description: sanitizeInput(input.description),
        category: input.category || null,
      });
      const id = (result as any).insertId as number;

      // Auto-create forum thread in air-conversations
      try {
        const [airCat] = await database.select({ id: forumCategories.id })
          .from(forumCategories)
          .where(eq(forumCategories.slug, "air-conversations")).limit(1);
        if (airCat) {
          const forumBody = `Feature suggestion: "${input.title}"\n\n${input.description}\n\nVote and share your thoughts on this idea.`;
          const postId = await db.createForumPost({
            categoryId: airCat.id,
            authorId: ctx.user.id,
            title: `Feature Idea: ${input.title}`,
            content: sanitizeInput(forumBody),
          });
          await database.update(featureSuggestions)
            .set({ forumThreadId: postId })
            .where(eq(featureSuggestions.id, id));
        }
      } catch (err) {
        console.error("Failed to create forum thread for feature (non-fatal):", err);
      }

      return { id };
    }),

  // Toggle vote (auth)
  toggleVote: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      const [existing] = await database.select().from(featureSuggestionVotes)
        .where(and(
          eq(featureSuggestionVotes.userId, ctx.user.id),
          eq(featureSuggestionVotes.suggestionId, input.suggestionId),
        )).limit(1);
      if (existing) {
        await database.delete(featureSuggestionVotes).where(eq(featureSuggestionVotes.id, existing.id));
        await database.update(featureSuggestions)
          .set({ voteCount: sql`GREATEST(${featureSuggestions.voteCount} - 1, 0)` })
          .where(eq(featureSuggestions.id, input.suggestionId));
        return { voted: false };
      } else {
        await database.insert(featureSuggestionVotes).values({ userId: ctx.user.id, suggestionId: input.suggestionId });
        await database.update(featureSuggestions)
          .set({ voteCount: sql`${featureSuggestions.voteCount} + 1` })
          .where(eq(featureSuggestions.id, input.suggestionId));
        return { voted: true };
      }
    }),
});
