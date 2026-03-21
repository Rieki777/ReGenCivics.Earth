-- Performance indexes for hot query paths
-- Forum posts: optimizes ORDER BY on listing pages
CREATE INDEX IF NOT EXISTS `idx_forum_posts_pinned_reply` ON `forum_posts` (`isPinned`, `lastReplyAt`);
CREATE INDEX IF NOT EXISTS `idx_forum_posts_created` ON `forum_posts` (`createdAt`);
CREATE INDEX IF NOT EXISTS `idx_forum_posts_bioregion` ON `forum_posts` (`bioregionId`);

-- Forum replies: optimizes replies listing
CREATE INDEX IF NOT EXISTS `idx_forum_replies_created` ON `forum_replies` (`createdAt`);

-- Newsletter subscribers: optimizes uniqueness checks
CREATE INDEX IF NOT EXISTS `idx_newsletter_email` ON `newsletter_subscribers` (`email`);

-- Applications: optimizes admin listing
CREATE INDEX IF NOT EXISTS `idx_applications_created` ON `applications` (`createdAt`);
CREATE INDEX IF NOT EXISTS `idx_applications_status` ON `applications` (`status`);

-- Player profiles: optimizes profile lookups
CREATE INDEX IF NOT EXISTS `idx_player_profiles_user` ON `player_profiles` (`userId`);
