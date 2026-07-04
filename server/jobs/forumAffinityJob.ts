/**
 * Nightly forum affinity computation (Phase 2). Deterministic, zero LLM.
 *
 * One pass over the last 90 days of posts, replies, reactions, and gratitude
 * builds per-user relevance scores along three dimensions:
 *   category — where you post, reply, react
 *   user     — whose work you reply to, thank, react to
 *   tag      — which tags you engage with (via forum_post_tags)
 * Every event is weight × 0.5^(ageDays/30), normalized per user to 0..1,
 * bulk-upserted into user_forum_affinity. Rows under MIN_SCORE are deleted.
 * Idempotent and restart-safe: recomputes from source data every run.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { AFFINITY_WEIGHTS as W } from "../../shared/forumFeed";

type Dimension = "category" | "user" | "tag";
type Key = string; // `${userId}:${dimension}:${targetId}`

export async function runForumAffinityJob(): Promise<{ users: number; rows: number }> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return { users: 0, rows: 0 };
  const db = await getDb();
  if (!db) return { users: 0, rows: 0 };
  const started = Date.now();

  const scores = new Map<Key, number>();
  const add = (userId: number, dimension: Dimension, targetId: string | number, weight: number, ageDays: number) => {
    const decayed = weight * Math.pow(0.5, ageDays / W.DECAY_HALF_LIFE_DAYS);
    const key = `${userId}:${dimension}:${targetId}`;
    scores.set(key, (scores.get(key) ?? 0) + decayed);
  };

  // Each source query returns (actorId, targetUserId?, categoryId?, postId, ageDays).
  // DATEDIFF is enough resolution for a 30-day half-life.
  const [posts]: any = await db.execute(sql`
    SELECT p.authorId AS userId, p.categoryId, p.id AS postId, DATEDIFF(NOW(), p.createdAt) AS ageDays
    FROM forumPosts p
    WHERE p.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)`);
  for (const r of posts as any[]) {
    add(r.userId, "category", r.categoryId, W.POST, r.ageDays);
  }

  const [replies]: any = await db.execute(sql`
    SELECT r.authorId AS userId, p.categoryId, p.authorId AS postAuthorId, r.postId,
           DATEDIFF(NOW(), r.createdAt) AS ageDays
    FROM forumReplies r
    INNER JOIN forumPosts p ON p.id = r.postId
    WHERE r.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)`);
  for (const r of replies as any[]) {
    add(r.userId, "category", r.categoryId, W.REPLY, r.ageDays);
    if (r.postAuthorId !== r.userId) add(r.userId, "user", r.postAuthorId, W.USER_REPLY, r.ageDays);
  }

  const [reactions]: any = await db.execute(sql`
    SELECT pr.userId, p.categoryId, p.authorId AS postAuthorId, p.id AS postId,
           DATEDIFF(NOW(), pr.createdAt) AS ageDays
    FROM postReactions pr
    INNER JOIN forumPosts p ON p.id = COALESCE(pr.postId, (SELECT fr.postId FROM forumReplies fr WHERE fr.id = pr.replyId))
    WHERE pr.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)`);
  for (const r of reactions as any[]) {
    add(r.userId, "category", r.categoryId, W.REACTION, r.ageDays);
    if (r.postAuthorId !== r.userId) add(r.userId, "user", r.postAuthorId, W.USER_REACTION, r.ageDays);
  }

  const [gratitude]: any = await db.execute(sql`
    SELECT g.senderId AS userId, g.recipientId, DATEDIFF(NOW(), g.createdAt) AS ageDays
    FROM gratitudeLog g
    WHERE g.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)`);
  for (const r of gratitude as any[]) {
    add(r.userId, "user", r.recipientId, W.USER_GRATITUDE, r.ageDays);
  }

  // Tag affinity: events on tagged posts, via the junction projection.
  const [tagEvents]: any = await db.execute(sql`
    SELECT x.userId, t.tag, x.weight, x.ageDays FROM (
      SELECT p.authorId AS userId, p.id AS postId, ${W.POST} AS weight, DATEDIFF(NOW(), p.createdAt) AS ageDays
      FROM forumPosts p WHERE p.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)
      UNION ALL
      SELECT r.authorId, r.postId, ${W.REPLY}, DATEDIFF(NOW(), r.createdAt)
      FROM forumReplies r WHERE r.createdAt > (NOW() - INTERVAL ${W.LOOKBACK_DAYS} DAY)
    ) x
    INNER JOIN forum_post_tags t ON t.postId = x.postId`);
  for (const r of tagEvents as any[]) {
    add(r.userId, "tag", r.tag, Number(r.weight), r.ageDays);
  }

  // Normalize per user to 0..1 (divide by that user's max across dimensions),
  // drop rows under the floor, and bulk upsert.
  const maxPerUser = new Map<number, number>();
  for (const [key, score] of scores) {
    const userId = Number(key.split(":")[0]);
    maxPerUser.set(userId, Math.max(maxPerUser.get(userId) ?? 0, score));
  }

  const rows: { userId: number; dimension: Dimension; targetId: string; score: number }[] = [];
  for (const [key, score] of scores) {
    const [userIdStr, dimension, ...rest] = key.split(":");
    const userId = Number(userIdStr);
    const normalized = score / (maxPerUser.get(userId) || 1);
    if (normalized < W.MIN_SCORE) continue;
    rows.push({ userId, dimension: dimension as Dimension, targetId: rest.join(":"), score: Number(normalized.toFixed(4)) });
  }

  // Full refresh: computed values are only valid as a set (normalization),
  // so clear and rewrite rather than leaving stale rows behind.
  await db.execute(sql`DELETE FROM user_forum_affinity`);
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = sql.join(
      batch.map((r) => sql`(${r.userId}, ${r.dimension}, ${r.targetId}, ${r.score})`),
      sql`, `
    );
    await db.execute(sql`
      INSERT INTO user_forum_affinity (userId, dimension, targetId, score) VALUES ${values}
      ON DUPLICATE KEY UPDATE score = VALUES(score), computedAt = NOW()`);
  }

  const users = maxPerUser.size;
  console.log(`[ForumAffinityJob] ${rows.length} rows for ${users} users in ${Date.now() - started}ms`);
  return { users, rows: rows.length };
}
