// server/routes/forum.ts
import { protectedProcedure, publicProcedure, adminProcedure, rateLimited, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, count } from "drizzle-orm";
import { forumPosts, forumReplies, forumCategories, postReactions, bioregions, ForumCategory } from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";
import { assertSafeExternalUrl } from "../_core/ssrf";
import { cacheGet, cacheSet, cacheDel } from "../cache";
import { generateImage } from "../_core/imageGeneration";
import ogs from "open-graph-scraper";
import { maybePostVideoSummary } from "../lib/videoSummary";

// In-memory cache for link preview OG data (TTL 24 hours)
const linkPreviewCache = new Map<string, { data: any; timestamp: number }>();
const LINK_PREVIEW_TTL = 86400000; // 24 hours

// In-memory cache for forum categories (refreshed every 5 minutes)
let cachedCategories: Awaited<ReturnType<typeof db.listForumCategories>> | null = null;
let categoriesCachedAt = 0;
const CATEGORIES_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedCategories() {
  const now = Date.now();
  if (!cachedCategories || now - categoriesCachedAt > CATEGORIES_TTL) {
    cachedCategories = await db.listForumCategories();
    categoriesCachedAt = now;
  }
  return cachedCategories;
}

export const forumRouter = router({
  // List all categories with post counts (cached 5 min)
  categories: publicProcedure.query(async () => {
    const CACHE_KEY = 'forum:categories';
    const cached = await cacheGet<(ForumCategory & { postCount: number })[]>(CACHE_KEY);
    if (cached) return cached;
    const categories = await db.listForumCategories();
    const counts = await db.getForumCategoryPostCounts();
    const result = categories.map(c => ({ ...c, postCount: counts[c.id] || 0 }));
    await cacheSet(CACHE_KEY, result, 300);
    return result;
  }),

  // Fetch Open Graph link preview data for a URL
  fetchLinkPreview: publicProcedure
    .input(z.object({
      url: z.string().url().refine(
        (u) => u.startsWith("http://") || u.startsWith("https://"),
        { message: "URL must start with http:// or https://" }
      ),
    }))
    .query(async ({ input }) => {
      const cached = linkPreviewCache.get(input.url);
      if (cached && Date.now() - cached.timestamp < LINK_PREVIEW_TTL) {
        return cached.data;
      }

      try {
        // SSRF guard: refuse to fetch loopback / private / metadata addresses
        // before handing the URL to open-graph-scraper.
        await assertSafeExternalUrl(input.url);
        const { result } = await ogs({ url: input.url, timeout: 5 });
        const data = {
          title: result.ogTitle || null,
          description: result.ogDescription || null,
          image: result.ogImage?.[0]?.url || null,
          siteName: result.ogSiteName || null,
          url: result.ogUrl || input.url,
        };
        linkPreviewCache.set(input.url, { data, timestamp: Date.now() });
        return data;
      } catch {
        const fallback = { title: null, description: null, image: null, siteName: null, url: input.url };
        linkPreviewCache.set(input.url, { data: fallback, timestamp: Date.now() });
        return fallback;
      }
    }),

  // Admin: create a new forum category
  createCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
      description: z.string().max(500).optional(),
      icon: z.string().max(50).optional(),
      color: z.string().max(20).optional(),
      imageUrl: z.string().max(500).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createForumCategory(input);
      return { id };
    }),

  // Admin: update a forum category
  updateCategory: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      icon: z.string().max(50).optional(),
      color: z.string().max(20).optional(),
      imageUrl: z.string().max(500).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateForumCategory(id, data);
      return { success: true };
    }),

  // Admin: delete a forum category
  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteForumCategory(input.id);
      return { success: true };
    }),

  // Get a single category by slug
  categoryBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.getForumCategoryBySlug(input.slug);
    }),

  // List posts, optionally filtered by category (cursor-based pagination)
  posts: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      cursor: z.number().optional(), // last post ID seen (for cursor pagination)
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { categoryId, cursor, limit } = input;
      const db2 = await getDb();
      if (!db2) return { posts: [], nextCursor: null };

      // Fetch one extra to determine if there's a next page
      const fetchLimit = limit + 1;

      let rows: (typeof forumPosts.$inferSelect)[];
      if (categoryId !== undefined) {
        if (cursor !== undefined) {
          rows = await db2.select().from(forumPosts)
            .where(sql`${forumPosts.categoryId} = ${categoryId} AND ${forumPosts.id} < ${cursor}`)
            .orderBy(sql`${forumPosts.isPinned} DESC, ${forumPosts.lastReplyAt} DESC, ${forumPosts.createdAt} DESC`)
            .limit(fetchLimit);
        } else {
          rows = await db2.select().from(forumPosts)
            .where(eq(forumPosts.categoryId, categoryId))
            .orderBy(sql`${forumPosts.isPinned} DESC, ${forumPosts.lastReplyAt} DESC, ${forumPosts.createdAt} DESC`)
            .limit(fetchLimit);
        }
      } else {
        if (cursor !== undefined) {
          rows = await db2.select().from(forumPosts)
            .where(sql`${forumPosts.id} < ${cursor}`)
            .orderBy(sql`${forumPosts.isPinned} DESC, ${forumPosts.lastReplyAt} DESC, ${forumPosts.createdAt} DESC`)
            .limit(fetchLimit);
        } else {
          rows = await db2.select().from(forumPosts)
            .orderBy(sql`${forumPosts.isPinned} DESC, ${forumPosts.lastReplyAt} DESC, ${forumPosts.createdAt} DESC`)
            .limit(fetchLimit);
        }
      }

      const hasMore = rows.length > limit;
      const posts = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? posts[posts.length - 1].id : null;

      // Pre-fetch bioregions for name lookup
      const allBioregions = await db2.select().from(bioregions);
      const bioregionMap = new Map(allBioregions.map(b => [b.id, b]));
      // Batch-fetch all authors in one query (eliminates N+1)
      const authorIds = posts.map(p => p.authorId);
      const authorsMap = await db.getUsersByIds(authorIds);
      const enriched = posts.map((post) => {
        const author = authorsMap[post.authorId];
        const bioregionName = post.bioregionId
          ? (bioregionMap.get(post.bioregionId)?.name ?? null)
          : null;
        return {
          ...post,
          authorName: author?.name || 'Anonymous',
          authorAvatar: null,
          bioregionName,
        };
      });
      return { posts: enriched, nextCursor };
    }),

  // Full-text search across forum posts
  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return [];
      const rows = await db2.select().from(forumPosts)
        .where(sql`MATCH(${forumPosts.title}, ${forumPosts.content}) AGAINST(${input.q} IN BOOLEAN MODE)`)
        .limit(20);
      const authorsMap = await db.getUsersByIds(rows.map(p => p.authorId));
      const cats = await getCachedCategories();
      return rows.map((post) => {
        const category = cats.find(c => c.id === post.categoryId);
        return {
          ...post,
          authorName: authorsMap[post.authorId]?.name || 'Anonymous',
          authorAvatar: null,
          categorySlug: category?.slug || 'general',
          categoryName: category?.name || 'Unknown',
        };
      });
    }),

  // Get a single post with full details
  postById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const post = await db.getForumPost(input.id);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      const [author, authorProfile, category] = await Promise.all([
        db.getUserById(post.authorId),
        db.getPlayerProfileByUserId(post.authorId),
        getCachedCategories().then(cats => cats.find(c => c.id === post.categoryId)),
      ]);
      const authorBadges: string[] = (() => {
        try { return JSON.parse(authorProfile?.badges ?? "[]"); } catch { return []; }
      })();
      return {
        ...post,
        authorName: author?.name || 'Anonymous',
        authorHandle: author?.handle || null,
        authorAvatar: authorProfile?.avatarUrl || null,
        authorBadges,
        authorCitizenshipTier: authorProfile?.citizenshipTier || 'explorer',
        authorContributionTier: authorProfile?.currentTier || 'Seedling',
        categoryName: category?.name || 'Unknown',
        categorySlug: category?.slug || 'general',
      };
    }),

  // List replies for a post
  replies: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      const replies = await db.listForumReplies(input.postId);
      // Batch-fetch authors + their player profiles each as a single query
      // (was N+1 across getPlayerProfileByUserId before).
      const authorIds = replies.map(r => r.authorId);
      const [authorsMap, profilesMap] = await Promise.all([
        db.getUsersByIds(authorIds),
        db.getPlayerProfilesByUserIds(authorIds),
      ]);
      const enriched = replies.map((reply) => {
        const author = authorsMap[reply.authorId];
        const authorProfile = profilesMap[reply.authorId];
        const authorBadges: string[] = (() => {
          try { return JSON.parse(authorProfile?.badges ?? "[]"); } catch { return []; }
        })();
        return {
          ...reply,
          authorName: author?.name || 'Anonymous',
          authorHandle: author?.handle || null,
          authorAvatar: authorProfile?.avatarUrl || null,
          authorBadges,
          authorCitizenshipTier: authorProfile?.citizenshipTier || 'explorer',
          authorContributionTier: authorProfile?.currentTier || 'Seedling',
        };
      });
      return enriched;
    }),

  // Get like counts and user's likes for a post
  likes: publicProcedure
    .input(z.object({ postId: z.number(), userId: z.number().optional() }))
    .query(async ({ input }) => {
      const counts = await db.getForumLikeCounts(input.postId);
      const userLikes = input.userId ? await db.getUserForumLikes(input.userId, input.postId) : { likedPost: false, likedReplies: [] };
      return { ...counts, ...userLikes };
    }),

  // Get posts by tag (cross-category)
  getTaggedPosts: publicProcedure
    .input(z.object({
      tag: z.enum(["lesson", "seeking-support", "offering-support"]),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const posts = await db.listForumPostsByTag(input.tag, input.limit, input.offset);
      const authorsMap = await db.getUsersByIds(posts.map(p => p.authorId));
      return posts.map((post) => ({
        ...post,
        authorName: authorsMap[post.authorId]?.name || 'Anonymous',
        authorAvatar: null,
      }));
    }),

  // Get all active-project forum threads (for Map pin links)
  activeProjectThreads: publicProcedure.query(async () => {
    const cats = await getCachedCategories();
    // Try multiple slugs that might hold land project threads
    const LAND_SLUGS = ["land-projects", "land-project-spaces", "land-projects-spaces"];
    const cat = cats.find(c => LAND_SLUGS.includes(c.slug));
    if (!cat) return [];
    const posts = await db.listForumPosts(cat.id, 200, 0);
    return posts.map(p => ({ id: p.id, title: p.title }));
  }),

  activeOrganisationThreads: publicProcedure.query(async () => {
    const cats = await getCachedCategories();
    const cat = cats.find(c => c.slug === "alliance-partners");
    if (!cat) return [];
    const posts = await db.listForumPosts(cat.id, 200, 0);
    return posts.map(p => ({ id: p.id, title: p.title }));
  }),

  activeAirThreads: publicProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) return [];
    const cat = await drizzle.select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.slug, 'air-conversations'))
      .limit(1);
    if (!cat[0]) return [];
    return drizzle.select({
      id: forumPosts.id,
      title: forumPosts.title,
      replyCount: forumPosts.replyCount,
      viewCount: forumPosts.viewCount,
      createdAt: forumPosts.createdAt,
    })
      .from(forumPosts)
      .where(eq(forumPosts.categoryId, cat[0].id))
      .orderBy(sql`${forumPosts.createdAt} DESC`)
      .limit(10);
  }),

  activeQuestThreads: publicProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) return [];
    const cat = await drizzle.select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.slug, 'quests-gameplay'))
      .limit(1);
    if (!cat[0]) return [];
    return drizzle.select({
      id: forumPosts.id,
      title: forumPosts.title,
      replyCount: forumPosts.replyCount,
      viewCount: forumPosts.viewCount,
      createdAt: forumPosts.createdAt,
    })
      .from(forumPosts)
      .where(eq(forumPosts.categoryId, cat[0].id))
      .orderBy(sql`${forumPosts.createdAt} DESC`)
      .limit(20);
  }),

  activeAlliancePartnerThreads: publicProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) return [];
    const cat = await drizzle.select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.slug, 'alliance-partners'))
      .limit(1);
    if (!cat[0]) return [];
    return drizzle.select({
      id: forumPosts.id,
      title: forumPosts.title,
      replyCount: forumPosts.replyCount,
      viewCount: forumPosts.viewCount,
      createdAt: forumPosts.createdAt,
    })
      .from(forumPosts)
      .where(eq(forumPosts.categoryId, cat[0].id))
      .orderBy(sql`${forumPosts.createdAt} DESC`)
      .limit(20);
  }),

  communityPulse: publicProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) return { posts7d: 0, replies7d: 0, activeMembers: 0 };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [postsResult] = await drizzle
      .select({ count: count() })
      .from(forumPosts)
      .where(sql`${forumPosts.createdAt} >= ${sevenDaysAgo}`);
    const [repliesResult] = await drizzle
      .select({ count: count() })
      .from(forumReplies)
      .where(sql`${forumReplies.createdAt} >= ${sevenDaysAgo}`);
    return {
      posts7d: Number(postsResult?.count ?? 0),
      replies7d: Number(repliesResult?.count ?? 0),
      activeMembers: 0,
    };
  }),

  // Get all posts in a chain (by chainId, returns the idea root + all experiment/result posts linked to it)
  chainPosts: publicProcedure
    .input(z.object({ chainId: z.number() }))
    .query(async ({ input }) => {
      const posts = await db.listForumPostsByChainId(input.chainId);
      const [authorsMap, cats] = await Promise.all([
        db.getUsersByIds(posts.map(p => p.authorId)),
        getCachedCategories(),
      ]);
      return posts.map((post) => {
        const category = cats.find(c => c.id === post.categoryId);
        return {
          ...post,
          authorName: authorsMap[post.authorId]?.name || 'Anonymous',
          categorySlug: category?.slug || 'general',
          categoryName: category?.name || 'Unknown',
        };
      });
    }),

  // Get posts by postType (e.g. "seeking_team", "case_study")
  postsByType: publicProcedure
    .input(z.object({
      postType: z.enum(["case_study", "seeking_team"]),
      limit: z.number().max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const posts = await db.listForumPostsByType(input.postType, input.limit, input.offset);
      const [authorsMap, cats] = await Promise.all([
        db.getUsersByIds(posts.map(p => p.authorId)),
        getCachedCategories(),
      ]);
      return posts.map((post) => {
        const category = cats.find(c => c.id === post.categoryId);
        return {
          ...post,
          authorName: authorsMap[post.authorId]?.name || 'Anonymous',
          categorySlug: category?.slug || 'general',
          categoryName: category?.name || 'Unknown',
        };
      });
    }),

  // Get all thread-chain posts (any post with threadStage set)
  chainFeed: publicProcedure
    .input(z.object({ limit: z.number().max(100).default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const posts = await db.listForumChainPosts(input.limit, input.offset);
      const [authorsMap, cats] = await Promise.all([
        db.getUsersByIds(posts.map(p => p.authorId)),
        getCachedCategories(),
      ]);
      return posts.map((post) => {
        const category = cats.find(c => c.id === post.categoryId);
        return {
          ...post,
          authorName: authorsMap[post.authorId]?.name || 'Anonymous',
          categorySlug: category?.slug || 'general',
          categoryName: category?.name || 'Unknown',
        };
      });
    }),

  // Create a new post (auth required)
  createPost: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(z.object({
      categoryId: z.number(),
      title: z.string().min(3).max(300),
      content: z.string().min(10).max(10000),
      tags: z.array(z.enum(["lesson", "seeking-support", "offering-support"])).optional(),
      postType: z.enum(["discussion", "case_study", "seeking_team"]).optional(),
      threadStage: z.enum(["idea", "experiment", "result"]).optional(),
      chainId: z.number().optional(),
      bioregionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Auto-apply #lesson tag when post type is case_study
      let tags = input.tags || [];
      if (input.postType === "case_study" && !tags.includes("lesson")) {
        tags = [...tags, "lesson"];
      }
      const postId = await db.createForumPost({
        categoryId: input.categoryId,
        authorId: ctx.user.id,
        title: sanitizeInput(input.title),
        content: sanitizeInput(input.content),
        tags,
        postType: input.postType,
        threadStage: input.threadStage,
        chainId: input.chainId,
        bioregionId: input.bioregionId,
      });
      // Fire-and-forget image generation -- don't block mutation response
      generateImage({
        contentType: "forum",
        contentId: postId,
        contextText: `${input.title}. ${input.content.slice(0, 150)}`,
      }).then(({ url }) =>
        getDb().then(d => d?.update(forumPosts).set({ generatedImageUrl: url }).where(eq(forumPosts.id, postId)))
      ).catch(err => console.error(`Image gen failed for forum post ${postId}:`, err));

      // Fire-and-forget link preview fetch for the first URL in the post content
      const urlMatch = input.content.match(/https?:\/\/[^\s<>"')\]]+/);
      if (urlMatch) {
        const targetUrl = urlMatch[0];
        // SSRF guard runs first; only public URLs reach open-graph-scraper.
        assertSafeExternalUrl(targetUrl)
          .then(() => ogs({ url: targetUrl, timeout: 5 }))
          .then(({ result }) => {
            const preview = {
              title: result.ogTitle || null,
              description: result.ogDescription || null,
              image: result.ogImage?.[0]?.url || null,
              siteName: result.ogSiteName || null,
              url: result.ogUrl || targetUrl,
            };
            return getDb().then(d =>
              d?.update(forumPosts).set({ linkPreviews: JSON.stringify(preview) }).where(eq(forumPosts.id, postId))
            );
          }).catch(err => console.error(`Link preview fetch failed for forum post ${postId}:`, err));
      }

      // Fire-and-forget video summary. If the post contains a YouTube URL with
      // available auto-captions, the ReGen Guide bot will reply with a Claude-
      // drafted summary a few seconds later. Rate-limited and silent on failure.
      // See server/lib/videoSummary.ts for the full flow + rate caps.
      maybePostVideoSummary(postId, input.content, ctx.user.id).catch((err) =>
        console.error(`[forum.createPost] video summary failed for postId=${postId}`, err)
      );

      return { id: postId };
    }),

  // Create a reply (auth required)
  createReply: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({
      postId: z.number(),
      content: z.string().min(1).max(5000),
      parentReplyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const replyId = await db.createForumReply({
        postId: input.postId,
        authorId: ctx.user.id,
        content: sanitizeInput(input.content),
        parentReplyId: input.parentReplyId,
      });
      return { id: replyId };
    }),

  // Toggle like on post or reply (auth required)
  toggleLike: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 30 }))
    .input(z.object({
      postId: z.number().optional(),
      replyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.postId && !input.replyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must specify postId or replyId' });
      }
      const liked = await db.toggleForumLike(ctx.user.id, input.postId, input.replyId);
      return { liked };
    }),

  // Update a post (author or admin)
  updatePost: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(300),
      content: z.string().min(1).max(50000),
      generatedImageUrl: z.string().max(512).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.getForumPost(input.id);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
      const isAdminOrSuper = ctx.user.role === 'admin' || ctx.user.role === 'superadmin';
      if (post.authorId !== ctx.user.id && !isAdminOrSuper) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to edit this post' });
      }
      const updateData: any = { title: input.title, content: input.content };
      if (input.generatedImageUrl !== undefined) updateData.generatedImageUrl = input.generatedImageUrl;
      await db.updateForumPost(input.id, updateData);
      return { success: true };
    }),

  // Delete a post (author or admin)
  deletePost: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.getForumPost(input.id);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
      const isAdminOrSuper = ctx.user.role === 'admin' || ctx.user.role === 'superadmin';
      if (post.authorId !== ctx.user.id && !isAdminOrSuper) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      await db.deleteForumPost(input.id);
      return { success: true };
    }),

  // Delete a reply (author, admin, or moderator)
  deleteReply: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const reply = await db.getForumReply(input.id);
      if (!reply) throw new TRPCError({ code: 'NOT_FOUND' });
      const isMod = await db.isForumModerator(ctx.user.id);
      const isAdminOrSuper = ctx.user.role === 'admin' || ctx.user.role === 'superadmin';
      const isAuthor = reply.authorId === ctx.user.id;
      // Authorization: author OR moderator OR admin/superadmin. Without this
      // explicit check the procedure was a wide-open "delete any reply" hole
      // (any signed-in user could DELETE any other user's reply). Found in
      // 2026-04-25 deep security audit.
      if (!isAuthor && !isMod && !isAdminOrSuper) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to delete this reply' });
      }
      await db.deleteForumReply(input.id);
      return { success: true };
    }),

  // Report a post or reply
  report: protectedProcedure
    .input(z.object({
      postId: z.number().optional(),
      replyId: z.number().optional(),
      reason: z.enum(['spam', 'harassment', 'inappropriate', 'misinformation', 'other']),
      details: z.string().max(1000).optional(),
      severity: z.enum(['soft', 'hard']).default('soft'),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createForumReport({
        reporterId: ctx.user.id,
        postId: input.postId,
        replyId: input.replyId,
        reason: input.reason,
        details: input.details,
        severity: input.severity,
      });
      return { id };
    }),

  // Pin/unpin a post (admin or moderator)
  togglePin: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only moderators can pin posts' });
      }
      const pinned = await db.togglePinPost(input.postId);
      return { pinned };
    }),

  // Lock/unlock a post (admin or moderator)
  toggleLock: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only moderators can lock posts' });
      }
      const locked = await db.toggleLockPost(input.postId);
      return { locked };
    }),

  // Check if user is moderator
  isModerator: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return { isModerator: await db.isForumModerator(input.userId) };
    }),

  // Check if user is banned
  isBanned: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return { isBanned: await db.isUserBanned(input.userId) };
    }),

  // Get user profile
  userProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const [user, profile, stats, recentPosts, recentReplies] = await Promise.all([
        db.getUserById(input.userId),
        db.getUserProfile(input.userId),
        db.getUserForumStats(input.userId),
        db.getUserRecentPosts(input.userId, 5),
        db.getUserRecentReplies(input.userId, 5),
      ]);
      return {
        user: user ? { id: user.id, name: user.name, createdAt: user.createdAt } : null,
        profile,
        stats,
        recentPosts,
        recentReplies,
      };
    }),

  // Update own profile
  updateProfile: protectedProcedure
    .input(z.object({
      bio: z.string().max(500).optional(),
      location: z.string().max(255).optional(),
      website: z.string().max(500).optional(),
      preferredLanguage: z.string().max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  // Increment "I tried this" counter on a reply (auth required)
  incrementTriedThis: protectedProcedure
    .input(z.object({ replyId: z.number() }))
    .mutation(async ({ input }) => {
      const count = await db.incrementReplyTriedThis(input.replyId);
      return { count };
    }),

  // C17: Posts filtered by bioregion
  postsByBioregion: publicProcedure
    .input(z.object({ bioregionId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return [];
      const posts = await db2.select().from(forumPosts)
        .where(eq(forumPosts.bioregionId, input.bioregionId))
        .orderBy(forumPosts.createdAt)
        .limit(input.limit);
      const authorsMap = await db.getUsersByIds(posts.map(p => p.authorId));
      return posts.map((post) => ({ ...post, authorName: authorsMap[post.authorId]?.name || 'Anonymous' }));
    }),

  reactions: router({
    // Toggle an emoji reaction on a post or reply
    toggle: protectedProcedure
      .input(z.object({
        postId: z.number().optional(),
        replyId: z.number().optional(),
        emoji: z.enum(['✔️', '❤️', '🌱', '🔥', '💡', '🌍']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.postId && !input.replyId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must specify postId or replyId' });
        }
        const db2 = await getDb();
        if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        // Check if reaction already exists
        const existing = await db2.select()
          .from(postReactions)
          .where(
            sql`${postReactions.userId} = ${ctx.user.id}
              AND ${input.postId ? sql`${postReactions.postId} = ${input.postId}` : sql`${postReactions.postId} IS NULL`}
              AND ${input.replyId ? sql`${postReactions.replyId} = ${input.replyId}` : sql`${postReactions.replyId} IS NULL`}
              AND ${postReactions.emoji} = ${input.emoji}`
          )
          .limit(1);

        if (existing.length > 0) {
          // Unreact: delete the existing reaction
          await db2.delete(postReactions).where(eq(postReactions.id, existing[0].id));
          return { reacted: false };
        } else {
          // React: insert new reaction with reputation weight
          // Weight = 1.0 + (contribution percentile / 100)
          let weight = 1.0;
          try {
            const [profile] = await db2.execute(
              sql`SELECT contributionScore FROM player_profiles WHERE userId = ${ctx.user.id} LIMIT 1`
            ).then((r: any) => r[0] ?? []);
            if (profile?.contributionScore) {
              weight = 1.0 + (Number(profile.contributionScore) / 100);
            }
          } catch { /* default weight 1.0 */ }

          await db2.insert(postReactions).values({
            userId: ctx.user.id,
            postId: input.postId ?? null,
            replyId: input.replyId ?? null,
            emoji: input.emoji,
            reactionWeight: weight,
          });
          return { reacted: true };
        }
      }),

    // Get reaction counts and current user's reactions for a post or reply
    get: publicProcedure
      .input(z.object({
        postId: z.number().optional(),
        replyId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) return [];

        // Get all reactions for the target
        const rows = await db2.select()
          .from(postReactions)
          .where(
            sql`${input.postId ? sql`${postReactions.postId} = ${input.postId}` : sql`${postReactions.postId} IS NULL`}
              AND ${input.replyId ? sql`${postReactions.replyId} = ${input.replyId}` : sql`${postReactions.replyId} IS NULL`}`
          );

        // Get the current user from session if available
        const currentUserId = ctx.user?.id ?? null;

        // Aggregate by emoji
        const ALLOWED_EMOJIS = ['✔️', '❤️', '🌱', '🔥', '💡', '🌍'];
        const result = ALLOWED_EMOJIS.map(emoji => {
          const matching = rows.filter(r => r.emoji === emoji);
          return {
            emoji,
            count: matching.length,
            userReacted: currentUserId ? matching.some(r => r.userId === currentUserId) : false,
          };
        }).filter(r => r.count > 0);

        return result;
      }),
  }),
});

export const moderationRouter = router({
  // Submit a report (any authenticated user)
  submitReport: protectedProcedure
    .input(z.object({
      postId: z.number().optional(),
      replyId: z.number().optional(),
      reason: z.enum(["spam", "harassment", "inappropriate", "misinformation", "other"]).default("inappropriate"),
      details: z.string().max(500).optional(),
      severity: z.enum(["soft", "hard"]).default("soft"),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.createForumReport({
        reporterId: ctx.user.id,
        postId: input.postId,
        replyId: input.replyId,
        reason: input.reason,
        details: input.details,
        severity: input.severity,
      });
      return { success: true };
    }),

  // List reports (admin/mod only)
  reports: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const reports = await db.listForumReports(input.status);
      const authorsMap = await db.getUsersByIds(reports.map(r => r.reporterId));
      return reports.map((r) => ({ ...r, reporterName: authorsMap[r.reporterId]?.name || 'Unknown' }));
    }),

  // Update report status
  updateReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['reviewed', 'dismissed', 'actioned']),
    }))
    .mutation(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await db.updateReportStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),

  // List moderators (admin only)
  moderators: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const mods = await db.listForumModerators();
    const usersMap = await db.getUsersByIds(mods.map(m => m.userId));
    return mods.map((m) => ({ ...m, userName: usersMap[m.userId]?.name || 'Unknown', userEmail: usersMap[m.userId]?.email || '' }));
  }),

  // Add moderator (admin only)
  addModerator: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await db.addForumModerator(input.userId, ctx.user.id);
      return { success: true };
    }),

  // Remove moderator (admin only)
  removeModerator: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await db.removeForumModerator(input.userId);
      return { success: true };
    }),

  // Ban user (admin/mod)
  banUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      reason: z.string().max(500).optional(),
      days: z.number().optional(), // null = permanent
    }))
    .mutation(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const expiresAt = input.days ? new Date(Date.now() + input.days * 86400000) : undefined;
      await db.banUser(input.userId, ctx.user.id, input.reason, expiresAt);
      return { success: true };
    }),

  // Unban user (admin/mod)
  unbanUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isMod = await db.isForumModerator(ctx.user.id);
      if (ctx.user.role !== 'admin' && !isMod) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await db.unbanUser(input.userId);
      return { success: true };
    }),

  // List banned users
  bannedUsers: protectedProcedure.query(async ({ ctx }) => {
    const isMod = await db.isForumModerator(ctx.user.id);
    if (ctx.user.role !== 'admin' && !isMod) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const bans = await db.listBannedUsers();
    const allIds = bans.flatMap(b => [b.userId, b.bannedBy]);
    const usersMap = await db.getUsersByIds(allIds);
    return bans.map((b) => ({ ...b, userName: usersMap[b.userId]?.name || 'Unknown', bannedByName: usersMap[b.bannedBy]?.name || 'Unknown' }));
  }),
});

export const notificationsRouter = router({
  // Get user's notifications
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getUserNotifications(ctx.user.id, input?.limit || 50);
    }),

  // Get unread count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUnreadNotificationCount(ctx.user.id);
  }),

  // Mark notification as read
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationAsRead(input.id, ctx.user.id);
      return { success: true };
    }),

  // Mark all notifications as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsAsRead(ctx.user.id);
    return { success: true };
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteNotification(input.id, ctx.user.id);
      return { success: true };
    }),
});

export const projectJoinRequestsRouter = router({
  // Public: anyone can submit a join request (comes from /connect form)
  create: publicProcedure
    .input(z.object({
      submitterName: z.string().min(1),
      submitterEmail: z.string().email(),
      submitterMessage: z.string().optional(),
      targetType: z.enum(["land_project", "alliance_org"]),
      targetId: z.string().min(1),
      targetName: z.string().min(1),
      connectInquiryId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      // Find approved steward for this org (if any)
      const claims = await db.getAllOrgClaims();
      const approved = claims.find(
        c => c.orgId === input.targetId && c.status === 'approved'
      );
      const id = await db.createProjectJoinRequest({
        ...input,
        stewardUserId: approved?.userId ?? null,
      });
      return { id };
    }),

  // Steward: see requests routed to them
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return db.getJoinRequestsForSteward(ctx.user.id);
  }),

  // Admin: see all requests
  listAll: adminProcedure.query(async () => {
    return db.getAllJoinRequests();
  }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "reviewed", "accepted", "rejected"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Allow admin or the steward assigned to the request
      const all = await db.getAllJoinRequests();
      const req = all.find(r => r.id === input.id);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin" && req.stewardUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.updateJoinRequestStatus(input.id, input.status);
      return { ok: true };
    }),
});
