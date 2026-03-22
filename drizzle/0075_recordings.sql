-- Migration 0075: recordings table
-- Stores Riverside.fm recording metadata received via webhook

CREATE TABLE IF NOT EXISTS `recordings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `riversideId` varchar(255) NOT NULL,
  `riversideUrl` varchar(512),
  `title` varchar(255) NOT NULL,
  `sessionDate` timestamp,
  `durationSeconds` int,
  `youtubeUrl` varchar(512),
  `thumbnailUrl` varchar(512),
  `transcript` text,
  `aiSummary` text,
  `emailSent` tinyint NOT NULL DEFAULT 0,
  `forumPostId` int,
  `featured` tinyint NOT NULL DEFAULT 0,
  `rawWebhook` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX `recordings_riversideId_unique` ON `recordings` (`riversideId`);
CREATE INDEX `recordings_riversideId_idx` ON `recordings` (`riversideId`);
CREATE INDEX `recordings_sessionDate_idx` ON `recordings` (`sessionDate`);
CREATE INDEX `recordings_featured_idx` ON `recordings` (`featured`);
