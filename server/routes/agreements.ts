// server/routes/agreements.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { communityAgreements, forumCategories } from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";

export const agreementsRouter = router({
  // List agreements (public)
  list: publicProcedure
    .input(z.object({
      sortBy: z.enum(['votes', 'newest']).default('votes'),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const agreements = await db.listCommunityAgreements(input.sortBy, input.status, input.limit, input.offset);
      const authorsMap = await db.getUsersByIds(agreements.map(a => a.authorId));
      return agreements.map((a) => ({
        ...a,
        authorName: authorsMap[a.authorId]?.name || 'Anonymous',
      }));
    }),

  // Get user's votes (authenticated)
  myVotes: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserCommunityAgreementVotes(ctx.user.id);
  }),

  // Submit a new agreement proposal (authenticated)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(300),
      description: z.string().min(10).max(5000),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createCommunityAgreement({
        authorId: ctx.user.id,
        title: sanitizeInput(input.title),
        description: sanitizeInput(input.description),
        category: input.category,
      });

      // Auto-create forum thread in air-conversations
      try {
        const drizzle = await getDb();
        if (drizzle) {
          const [airCat] = await drizzle
            .select({ id: forumCategories.id })
            .from(forumCategories)
            .where(eq(forumCategories.slug, 'air-conversations'))
            .limit(1);
          if (airCat) {
            const forumBody = `This is the discussion thread for the proposed community agreement: "${input.title}"\n\n${input.description}\n\nShare your thoughts, questions, and suggestions here.`;
            const forumPostId = await db.createForumPost({
              categoryId: airCat.id,
              authorId: ctx.user.id,
              title: `Agreement Proposal: ${input.title}`,
              content: sanitizeInput(forumBody),
            });
            await drizzle
              .update(communityAgreements)
              .set({ forumThreadId: forumPostId })
              .where(eq(communityAgreements.id, id));
          }
        }
      } catch (err) {
        console.error('Failed to auto-create forum thread for agreement (non-fatal):', err);
      }

      return { id };
    }),

  // Toggle vote on an agreement (authenticated)
  toggleVote: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const voted = await db.toggleCommunityAgreementVote(ctx.user.id, input.agreementId);
      return { voted };
    }),
});
