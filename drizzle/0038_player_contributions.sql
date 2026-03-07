CREATE TABLE `player_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profileId` int NOT NULL,
  `userId` int NOT NULL,
  `capitalType` enum('financial','social','cultural','living','intellectual','experiential','material','spiritual') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `estimatedValue` int,
  `projectName` varchar(255),
  `evidenceUrl` varchar(512),
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verifiedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_player_contributions_profileId` (`profileId`),
  KEY `idx_player_contributions_userId` (`userId`)
);
