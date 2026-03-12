-- Migration: Add generatedImageUrl to forumPosts and campaigns
-- Idempotent via stored procedures

DROP PROCEDURE IF EXISTS add_forum_image_url;
CREATE PROCEDURE add_forum_image_url()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'forumPosts'
      AND COLUMN_NAME = 'generatedImageUrl'
  ) THEN
    ALTER TABLE `forumPosts` ADD COLUMN `generatedImageUrl` varchar(512) NULL AFTER `lastReplyBy`;
  END IF;
END;
CALL add_forum_image_url();
DROP PROCEDURE IF EXISTS add_forum_image_url;

DROP PROCEDURE IF EXISTS add_campaign_image_url;
CREATE PROCEDURE add_campaign_image_url()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campaigns'
      AND COLUMN_NAME = 'generatedImageUrl'
  ) THEN
    ALTER TABLE `campaigns` ADD COLUMN `generatedImageUrl` varchar(512) NULL AFTER `reviewedAt`;
  END IF;
END;
CALL add_campaign_image_url();
DROP PROCEDURE IF EXISTS add_campaign_image_url;
