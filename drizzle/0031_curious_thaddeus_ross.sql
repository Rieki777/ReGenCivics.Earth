CREATE TABLE `forumBans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bannedBy` int NOT NULL,
	`reason` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forumBans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forumModerators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`addedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forumModerators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forumReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`postId` int,
	`replyId` int,
	`reason` enum('spam','harassment','inappropriate','misinformation','other') NOT NULL,
	`details` text,
	`status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forumReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questSuggestionVotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suggestionId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questSuggestionVotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(100),
	`status` enum('open','planned','in_progress','completed','declined') NOT NULL DEFAULT 'open',
	`voteCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translationCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentType` enum('post','reply','quest_suggestion') NOT NULL,
	`contentId` int NOT NULL,
	`sourceLang` varchar(10) NOT NULL,
	`targetLang` varchar(10) NOT NULL,
	`translatedTitle` text,
	`translatedContent` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `translationCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bio` text,
	`location` varchar(255),
	`website` varchar(500),
	`preferredLanguage` varchar(10) DEFAULT 'en',
	`reputation` int NOT NULL DEFAULT 0,
	`postCount` int NOT NULL DEFAULT 0,
	`replyCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
