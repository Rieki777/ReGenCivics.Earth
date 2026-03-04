CREATE TABLE `siteBanners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayStartDate` timestamp,
	`displayEndDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteBanners_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteBanners_key_unique` UNIQUE(`key`)
);
