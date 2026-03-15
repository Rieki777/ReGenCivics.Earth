CREATE TABLE `questEndorsements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` varchar(255) NOT NULL,
	`orgType` enum('land_project','alliance_org') NOT NULL,
	`questId` varchar(100) NOT NULL,
	`endorsementType` enum('recommended','required') NOT NULL DEFAULT 'recommended',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questEndorsements_id` PRIMARY KEY(`id`)
);
