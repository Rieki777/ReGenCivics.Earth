CREATE TABLE `player_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`displayName` varchar(255) NOT NULL,
	`email` varchar(320),
	`bio` text,
	`avatarUrl` varchar(512),
	`baseAccountName` varchar(255),
	`hyphaProfileUrl` varchar(512),
	`walletAddress` varchar(255),
	`badges` text,
	`questsCompleted` text,
	`totalContributionValue` int NOT NULL DEFAULT 0,
	`rvoiceBalance` int NOT NULL DEFAULT 0,
	`rgenBalance` int NOT NULL DEFAULT 0,
	`lastTokenSync` timestamp,
	`isVerified` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('how_to_play','how_to_participate','how_to_invest','how_to_apply','how_to_contribute','other') NOT NULL DEFAULT 'other',
	`submitterEmail` varchar(320),
	`submitterName` varchar(255),
	`voteCount` int NOT NULL DEFAULT 0,
	`voterEmails` text,
	`status` enum('pending','approved','in_production','completed','rejected') NOT NULL DEFAULT 'pending',
	`completedVideoUrl` varchar(512),
	`completedBlogSlug` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_suggestions_id` PRIMARY KEY(`id`)
);
