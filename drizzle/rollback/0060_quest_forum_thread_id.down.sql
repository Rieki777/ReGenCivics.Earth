-- Rollback for 0060_quest_forum_thread_id.sql
-- Removes questForumThreadId column from questSuggestions
ALTER TABLE questSuggestions DROP COLUMN IF EXISTS questForumThreadId;
