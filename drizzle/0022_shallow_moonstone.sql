CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationSubmissions` boolean NOT NULL DEFAULT true,
	`investorInquiries` boolean NOT NULL DEFAULT true,
	`connectFormSubmissions` boolean NOT NULL DEFAULT true,
	`loiSubmissions` boolean NOT NULL DEFAULT true,
	`campaignContributions` boolean NOT NULL DEFAULT true,
	`newsletterSignups` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`)
);
