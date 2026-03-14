CREATE TABLE `custom_game_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`project_name` varchar(255) NOT NULL,
	`website_or_social` varchar(500),
	`land_status` varchar(100) NOT NULL,
	`community_stage` varchar(100) NOT NULL,
	`primary_goal` text NOT NULL,
	`timeline` varchar(100) NOT NULL,
	`budget_confirmed` tinyint NOT NULL DEFAULT 0,
	`referral_source` varchar(255),
	`additional_notes` text,
	`status` varchar(50) NOT NULL DEFAULT 'waitlist',
	`internal_notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_game_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(500),
	`description` text,
	`forumPostId` int,
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organisations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organisations_orgId_unique` UNIQUE(`orgId`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `user_bioregions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bioregionId` int NOT NULL,
	`isPrimary` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_bioregions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `status` enum('draft','submitted','under_review','approved','active','inactive','rejected','changes_requested') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationLat` double;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationLng` double;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationPrecision` enum('exact','city','region','hidden') DEFAULT 'region';--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationNomadic` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `locationEarth` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `applications_userId_idx` ON `applications` (`userId`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `forumPosts_categoryId_idx` ON `forumPosts` (`categoryId`);--> statement-breakpoint
CREATE INDEX `forumPosts_authorId_idx` ON `forumPosts` (`authorId`);--> statement-breakpoint
CREATE INDEX `forumReplies_postId_idx` ON `forumReplies` (`postId`);--> statement-breakpoint
CREATE INDEX `forumReplies_authorId_idx` ON `forumReplies` (`authorId`);