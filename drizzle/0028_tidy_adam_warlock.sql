CREATE TABLE `campaign_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(255),
	`mimeType` varchar(100),
	`fileSize` int,
	`category` enum('land','team','progress','infrastructure','community','other') NOT NULL DEFAULT 'other',
	`caption` varchar(500),
	`isCover` tinyint NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_images_id` PRIMARY KEY(`id`)
);
