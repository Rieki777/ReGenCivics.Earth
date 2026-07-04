-- Quest and thread sort controls (0171).
-- forumPosts.sortOrder: explicit ascending position, lower shows first, used when a board sorts numerically.
ALTER TABLE forumPosts ADD COLUMN sortOrder INT NOT NULL DEFAULT 0;
-- forumCategories.sortMode: activity (latest reply first, the default) or numerical (by sortOrder ascending).
ALTER TABLE forumCategories ADD COLUMN sortMode VARCHAR(20) NOT NULL DEFAULT 'activity';
