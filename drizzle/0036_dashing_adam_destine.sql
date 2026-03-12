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
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `path` enum('investor','land_project','ally','player');
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `onboardingComplete` tinyint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `investmentRange` varchar(255);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `projectName` varchar(255);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `projectUrl` varchar(500);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `organizationName` varchar(255);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `questInterests` text;
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `displayName` varchar(255);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD COLUMN IF NOT EXISTS `avatarUrl` varchar(500);
