CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(500) NOT NULL,
	`template` varchar(100),
	`inquiryType` varchar(50),
	`inquiryId` int,
	`status` enum('sent','delivered','bounced','failed') NOT NULL DEFAULT 'sent',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`bounceReason` text,
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
