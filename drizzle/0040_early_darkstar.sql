CREATE TABLE IF NOT EXISTS `player_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`userId` int NOT NULL,
	`capitalType` enum('financial','social','cultural','living','intellectual','experiential','material','spiritual') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`estimatedValue` int,
	`projectName` varchar(255),
	`evidenceUrl` varchar(512),
	`status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_meeting_frequency_040;
CREATE PROCEDURE add_meeting_frequency_040()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'meetingFrequency'
  ) THEN
    ALTER TABLE `applications` ADD `meetingFrequency` enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus');
  END IF;
END;
CALL add_meeting_frequency_040();
DROP PROCEDURE IF EXISTS add_meeting_frequency_040;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_dietary_patterns_040;
CREATE PROCEDURE add_dietary_patterns_040()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'dietaryPatterns'
  ) THEN
    ALTER TABLE `applications` ADD `dietaryPatterns` text;
  END IF;
END;
CALL add_dietary_patterns_040();
DROP PROCEDURE IF EXISTS add_dietary_patterns_040;
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_email_digest_freq_040;
CREATE PROCEDURE add_email_digest_freq_040()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_profiles' AND COLUMN_NAME = 'emailDigestFrequency'
  ) THEN
    ALTER TABLE `player_profiles` ADD `emailDigestFrequency` enum('never','weekly','monthly','seasonal') DEFAULT 'monthly' NOT NULL;
  END IF;
END;
CALL add_email_digest_freq_040();
DROP PROCEDURE IF EXISTS add_email_digest_freq_040;
