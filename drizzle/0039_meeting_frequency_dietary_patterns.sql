ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `meetingFrequency` enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus');
--> statement-breakpoint
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `dietaryPatterns` text;
