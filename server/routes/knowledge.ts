// server/routes/knowledge.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { glossaryTerms, knowledgeMapEntries, customGameInquiries, blogEdits, entityRssFeeds, orgClaims } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { notifyOwner } from "../_core/notification";
import { invokeLLM } from "../_core/llm";

// ─── C13: Glossary ───────────────────────────────────────────────────────────
export const glossaryRouter = router({
  list: publicProcedure.query(async () => {
    return db.getApprovedGlossaryTerms();
  }),

  listAll: adminProcedure.query(async () => {
    return db.getAllGlossaryTerms();
  }),

  approve: adminProcedure
    .input(z.object({ id: z.number(), definition: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.approveGlossaryTerm(input.id, ctx.user.id, input.definition);
      return { success: true };
    }),

  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.rejectGlossaryTerm(input.id);
      return { success: true };
    }),

  add: adminProcedure
    .input(z.object({
      term: z.string().min(1),
      definition: z.string().min(1),
      sourceThreadUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.addGlossaryTerm({
        term: input.term,
        definition: input.definition,
        sourceThreadUrl: input.sourceThreadUrl || null,
        status: "approved",
        approvedAt: new Date(),
      });
      return { id };
    }),

  // Community: propose a new term (requires auth, status = proposed)
  propose: protectedProcedure
    .input(z.object({
      term: z.string().min(1).max(200),
      definition: z.string().min(5).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sanitizeInput } = await import("../_core/security");
      const id = await db.addGlossaryTerm({
        term: sanitizeInput(input.term),
        definition: sanitizeInput(input.definition),
        sourceThreadUrl: null,
        status: "proposed",
        approvedAt: null,
        authorId: ctx.user.id,
      });
      return { id };
    }),
});

// ─── C9: Knowledge Map ────────────────────────────────────────────────────────
export const knowledgeMapRouter = router({
  // Public: list approved entries for a category
  listByCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const entries = await db.listKnowledgeMapEntries(input.categoryId);
      return entries.filter(e => e.approvedAt !== null);
    }),

  // Admin: list all entries (including pending AI suggestions)
  listAll: adminProcedure.query(async () => {
    return db.listKnowledgeMapEntries();
  }),

  pendingSuggestions: adminProcedure.query(async () => {
    return db.listPendingKnowledgeMapSuggestions();
  }),

  // Admin: manually add an entry
  add: adminProcedure
    .input(z.object({
      categoryId: z.number(),
      title: z.string().min(1),
      summary: z.string().optional(),
      postId: z.number().optional(),
      url: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.addKnowledgeMapEntry({
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary ?? null,
        postId: input.postId ?? null,
        url: input.url ?? null,
        sortOrder: input.sortOrder ?? 0,
        suggestedByAI: 0,
        approvedAt: new Date(),
      });
      return { id };
    }),

  // Admin: approve an AI suggestion
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.approveKnowledgeMapEntry(input.id);
      return { ok: true };
    }),

  // Admin: delete an entry
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteKnowledgeMapEntry(input.id);
      return { ok: true };
    }),

  // Admin: reorder
  reorder: adminProcedure
    .input(z.object({ id: z.number(), sortOrder: z.number() }))
    .mutation(async ({ input }) => {
      await db.reorderKnowledgeMapEntry(input.id, input.sortOrder);
      return { ok: true };
    }),

  // Admin: trigger Claude to scan posts in a category and suggest entries
  suggestFromAI: adminProcedure
    .input(z.object({ categoryId: z.number(), categoryName: z.string() }))
    .mutation(async ({ input }) => {
      const posts = await db.listForumPosts(input.categoryId, 20, 0);
      if (!posts.length) return { suggested: 0 };

      const postList = posts.slice(0, 15).map(p =>
        `- ID ${p.id}: "${p.title}" (${p.replyCount} replies, ${p.viewCount} views)`
      ).join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "user" as const,
            content: `You are a knowledge curator for a regenerative land project community forum. Given a list of forum posts in the "${input.categoryName}" category, identify the 3-5 most valuable, evergreen threads that belong in a "Knowledge Map" (a pinned index of essential reading for newcomers).\n\nRecent posts:\n${postList}\n\nReturn a JSON array only (no markdown, no commentary):\n[{"title":"...", "summary":"...(1-2 sentences)", "postId": <number>}]`,
          },
        ],
        maxTokens: 800,
      });

      let suggestions: { title: string; summary: string; postId: number }[] = [];
      const rawContent = response.choices?.[0]?.message?.content ?? "";
      try {
        const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        suggestions = JSON.parse(cleaned);
      } catch {
        return { suggested: 0 };
      }

      let count = 0;
      for (const s of suggestions) {
        if (s.postId && s.title) {
          await db.addKnowledgeMapEntry({
            categoryId: input.categoryId,
            title: s.title,
            summary: s.summary ?? null,
            postId: s.postId,
            url: null,
            sortOrder: count,
            suggestedByAI: 1,
            approvedAt: null,
          });
          count++;
        }
      }
      return { suggested: count };
    }),
});

// Translation
export const translateRouter = router({
  // Translate forum content
  content: publicProcedure
    .input(z.object({
      contentType: z.enum(['post', 'reply', 'quest_suggestion']),
      contentId: z.number(),
      targetLang: z.string().max(10),
      sourceText: z.string(),
      sourceTitle: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check cache first
      const cached = await db.getCachedTranslation(input.contentType, input.contentId, input.targetLang);
      if (cached) {
        return {
          translatedTitle: cached.translatedTitle,
          translatedContent: cached.translatedContent,
          fromCache: true,
        };
      }

      // Use LLM to translate
      const { invokeLLM } = await import('../_core/llm').catch(() => ({ invokeLLM: null }));

      if (!invokeLLM) {
        // Fallback: return original text
        return {
          translatedTitle: input.sourceTitle || null,
          translatedContent: input.sourceText,
          fromCache: false,
        };
      }

      try {
        const langNames: Record<string, string> = {
          en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French',
          id: 'Indonesian', de: 'German', zh: 'Chinese (Simplified)', ar: 'Arabic',
          hi: 'Hindi', ja: 'Japanese',
        };
        const targetLangName = langNames[input.targetLang] || input.targetLang;

        const prompt = input.sourceTitle
          ? `Translate the following title and content to ${targetLangName}. Return JSON with "title" and "content" fields. Keep any markdown formatting.\n\nTitle: ${input.sourceTitle}\n\nContent: ${input.sourceText}`
          : `Translate the following text to ${targetLangName}. Return JSON with a "content" field. Keep any markdown formatting.\n\n${input.sourceText}`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a translator. Return only valid JSON with the translated text. Preserve markdown formatting.' },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'translation',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Translated title (if provided)' },
                  content: { type: 'string', description: 'Translated content' },
                },
                required: ['content'],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse(response.choices[0].message.content as string);

        // Cache the translation
        await db.saveCachedTranslation({
          contentType: input.contentType,
          contentId: input.contentId,
          sourceLang: 'en', // Assume source is English for now
          targetLang: input.targetLang,
          translatedTitle: parsed.title || null,
          translatedContent: parsed.content,
        });

        return {
          translatedTitle: parsed.title || null,
          translatedContent: parsed.content,
          fromCache: false,
        };
      } catch (error) {
        // Fallback: return original text
        return {
          translatedTitle: input.sourceTitle || null,
          translatedContent: input.sourceText,
          fromCache: false,
        };
      }
    }),
});

// ─── Custom Game Inquiries (waitlist for /custom-games) ───────────────────────
export const customGameInquiriesRouter = router({
  submit: publicProcedure
    .input(z.object({
      fullName: z.string().min(1).max(255),
      email: z.string().email().max(255),
      projectName: z.string().min(1).max(255),
      websiteOrSocial: z.string().max(500).optional(),
      landStatus: z.string().min(1).max(100),
      communityStage: z.string().min(1).max(100),
      primaryGoal: z.string().min(1),
      timeline: z.string().min(1).max(100),
      budgetConfirmed: z.boolean(),
      referralSource: z.string().max(255).optional(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "custom_game_waitlist");
      const drizzle = await getDb();
      if (!drizzle) return { success: false };
      await drizzle.insert(customGameInquiries).values({
        fullName: input.fullName,
        email: input.email,
        projectName: input.projectName,
        websiteOrSocial: input.websiteOrSocial ?? null,
        landStatus: input.landStatus,
        communityStage: input.communityStage,
        primaryGoal: input.primaryGoal,
        timeline: input.timeline,
        budgetConfirmed: input.budgetConfirmed ? 1 : 0,
        referralSource: input.referralSource ?? null,
        additionalNotes: input.additionalNotes ?? null,
        status: "waitlist",
      });
      await notifyOwner({ title: "New Custom Game Waitlist Submission", content: `From: ${input.fullName} (${input.email})\nProject: ${input.projectName}\nLand Status: ${input.landStatus}\nTimeline: ${input.timeline}\nGoal: ${input.primaryGoal}` });
      return { success: true };
    }),

  list: adminProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return [];
      const rows = await drizzle
        .select()
        .from(customGameInquiries)
        .orderBy(sql`createdAt DESC`);
      if (input?.status) {
        return rows.filter((r) => r.status === input.status);
      }
      return rows;
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().min(1).max(50),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return { success: false };
      await drizzle
        .update(customGameInquiries)
        .set({ status: input.status, internalNotes: input.internalNotes ?? null })
        .where(eq(customGameInquiries.id, input.id));
      return { success: true };
    }),
});

// ─── Blog ─────────────────────────────────────────────────────────────────────
export const blogRouter = router({
  // Public: get content override for a slug (returns null if no override exists)
  getOverride: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(blogEdits).where(eq(blogEdits.slug, input.slug)).limit(1);
      return rows[0] ?? null;
    }),

  // Admin: save a content override for a blog post slug
  saveOverride: adminProcedure
    .input(z.object({ slug: z.string(), content: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(blogEdits)
        .values({ slug: input.slug, content: input.content })
        .onDuplicateKeyUpdate({ set: { content: input.content } });
      return { success: true };
    }),
});

// ─── RSS Feeds ────────────────────────────────────────────────────────────────
export const rssFeedRouter = router({
  // List feeds for the user's approved claimed entity
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Find the user's approved claim
      const claim = await db
        .select()
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) return [];
      return db
        .select()
        .from(entityRssFeeds)
        .where(sql`${entityRssFeeds.entityId} = ${claim[0].orgId} AND ${entityRssFeeds.isActive} = 1`)
        .orderBy(sql`${entityRssFeeds.createdAt} DESC`);
    }),

  add: protectedProcedure
    .input(z.object({
      feedUrl: z.string().url(),
      label: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify approved claim ownership
      const claim = await db
        .select()
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No approved claim found." });
      await db.insert(entityRssFeeds).values({
        entityType: claim[0].orgType === "land_project" ? "land_project" : "organisation",
        entityId: claim[0].orgId,
        feedUrl: input.feedUrl,
        label: input.label ?? "Feed",
        isActive: 1,
      });
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ feedId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify ownership via approved claim
      const claim = await db
        .select()
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No approved claim found." });
      await db.update(entityRssFeeds)
        .set({ isActive: 0 })
        .where(sql`${entityRssFeeds.id} = ${input.feedId} AND ${entityRssFeeds.entityId} = ${claim[0].orgId}`);
      return { success: true };
    }),

  dismissPrompt: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(orgClaims)
        .set({ rssPromptDismissed: 1 })
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`);
      return { success: true };
    }),

  checkPrompt: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const claim = await db
        .select({ id: orgClaims.id, orgName: orgClaims.orgName, rssPromptDismissed: orgClaims.rssPromptDismissed })
        .from(orgClaims)
        .where(sql`${orgClaims.userId} = ${ctx.user.id} AND ${orgClaims.status} = 'approved'`)
        .limit(1);
      if (!claim[0] || claim[0].rssPromptDismissed) return null;
      return { claimId: claim[0].id, orgName: claim[0].orgName };
    }),
});
