ALTER TABLE `campaigns` MODIFY COLUMN `status` enum('draft','pending_review','active','funded','completed','cancelled','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `campaigns` ADD `durationDays` int DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `startedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `reviewedAt` timestamp;