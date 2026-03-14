CREATE TABLE `active_quest_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questId` varchar(100) NOT NULL,
	`questTitle` varchar(255) NOT NULL,
	`note` varchar(500),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `active_quest_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_rss_feeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('land_project','organisation') NOT NULL,
	`entityId` varchar(100) NOT NULL,
	`feedUrl` varchar(1000) NOT NULL,
	`label` varchar(255),
	`lastFetchedAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entity_rss_feeds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quest_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questId` varchar(100) NOT NULL,
	`questTitle` varchar(255) NOT NULL,
	`artifactType` enum('photo','text','link','video') NOT NULL DEFAULT 'text',
	`artifactUrl` varchar(1000),
	`artifactText` text,
	`caption` varchar(500),
	`visibility` enum('public','private') NOT NULL DEFAULT 'public',
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quest_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forumReports` ADD `severity` enum('soft','hard') DEFAULT 'soft' NOT NULL;--> statement-breakpoint
ALTER TABLE `org_claims` ADD `formData` json;--> statement-breakpoint
ALTER TABLE `org_claims` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `org_claims` ADD `submittedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `org_claims` ADD `reviewedAt` timestamp;