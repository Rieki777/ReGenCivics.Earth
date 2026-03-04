CREATE TABLE `reviewer_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`notifyApplications` int NOT NULL DEFAULT 1,
	`notifyInvestors` int NOT NULL DEFAULT 1,
	`notifyInquiries` int NOT NULL DEFAULT 1,
	`inquiryTypes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewer_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviewer_emails_email_unique` UNIQUE(`email`)
);
