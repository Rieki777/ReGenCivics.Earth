CREATE TABLE IF NOT EXISTS `bioregions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255),
	`realm` text,
	`subrealm` text,
	`source` varchar(64),
	`approved` tinyint NOT NULL DEFAULT 1,
	`submittedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bioregions_id` PRIMARY KEY(`id`),
	CONSTRAINT `bioregions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `needs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `upcoming_amas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`hostName` varchar(255) NOT NULL,
	`date` varchar(32) NOT NULL,
	`time` varchar(64) NOT NULL,
	`timezone` varchar(64) NOT NULL,
	`forumThreadUrl` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upcoming_amas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_campaigns_img_url_041;
CREATE PROCEDURE add_campaigns_img_url_041()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'generatedImageUrl'
  ) THEN
    ALTER TABLE `campaigns` ADD `generatedImageUrl` varchar(512);
  END IF;
END;
CALL add_campaigns_img_url_041();
DROP PROCEDURE IF EXISTS add_campaigns_img_url_041;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_forumposts_img_url_041;
CREATE PROCEDURE add_forumposts_img_url_041()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forumPosts' AND COLUMN_NAME = 'generatedImageUrl'
  ) THEN
    ALTER TABLE `forumPosts` ADD `generatedImageUrl` varchar(512);
  END IF;
END;
CALL add_forumposts_img_url_041();
DROP PROCEDURE IF EXISTS add_forumposts_img_url_041;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_collab_status_041;
CREATE PROCEDURE add_collab_status_041()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_profiles' AND COLUMN_NAME = 'collaborationStatus'
  ) THEN
    ALTER TABLE `player_profiles` ADD `collaborationStatus` text;
  END IF;
END;
CALL add_collab_status_041();
DROP PROCEDURE IF EXISTS add_collab_status_041;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_dreaming_of_041;
CREATE PROCEDURE add_dreaming_of_041()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_profiles' AND COLUMN_NAME = 'dreamingOf'
  ) THEN
    ALTER TABLE `player_profiles` ADD `dreamingOf` text;
  END IF;
END;
CALL add_dreaming_of_041();
DROP PROCEDURE IF EXISTS add_dreaming_of_041;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_bioregion_id_041;
CREATE PROCEDURE add_bioregion_id_041()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_profiles' AND COLUMN_NAME = 'bioregionId'
  ) THEN
    ALTER TABLE `player_profiles` ADD `bioregionId` int;
  END IF;
END;
CALL add_bioregion_id_041();
DROP PROCEDURE IF EXISTS add_bioregion_id_041;
