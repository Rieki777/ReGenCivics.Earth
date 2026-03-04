CREATE TABLE `saved_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`projectName` varchar(255),
	`targetAmount` int,
	`currency` varchar(10) DEFAULT 'USD',
	`contributorName` varchar(255),
	`contributorEmail` varchar(320),
	`immediateContributions` text,
	`futureContributions` text,
	`totalImmediateValue` int DEFAULT 0,
	`totalFutureValue` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_contributions_id` PRIMARY KEY(`id`)
);
