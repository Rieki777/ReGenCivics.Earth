/**
 * The living feed (Phase 2): personalized For You, Following, and My Threads
 * tabs plus read tracking and polymorphic follows. Latest stays on the
 * existing forum.posts procedure, untouched, as the regression guard and
 * the always-one-tap-away escape hatch.
 *
 * Ranking is pure SQL against nightly-computed affinity rows (STEERING §11,
 * zero LLM). Constants live in shared/forumFeed.ts so the client's
 * "why am I seeing this" tooltip explains the real weights.
 *
 * Cursor stability: the For You score depends on now() via freshness decay,
 * so the first page stamps an asOf timestamp and every later page recomputes
 * freshness against that SAME clock, paging by (score, id). A scroll session
 * ranks against a frozen clock; a fresh visit gets a fresh clock.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { sql, eq, and, desc } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { forumPostReads, userFollows, bioregions } from "../../drizzle/schema";
import {
  FEED_WEIGHTS as W,
  FEED_CANDIDATE_DAYS,
  FEED_CANDIDATE_CAP,
  NEWCOMER_ACCOUNT_DAYS,
  NEWCOMER_MIN_INTERACTIONS,
} from "../../shared/forumFeed";

/** Opaque cursor: { a: asOf epoch ms, s: last score, i: last post id }. */
function encodeCursor(asOf: number, score: number, id: number): string {
  return Buffer.from(JSON.stringify({ a: asOf, s: score, i: id })).toString("base64url");
}
function decodeCursor(cursor: string): { a: number; s: number; i: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (typeof parsed.a === "number" && typeof parsed.s === "number" && typeof parsed.i === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

async function enrich(posts: any[]) {
  if (posts.length === 0) return [];
  const [authorsMap, cats, allBioregions] = await Promise.all([
    db.getUsersByIds(posts.map((p) => p.authorId)),
    db.listForumCategories(),
    (async () => {
      const d = await getDb();
      return d ? d.select().from(bioregions) : [];
    })(),
  ]);
  const bioregionMap = new Map(allBioregions.map((b: any) => [b.id, b.name]));
  return posts.map((p) => {
    const category = cats.find((c) => c.id === p.categoryId);
    return {
      ...p,
      authorName: authorsMap[p.authorId]?.name || "Anonymous",
      categoryName: category?.name || "Unknown",
      categorySlug: category?.slug || "general",
      bioregionName: p.bioregionId ? bioregionMap.get(p.bioregionId) ?? null : null,
    };
  });
}

export const forumFeedRouter = router({
  /**
   * Personalized feed. `latest` is deliberately NOT here (forum.posts is the
   * chronological source of truth); this serves for_you / following / my_threads.
   */
  feed: protectedProcedure
    .input(z.object({
      tab: z.enum(["for_you", "following", "my_threads"]),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) return { posts: [] as any[], nextCursor: null as string | null };
      const userId = ctx.user.id;
      const limit = input.limit;

      // ── my_threads: participated threads by new activity, unread inline ──
      if (input.tab === "my_threads") {
        const cur = input.cursor ? decodeCursor(input.cursor) : null;
        const [rows]: any = await db2.execute(sql`
          SELECT p.*, r.lastSeenReplyCount,
                 GREATEST(p.replyCount - COALESCE(r.lastSeenReplyCount, 0), 0) AS unreadReplies,
                 (r.id IS NULL) AS neverRead,
                 UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) AS activityTs
          FROM forumPosts p
          LEFT JOIN forum_post_reads r ON r.userId = ${userId} AND r.postId = p.id
          WHERE (p.authorId = ${userId}
                 OR EXISTS (SELECT 1 FROM forumReplies fr WHERE fr.postId = p.id AND fr.authorId = ${userId}))
            ${cur ? sql`AND (UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) < ${cur.s} OR (UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) = ${cur.s} AND p.id < ${cur.i}))` : sql``}
          ORDER BY activityTs DESC, p.id DESC
          LIMIT ${limit + 1}`);
        const list = rows as any[];
        const hasMore = list.length > limit;
        const page = hasMore ? list.slice(0, limit) : list;
        const last = page[page.length - 1];
        return {
          posts: await enrich(page),
          nextCursor: hasMore && last ? encodeCursor(0, Number(last.activityTs), last.id) : null,
        };
      }

      // ── following: followed users/categories/bioregions/tags + subscribed
      //    threads, chronological ─────────────────────────────────────────────
      if (input.tab === "following") {
        const cur = input.cursor ? decodeCursor(input.cursor) : null;
        const [rows]: any = await db2.execute(sql`
          SELECT p.*, UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) AS activityTs
          FROM forumPosts p
          WHERE (
              EXISTS (SELECT 1 FROM user_follows f WHERE f.userId = ${userId} AND (
                (f.targetType = 'user' AND f.targetId = CAST(p.authorId AS CHAR))
                OR (f.targetType = 'category' AND f.targetId = CAST(p.categoryId AS CHAR))
                OR (f.targetType = 'bioregion' AND p.bioregionId IS NOT NULL AND f.targetId = CAST(p.bioregionId AS CHAR))
                OR (f.targetType = 'tag' AND EXISTS (SELECT 1 FROM forum_post_tags pt WHERE pt.postId = p.id AND pt.tag = f.targetId))
              ))
              OR EXISTS (SELECT 1 FROM forum_subscriptions s WHERE s.userId = ${userId} AND s.postId = p.id AND s.muted = 0)
            )
            AND p.authorId NOT IN (
              SELECT m.mutedUserId FROM forum_user_mutes m
              WHERE m.userId = ${userId} AND m.scope IN ('feed', 'both')
              UNION SELECT -1
            )
            ${cur ? sql`AND (UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) < ${cur.s} OR (UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)) = ${cur.s} AND p.id < ${cur.i}))` : sql``}
          ORDER BY activityTs DESC, p.id DESC
          LIMIT ${limit + 1}`);
        const list = rows as any[];
        const hasMore = list.length > limit;
        const page = hasMore ? list.slice(0, limit) : list;
        const last = page[page.length - 1];
        return {
          posts: await enrich(page),
          nextCursor: hasMore && last ? encodeCursor(0, Number(last.activityTs), last.id) : null,
        };
      }

      // ── for_you: the scored feed ─────────────────────────────────────────
      const cur = input.cursor ? decodeCursor(input.cursor) : null;
      const asOf = cur ? cur.a : Date.now();
      const asOfSec = Math.floor(asOf / 1000);

      // Viewer context, one round of cheap lookups.
      const profile = await db.getPlayerProfileByUserId(userId);
      const myBioregion = profile?.bioregionId ?? -1;

      // Newcomer mode: young account or few interactions blends seed posts in.
      const accountAgeDays = ctx.user.createdAt
        ? (Date.now() - new Date(ctx.user.createdAt).getTime()) / 86400000
        : 999;
      let newcomer = accountAgeDays < NEWCOMER_ACCOUNT_DAYS;
      if (!newcomer) {
        const [ints]: any = await db2.execute(sql`
          SELECT (SELECT COUNT(*) FROM forumPosts WHERE authorId = ${userId})
               + (SELECT COUNT(*) FROM forumReplies WHERE authorId = ${userId})
               + (SELECT COUNT(*) FROM postReactions WHERE userId = ${userId}) AS c`);
        newcomer = Number((ints as any[])[0]?.c ?? 0) < NEWCOMER_MIN_INTERACTIONS;
      }
      const seedBoost = newcomer ? 1.0 : 0;

      // Sensing gate: does the viewer's tier allow setting a perspective?
      const [tierRows]: any = await db2.execute(
        sql`SELECT value FROM game_variables WHERE \`key\` = 'governance.sensing_min_citizen_tier' LIMIT 1`);
      const minTier = parseInt((tierRows as any[])[0]?.value ?? "1", 10);
      const canSense = Number(profile?.citizenshipTier ?? 0) >= minTier ? 1 : 0;

      const [rows]: any = await db2.execute(sql`
        SELECT * FROM (
          SELECT p.*,
            ROUND(
              (1 + LN(1 + p.replyCount + 2 * COALESCE(rc.cnt, 0)))
              * POW(0.5, GREATEST(${asOfSec} - UNIX_TIMESTAMP(COALESCE(p.lastReplyAt, p.createdAt)), 0) / 3600 / ${W.HALF_LIFE_HOURS})
              * (1
                 + ${W.CATEGORY_AFFINITY} * COALESCE(ac.score, 0)
                 + ${W.AUTHOR_AFFINITY} * COALESCE(au.score, 0)
                 + ${W.TAG_AFFINITY} * COALESCE(atag.score, 0)
                 + IF(p.bioregionId = ${myBioregion}, ${W.SAME_BIOREGION}, 0)
                 + IF(fol.postId IS NOT NULL, ${W.FOLLOWED}, 0)
                 + IF(p.governanceStage = 'sensing' AND ${canSense} = 1, ${W.SENSING_CAN_ACT}, 0)
                 + IF(p.isSeed = 1, ${seedBoost}, 0))
              * IF(r.id IS NULL, ${W.UNREAD_NEVER}, IF(p.replyCount > r.lastSeenReplyCount, ${W.UNREAD_NEW_REPLIES}, 1))
            , 6) AS feedScore,
            COALESCE(ac.score, 0) AS whyCategoryAffinity,
            COALESCE(au.score, 0) AS whyAuthorAffinity,
            COALESCE(atag.score, 0) AS whyTagAffinity,
            IF(p.bioregionId = ${myBioregion}, 1, 0) AS whySameBioregion,
            IF(fol.postId IS NOT NULL, 1, 0) AS whyFollowed,
            IF(p.governanceStage = 'sensing' AND ${canSense} = 1, 1, 0) AS whySensing,
            IF(r.id IS NULL, 1, 0) AS whyNeverRead,
            IF(r.id IS NOT NULL AND p.replyCount > r.lastSeenReplyCount, 1, 0) AS whyNewReplies,
            GREATEST(p.replyCount - COALESCE(r.lastSeenReplyCount, 0), 0) AS unreadReplies
          FROM (
            SELECT * FROM forumPosts
            WHERE COALESCE(lastReplyAt, createdAt) > FROM_UNIXTIME(${asOfSec}) - INTERVAL ${FEED_CANDIDATE_DAYS} DAY
            ORDER BY COALESCE(lastReplyAt, createdAt) DESC
            LIMIT ${FEED_CANDIDATE_CAP}
          ) p
          LEFT JOIN (SELECT postId, COUNT(*) cnt FROM postReactions WHERE postId IS NOT NULL GROUP BY postId) rc ON rc.postId = p.id
          LEFT JOIN user_forum_affinity ac ON ac.userId = ${userId} AND ac.dimension = 'category' AND ac.targetId = CAST(p.categoryId AS CHAR)
          LEFT JOIN user_forum_affinity au ON au.userId = ${userId} AND au.dimension = 'user' AND au.targetId = CAST(p.authorId AS CHAR)
          LEFT JOIN (
            SELECT pt.postId, MAX(a.score) AS score
            FROM forum_post_tags pt
            INNER JOIN user_forum_affinity a ON a.userId = ${userId} AND a.dimension = 'tag' AND a.targetId = pt.tag
            GROUP BY pt.postId
          ) atag ON atag.postId = p.id
          LEFT JOIN (
            SELECT DISTINCT p2.id AS postId FROM forumPosts p2
            INNER JOIN user_follows f ON f.userId = ${userId} AND (
              (f.targetType = 'user' AND f.targetId = CAST(p2.authorId AS CHAR))
              OR (f.targetType = 'category' AND f.targetId = CAST(p2.categoryId AS CHAR))
              OR (f.targetType = 'bioregion' AND p2.bioregionId IS NOT NULL AND f.targetId = CAST(p2.bioregionId AS CHAR))
              OR (f.targetType = 'tag' AND EXISTS (SELECT 1 FROM forum_post_tags pt2 WHERE pt2.postId = p2.id AND pt2.tag = f.targetId))
            )
          ) fol ON fol.postId = p.id
          LEFT JOIN forum_post_reads r ON r.userId = ${userId} AND r.postId = p.id
          WHERE p.authorId NOT IN (
            SELECT m.mutedUserId FROM forum_user_mutes m
            WHERE m.userId = ${userId} AND m.scope IN ('feed', 'both')
            UNION SELECT -1
          )
        ) scored
        ${cur ? sql`WHERE scored.feedScore < ${cur.s} OR (scored.feedScore = ${cur.s} AND scored.id < ${cur.i})` : sql``}
        ORDER BY scored.feedScore DESC, scored.id DESC
        LIMIT ${limit + 1}`);

      const list = rows as any[];
      const hasMore = list.length > limit;
      const page = hasMore ? list.slice(0, limit) : list;
      const last = page[page.length - 1];
      return {
        posts: await enrich(page),
        nextCursor: hasMore && last ? encodeCursor(asOf, Number(last.feedScore), last.id) : null,
      };
    }),

  /** Debounced from CommunityPost on view; powers every unread affordance. */
  markPostRead: protectedProcedure
    .input(z.object({ postId: z.number(), replyCount: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.VITEST || process.env.NODE_ENV === "test") return { success: true };
      const db2 = await getDb();
      if (!db2) return { success: false };
      await db2.insert(forumPostReads)
        .values({ userId: ctx.user.id, postId: input.postId, lastSeenReplyCount: input.replyCount, lastReadAt: new Date() })
        .onDuplicateKeyUpdate({
          set: { lastSeenReplyCount: input.replyCount, lastReadAt: new Date() },
        });
      return { success: true };
    }),

  // ─── Polymorphic follows ────────────────────────────────────────────────
  follows: router({
    toggle: protectedProcedure
      .input(z.object({
        targetType: z.enum(["user", "category", "bioregion", "tag"]),
        targetId: z.string().min(1).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.targetType === "user" && input.targetId === String(ctx.user.id)) {
          return { following: false };
        }
        const db2 = await getDb();
        if (!db2) return { following: false };
        const existing = await db2.select({ id: userFollows.id }).from(userFollows)
          .where(and(
            eq(userFollows.userId, ctx.user.id),
            eq(userFollows.targetType, input.targetType),
            eq(userFollows.targetId, input.targetId),
          ))
          .limit(1);
        if (existing.length > 0) {
          await db2.delete(userFollows).where(eq(userFollows.id, existing[0].id));
          return { following: false };
        }
        await db2.insert(userFollows)
          .values({ userId: ctx.user.id, targetType: input.targetType, targetId: input.targetId })
          .onDuplicateKeyUpdate({ set: { id: sql`id` } });
        return { following: true };
      }),

    isFollowing: protectedProcedure
      .input(z.object({
        targetType: z.enum(["user", "category", "bioregion", "tag"]),
        targetId: z.string().min(1).max(64),
      }))
      .query(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) return { following: false };
        const rows = await db2.select({ id: userFollows.id }).from(userFollows)
          .where(and(
            eq(userFollows.userId, ctx.user.id),
            eq(userFollows.targetType, input.targetType),
            eq(userFollows.targetId, input.targetId),
          ))
          .limit(1);
        return { following: rows.length > 0 };
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db2 = await getDb();
      if (!db2) return [];
      return db2.select().from(userFollows)
        .where(eq(userFollows.userId, ctx.user.id))
        .orderBy(desc(userFollows.createdAt))
        .limit(500);
    }),
  }),

  /** Feed weights for the client's "why am I seeing this" tooltip. Public
   * and constant: honesty about ranking is part of the product. */
  weights: publicProcedure.query(async () => {
    const { FEED_WEIGHTS, FEED_REASON_LABELS } = await import("../../shared/forumFeed");
    return { weights: FEED_WEIGHTS, labels: FEED_REASON_LABELS };
  }),
});
