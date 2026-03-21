-- Migration: Add questForumThreadId to quests table
-- Links each quest to its auto-created forum discussion thread

ALTER TABLE `quests` ADD COLUMN `questForumThreadId` int NULL DEFAULT NULL;
