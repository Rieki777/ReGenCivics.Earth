CREATE TABLE IF NOT EXISTS `custom_game_inquiries` (
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
CREATE TABLE IF NOT EXISTS `organisations` (
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
CREATE TABLE IF NOT EXISTS `site_settings` (
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_bioregions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bioregionId` int NOT NULL,
	`isPrimary` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_bioregions_id` PRIMARY KEY(`id`)
);
