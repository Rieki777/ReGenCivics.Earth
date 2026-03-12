CREATE TABLE `player_contributions` (
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
ALTER TABLE `applications` ADD `meetingFrequency` enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus');
--> statement-breakpoint
ALTER TABLE `applications` ADD `dietaryPatterns` text;
--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `emailDigestFrequency` enum('never','weekly','monthly','seasonal') DEFAULT 'monthly' NOT NULL;
