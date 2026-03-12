-- Migration: Add user_bioregions junction table for multi-bioregion selection
CREATE TABLE IF NOT EXISTS `user_bioregions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `bioregionId` int NOT NULL,
  `isPrimary` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_bioregion` (`userId`, `bioregionId`)
);
