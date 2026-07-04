-- The living feed (Phase 2 of the forum upgrade). All deterministic.
--   forum_post_reads: unread state, the foundation for every affordance.
--   user_follows: one polymorphic follow table (user/category/bioregion/tag).
--   user_forum_affinity: nightly-computed, read-optimized relevance scores.
--   forum_post_tags: query projection of forumPosts.tags, which is a TEXT
--     column holding a JSON string and therefore only matchable with LIKE
--     scans. Backfilled below (the tag vocabulary is exactly three values),
--     maintained on createPost. The tags text column stays: clients read it.
--   forumPosts.capital: optional Root-of-Capital a seeking-support post
--     declares. The feed's capitals boost stays disabled until the composer
--     picker ships (Phase 3.3) and posts start carrying values.

CREATE TABLE IF NOT EXISTS forum_post_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  postId INT NOT NULL,
  lastReadAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastSeenReplyCount INT NOT NULL DEFAULT 0,
  UNIQUE KEY forum_post_reads_user_post_uq (userId, postId),
  KEY forum_post_reads_user_read_idx (userId, lastReadAt)
);

CREATE TABLE IF NOT EXISTS user_follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  targetType ENUM('user','category','bioregion','tag') NOT NULL,
  targetId VARCHAR(64) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY user_follows_uq (userId, targetType, targetId),
  KEY user_follows_target_idx (targetType, targetId)
);

CREATE TABLE IF NOT EXISTS user_forum_affinity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  dimension ENUM('category','user','tag') NOT NULL,
  targetId VARCHAR(64) NOT NULL,
  score DECIMAL(8,4) NOT NULL DEFAULT 0,
  computedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY user_forum_affinity_uq (userId, dimension, targetId),
  KEY user_forum_affinity_user_idx (userId, dimension)
);

CREATE TABLE IF NOT EXISTS forum_post_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  postId INT NOT NULL,
  tag VARCHAR(64) NOT NULL,
  UNIQUE KEY forum_post_tags_uq (postId, tag),
  KEY forum_post_tags_tag_idx (tag)
);

ALTER TABLE forumPosts ADD COLUMN capital ENUM('intellectual','social','material','financial','living','cultural','spiritual','experiential','health') NULL;

INSERT IGNORE INTO forum_post_tags (postId, tag)
SELECT id, 'lesson' FROM forumPosts WHERE tags LIKE '%"lesson"%';

INSERT IGNORE INTO forum_post_tags (postId, tag)
SELECT id, 'seeking-support' FROM forumPosts WHERE tags LIKE '%"seeking-support"%';

INSERT IGNORE INTO forum_post_tags (postId, tag)
SELECT id, 'offering-support' FROM forumPosts WHERE tags LIKE '%"offering-support"%';
