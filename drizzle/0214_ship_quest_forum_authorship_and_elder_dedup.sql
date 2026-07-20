-- Item 17 (forum bugs) for the ReGen Ship "Free Passage Quest" threads.
--
-- Bug 1 (authorship): the Free Passage Quest forum threads were seeded under
-- Rieki's personal account (scripts/seed-ship-quest.ts used REVIEWER_USER_ID = 1
-- as the thread author), so they show publicly as "Rieki Cordon (Rieki)". These
-- are CORE / ReGen Ship anchor threads and belong to a non-personal identity.
-- Migration 0121 swept forum posts to the team user, but these threads were
-- seeded afterwards and reverted to Rieki. Attribute them to "CORE + ReGen Ship".
--
-- Bug 2 (elder comments, part 1 of 2): AI Elder Anastasia has two top-level
-- comments on some of these threads while AI Elder Yeshua has none. This removes
-- the duplicate Anastasia comment on each affected thread, keeping one. The
-- missing Yeshua comments are added separately, after human review of their voice
-- (scripts/seed-ship-quest-elder-comments.ts), per the elders' governance.
--
-- Idempotent: safe to run more than once and a no-op on a database without the
-- affected data.

-- 1. A non-personal system identity for CORE / ReGen Ship anchor content.
--    loginMethod 'system' marks it non-human, like the elder bot users.
INSERT IGNORE INTO users (openId, name, handle, loginMethod, role)
VALUES ('system:core-regen-ship', 'CORE + ReGen Ship', 'core-regen-ship', 'system', 'user');

-- 2. Re-attribute every Free Passage Quest thread (each is linked from
--    ship_quest_actions.forumPostId) away from any personal account to the
--    CORE + ReGen Ship identity.
UPDATE forumPosts fp
JOIN ship_quest_actions a ON a.forumPostId = fp.id
JOIN users core ON core.openId = 'system:core-regen-ship'
SET fp.authorId = core.id
WHERE fp.authorId <> core.id;

-- 3. De-duplicate Anastasia's top-level comments on the quest threads. Keep the
--    most recent comment per thread (the more polished pass, and it avoids a
--    repeated opening line across adjacent threads); delete the earlier ones.
DELETE r FROM forumReplies r
JOIN ship_quest_actions a ON a.forumPostId = r.postId
JOIN users an ON an.id = r.authorId AND an.openId = 'bot:anastasia'
JOIN (
  SELECT r2.postId AS postId, MAX(r2.id) AS keepId
  FROM forumReplies r2
  JOIN ship_quest_actions a2 ON a2.forumPostId = r2.postId
  JOIN users an2 ON an2.id = r2.authorId AND an2.openId = 'bot:anastasia'
  WHERE r2.parentReplyId IS NULL
  GROUP BY r2.postId
) keep ON keep.postId = r.postId
WHERE r.parentReplyId IS NULL AND r.id <> keep.keepId;

-- 4. Reconcile reply metadata on every Free Passage Quest thread. The earlier
--    raw inserts of the elder comments bypassed the reply-count maintenance, so
--    replyCount/lastReplyAt/lastReplyBy are stale (0 / null). Recompute from the
--    surviving replies.
UPDATE forumPosts fp
JOIN ship_quest_actions a ON a.forumPostId = fp.id
LEFT JOIN (
  SELECT postId, COUNT(*) AS n, MAX(createdAt) AS lastAt
  FROM forumReplies
  GROUP BY postId
) rc ON rc.postId = fp.id
SET fp.replyCount = COALESCE(rc.n, 0),
    fp.lastReplyAt = rc.lastAt,
    fp.lastReplyBy = (
      SELECT r3.authorId FROM forumReplies r3
      WHERE r3.postId = fp.id
      ORDER BY r3.createdAt DESC, r3.id DESC
      LIMIT 1
    );
