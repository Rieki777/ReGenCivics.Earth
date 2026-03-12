CREATE TABLE `digests` (
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
CREATE TABLE `glossary_terms` (
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
CREATE TABLE `knowledge_map_entries` (
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
CREATE TABLE `project_connections` (
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
ALTER TABLE `forumPosts` ADD `tags` text;
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `postType` text;
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `threadStage` varchar(32);
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `chainId` int;
--> statement-breakpoint
ALTER TABLE `forumPosts` ADD `bioregionId` int;
--> statement-breakpoint
ALTER TABLE `forumReplies` ADD `triedThis` tinyint NOT NULL DEFAULT 0;
