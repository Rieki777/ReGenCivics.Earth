ALTER TABLE forumPosts ADD FULLTEXT INDEX idx_forum_fulltext (title, content);
