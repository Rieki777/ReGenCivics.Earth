ALTER TABLE `notificationPreferences` MODIFY COLUMN `applicationSubmissions` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `investorInquiries` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `loiSubmissions` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `campaignContributions` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `newsletterSignups` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `newsletterSignups` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `allianceRequests` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `workWithRegens` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `roleRequests` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `applicationEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `investorEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `allianceEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `workWithRegensEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `roleRequestEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `loiEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `campaignEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `newsletterEmails` text;--> statement-breakpoint
ALTER TABLE `notificationPreferences` DROP COLUMN `connectFormSubmissions`;