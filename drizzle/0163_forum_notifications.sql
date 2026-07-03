-- Forum notification spine (Phase 1 of the forum upgrade).
-- Consolidates the two parallel notification tables onto `notifications`:
--   1. Rename playerId -> userId (it always held users.id; the split name let
--      the two tables drift).
--   2. Widen the type enum to cover forum events + every legacy
--      user_notifications type (including claim_complete / claim_failed,
--      which writers already pushed past the old enum via `as any`).
--   3. Add actor/source/delivery columns + a dedupeKey unique key so
--      fire-and-forget hooks are idempotent under retries/restarts.
--   4. Back-fill all user_notifications rows (owner, read state, timestamps,
--      and a link matching the old bell's type-based navigation).
--   5. New tables: forum_mentions (idempotent re-parse on edit),
--      forum_subscriptions (thread follows), forum_user_mutes (person mute).
-- user_notifications is dropped in a later migration once no code references it.

ALTER TABLE notifications CHANGE COLUMN playerId userId INT NOT NULL;

ALTER TABLE notifications MODIFY COLUMN type ENUM(
  'forum_reply',
  'quest_complete',
  'fund_update',
  'vouch',
  'mention',
  'gratitude',
  'reaction_milestone',
  'guide_reply',
  'elder_reply',
  'thread_followed_activity',
  'governance_stage',
  'system',
  'contribution_accepted',
  'contribution_rejected',
  'campaign_milestone',
  'new_contribution',
  'claim_complete',
  'claim_failed'
) NOT NULL;

ALTER TABLE notifications ADD COLUMN actorId INT NULL;
ALTER TABLE notifications ADD COLUMN postId INT NULL;
ALTER TABLE notifications ADD COLUMN replyId INT NULL;
ALTER TABLE notifications ADD COLUMN campaignId INT NULL;
ALTER TABLE notifications ADD COLUMN contributionId INT NULL;
ALTER TABLE notifications ADD COLUMN emailedAt TIMESTAMP NULL;
ALTER TABLE notifications ADD COLUMN pushedAt TIMESTAMP NULL;
ALTER TABLE notifications ADD COLUMN dedupeKey VARCHAR(191) NULL;

ALTER TABLE notifications ADD UNIQUE KEY notifications_dedupe_uq (dedupeKey);

-- Back-fill legacy in-app notifications. Rows written past the old enum in
-- non-strict mode were stored as '' and become 'system'. The link mirrors the
-- old NotificationBell type map so migrated rows keep a working destination.
INSERT INTO notifications (userId, type, title, body, link, isRead, createdAt, campaignId, contributionId)
SELECT
  un.userId,
  CASE WHEN un.type IN ('contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','system') THEN un.type ELSE 'system' END,
  un.title,
  un.message,
  CASE
    WHEN un.type IN ('contribution_accepted','contribution_rejected','new_contribution') THEN '/profile?tab=contributions'
    WHEN un.type = 'campaign_milestone' AND un.campaignId IS NOT NULL THEN CONCAT('/campaigns/', un.campaignId)
    WHEN un.type = 'campaign_milestone' THEN '/crowdpooling'
    ELSE NULL
  END,
  IF(un.`read`, 1, 0),
  un.createdAt,
  un.campaignId,
  un.contributionId
FROM user_notifications un
ORDER BY un.id;

-- Mentions: unique key makes re-parsing on edit idempotent (only NEW handles
-- produce notifications).
CREATE TABLE IF NOT EXISTS forum_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sourceType ENUM('post','reply') NOT NULL,
  sourceId INT NOT NULL,
  mentionedUserId INT NOT NULL,
  mentionerUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY forum_mentions_source_user_uq (sourceType, sourceId, mentionedUserId),
  KEY forum_mentions_mentioned_idx (mentionedUserId)
);

-- Thread-level follows (auto on author/reply/mention, manual toggle in UI).
CREATE TABLE IF NOT EXISTS forum_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  postId INT NOT NULL,
  reason ENUM('authored','replied','mentioned','manual') NOT NULL,
  muted TINYINT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY forum_subscriptions_user_post_uq (userId, postId),
  KEY forum_subscriptions_post_idx (postId)
);

-- Person-level mute. scope 'notifications': their mentions/replies never
-- notify or email you. scope 'feed': reserved for the Phase 2 feed ranking.
CREATE TABLE IF NOT EXISTS forum_user_mutes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  mutedUserId INT NOT NULL,
  scope ENUM('notifications','feed','both') NOT NULL DEFAULT 'both',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY forum_user_mutes_user_muted_uq (userId, mutedUserId)
);

-- Seed subscriptions from existing activity so reply/thread notifications
-- work on live threads from day one, without waiting for new posts.
INSERT IGNORE INTO forum_subscriptions (userId, postId, reason)
SELECT p.authorId, p.id, 'authored' FROM forumPosts p;

INSERT IGNORE INTO forum_subscriptions (userId, postId, reason)
SELECT DISTINCT r.authorId, r.postId, 'replied'
FROM forumReplies r
INNER JOIN forumPosts p ON p.id = r.postId;
