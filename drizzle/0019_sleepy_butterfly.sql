CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`campaignId` int,
	`contributionId` int,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
