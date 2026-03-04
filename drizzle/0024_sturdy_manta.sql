ALTER TABLE `general_inquiries` ADD `organizationRole` text;--> statement-breakpoint
ALTER TABLE `general_inquiries` ADD `organizationScope` varchar(50);--> statement-breakpoint
ALTER TABLE `general_inquiries` ADD `organizationLatitude` double;--> statement-breakpoint
ALTER TABLE `general_inquiries` ADD `organizationLongitude` double;--> statement-breakpoint
ALTER TABLE `general_inquiries` ADD `organizationCountry` varchar(100);