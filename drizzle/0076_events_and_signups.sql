-- Migration 0076: Add events and event_signups tables
-- Run this in Railway > MySQL > Data tab, or via the Node.js migration script

CREATE TABLE IF NOT EXISTS `events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('open','episode','special') NOT NULL DEFAULT 'open',
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NULL,
  `timezone` varchar(10) DEFAULT 'UTC',
  `zoomUrl` varchar(512),
  `riversideRoomUrl` varchar(512),
  `youtubeUrl` varchar(512),
  `recordingId` int,
  `status` enum('upcoming','live','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  `season` varchar(50),
  `episodeNumber` int,
  `reminderSent` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX `events_type_idx` ON `events` (`type`);
CREATE INDEX `events_startTime_idx` ON `events` (`startTime`);
CREATE INDEX `events_status_idx` ON `events` (`status`);
CREATE INDEX `events_season_idx` ON `events` (`season`);

CREATE TABLE IF NOT EXISTS `event_signups` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `eventId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `eventSignups_eventId_email_unique` (`eventId`, `email`)
);

CREATE INDEX `eventSignups_eventId_idx` ON `event_signups` (`eventId`);
CREATE INDEX `eventSignups_email_idx` ON `event_signups` (`email`);
