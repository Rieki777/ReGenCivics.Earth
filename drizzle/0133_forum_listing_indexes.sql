-- 0133_forum_listing_indexes.sql
--
-- 2026-04-26 -- Compound + filter indexes for forum listing performance.
--
-- The forum listing query orders by (isPinned DESC, lastReplyAt DESC,
-- createdAt DESC) optionally filtered by categoryId. With a single-column
-- index on categoryId only, MySQL filesorts the result of every category
-- filter -- ~500ms once forumPosts has 10k+ rows.
--
-- Adds three indexes
--   1. Compound (categoryId, isPinned, lastReplyAt) on forumPosts so the
--      category-filtered listing can stream straight off the index. ASC
--      keys here for MySQL 5.7 compatibility, the optimizer can still
--      read them in DESC order.
--   2. Single-column on bioregionId for the bioregion-filtered listing.
--   3. Single-column on contributionScore in player_profiles for ranked
--      reads (leaderboard, voice weight calc).
--
-- Drops the now-redundant single-column forumPosts_categoryId_idx, the
-- new compound index handles every query the old index served.

CREATE INDEX forumPosts_listing_idx ON forumPosts (categoryId, isPinned, lastReplyAt);

CREATE INDEX forumPosts_bioregionId_idx ON forumPosts (bioregionId);

CREATE INDEX player_profiles_contributionScore_idx ON player_profiles (contributionScore);

DROP INDEX forumPosts_categoryId_idx ON forumPosts;
