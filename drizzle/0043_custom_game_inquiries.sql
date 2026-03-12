-- Migration: Add custom_game_inquiries table for /custom-games waitlist
CREATE TABLE IF NOT EXISTS `custom_game_inquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `website_or_social` varchar(500),
  `land_status` varchar(100) NOT NULL,
  `community_stage` varchar(100) NOT NULL,
  `primary_goal` text NOT NULL,
  `timeline` varchar(100) NOT NULL,
  `budget_confirmed` tinyint NOT NULL DEFAULT 0,
  `referral_source` varchar(255),
  `additional_notes` text,
  `status` varchar(50) NOT NULL DEFAULT 'waitlist',
  `internal_notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
