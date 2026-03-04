CREATE TABLE `crowd_pooling_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int,
	`contributorName` varchar(255) NOT NULL,
	`contributorEmail` varchar(320) NOT NULL,
	`proposalData` text NOT NULL,
	`totalContribution` int NOT NULL DEFAULT 0,
	`financialContribution` int NOT NULL DEFAULT 0,
	`futureValueContribution` int NOT NULL DEFAULT 0,
	`status` enum('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
	`contributorNotes` text,
	`reviewNotes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crowd_pooling_proposals_id` PRIMARY KEY(`id`)
);
