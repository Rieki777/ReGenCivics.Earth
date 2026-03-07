CREATE TABLE IF NOT EXISTS `contact_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactType` varchar(50) NOT NULL,
	`contactId` int NOT NULL,
	`note` text NOT NULL,
	`authorName` varchar(255) DEFAULT 'Admin',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactType` varchar(50) NOT NULL,
	`contactId` int NOT NULL,
	`tag` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `org_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orgType` enum('land_project','alliance_org') NOT NULL,
	`orgId` varchar(255) NOT NULL,
	`orgName` varchar(255) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_join_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submitterName` varchar(255) NOT NULL,
	`submitterEmail` varchar(320) NOT NULL,
	`submitterMessage` text,
	`targetType` enum('land_project','alliance_org') NOT NULL,
	`targetId` varchar(255) NOT NULL,
	`targetName` varchar(255) NOT NULL,
	`stewardUserId` int,
	`status` enum('pending','reviewed','accepted','rejected') NOT NULL DEFAULT 'pending',
	`connectInquiryId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_join_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `scheduled_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`inquiryType` varchar(50) DEFAULT 'general',
	`scheduledFor` timestamp NOT NULL,
	`status` enum('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'path');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `path` enum(''investor'',''land_project'',''ally'',''player'')', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'onboardingComplete');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `onboardingComplete` tinyint DEFAULT 0 NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'investmentRange');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `investmentRange` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'projectName');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `projectName` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'projectUrl');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `projectUrl` varchar(500)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'organizationName');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `organizationName` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'questInterests');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `questInterests` text', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'displayName');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `displayName` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userProfiles' AND COLUMN_NAME = 'avatarUrl');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `userProfiles` ADD `avatarUrl` varchar(500)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
