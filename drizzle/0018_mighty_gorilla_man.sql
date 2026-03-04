CREATE TABLE `campaign_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`viewDate` timestamp NOT NULL DEFAULT (now()),
	`visitorId` varchar(64),
	`userId` int,
	`referrer` varchar(512),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`userAgent` varchar(512),
	`deviceType` enum('desktop','mobile','tablet') DEFAULT 'desktop',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_analytics_id` PRIMARY KEY(`id`)
);
