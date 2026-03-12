CREATE TABLE `bioregions` (
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
CREATE TABLE `gifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `needs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upcoming_amas` (
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
ALTER TABLE `campaigns` ADD `generatedImageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `generatedImageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `collaborationStatus` text;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `dreamingOf` text;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `bioregionId` int;