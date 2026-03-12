CREATE TABLE IF NOT EXISTS `digests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`periodStart` varchar(32) NOT NULL,
	`periodEnd` varchar(32) NOT NULL,
	`contentMd` text NOT NULL,
	`forumPostId` int,
	`sentAt` timestamp,
	CONSTRAINT `digests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `glossary_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`term` varchar(255) NOT NULL,
	`definition` text NOT NULL,
	`sourceThreadUrl` text,
	`proposedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	`status` varchar(32) NOT NULL DEFAULT 'proposed',
	CONSTRAINT `glossary_terms_id` PRIMARY KEY(`id`),
	CONSTRAINT `glossary_terms_term_unique` UNIQUE(`term`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `knowledge_map_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`postId` int,
	`title` varchar(255) NOT NULL,
	`summary` text,
	`url` varchar(500),
	`sortOrder` int NOT NULL DEFAULT 0,
	`suggestedByAI` tinyint NOT NULL DEFAULT 0,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_map_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postAId` int NOT NULL,
	`postBId` int NOT NULL,
	`connectionType` varchar(32) NOT NULL,
	`note` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fp_tags_042;
CREATE PROCEDURE add_fp_tags_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'tags'
  ) THEN
    ALTER TABLE `forumPosts` ADD `tags` text;
  END IF;
END;
CALL add_fp_tags_042();
DROP PROCEDURE IF EXISTS add_fp_tags_042;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fp_posttype_042;
CREATE PROCEDURE add_fp_posttype_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'postType'
  ) THEN
    ALTER TABLE `forumPosts` ADD `postType` text;
  END IF;
END;
CALL add_fp_posttype_042();
DROP PROCEDURE IF EXISTS add_fp_posttype_042;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fp_threadstage_042;
CREATE PROCEDURE add_fp_threadstage_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'threadStage'
  ) THEN
    ALTER TABLE `forumPosts` ADD `threadStage` varchar(32);
  END IF;
END;
CALL add_fp_threadstage_042();
DROP PROCEDURE IF EXISTS add_fp_threadstage_042;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fp_chainid_042;
CREATE PROCEDURE add_fp_chainid_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'chainId'
  ) THEN
    ALTER TABLE `forumPosts` ADD `chainId` int;
  END IF;
END;
CALL add_fp_chainid_042();
DROP PROCEDURE IF EXISTS add_fp_chainid_042;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fp_bioregionid_042;
CREATE PROCEDURE add_fp_bioregionid_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'bioregionId'
  ) THEN
    ALTER TABLE `forumPosts` ADD `bioregionId` int;
  END IF;
END;
CALL add_fp_bioregionid_042();
DROP PROCEDURE IF EXISTS add_fp_bioregionid_042;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_fr_triedthis_042;
CREATE PROCEDURE add_fr_triedthis_042()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumReplies' AND COLUMN_NAME = 'triedThis'
  ) THEN
    ALTER TABLE `forumReplies` ADD `triedThis` tinyint NOT NULL DEFAULT 0;
  END IF;
END;
CALL add_fr_triedthis_042();
DROP PROCEDURE IF EXISTS add_fr_triedthis_042;
