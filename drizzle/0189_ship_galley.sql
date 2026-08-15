-- The Galley (ReGen Ship food experience): hauls, haul items, and remixes.
--
-- A crew logs what they gathered (galley_hauls + galley_haul_items) and remixes
-- it into dishes (galley_remixes) via the deterministic engine or the Ship's
-- Cook AI. Hauls and remixes belong to the crew's account and link to the active
-- voyage booking when there is one. Remixes carry a visibility choice and a
-- moderation flow into the shared "From the Crews" cookbook.

CREATE TABLE IF NOT EXISTS `galley_hauls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int,
  `userId` int NOT NULL,
  `title` varchar(200),
  `visibility` enum('crew','public') NOT NULL DEFAULT 'crew',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  PRIMARY KEY (`id`),
  KEY `galley_hauls_booking_idx` (`bookingId`),
  KEY `galley_hauls_user_idx` (`userId`),
  KEY `galley_hauls_visibility_idx` (`visibility`)
);

CREATE TABLE IF NOT EXISTS `galley_haul_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `haulId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `note` varchar(500),
  `photoUrl` varchar(512),
  `category` enum('produce','pantry','protein','sauce','other') NOT NULL DEFAULT 'produce',
  `source` enum('market','ship','forage','store') NOT NULL DEFAULT 'market',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `galley_haul_items_haul_idx` (`haulId`)
);

CREATE TABLE IF NOT EXISTS `galley_remixes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `haulId` int,
  `bookingId` int,
  `userId` int NOT NULL,
  `dishName` varchar(200) NOT NULL,
  `engine` enum('deterministic','cook') NOT NULL DEFAULT 'deterministic',
  `cardSlugs` json,
  `recipe` json,
  `conversation` json,
  `photoUrls` json,
  `visibility` enum('crew','public') NOT NULL DEFAULT 'crew',
  `publishedToCookbook` boolean NOT NULL DEFAULT false,
  `cookbookStatus` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
  `submittedToCookbookAt` timestamp NULL DEFAULT NULL,
  `approvedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `galley_remixes_haul_idx` (`haulId`),
  KEY `galley_remixes_user_idx` (`userId`),
  KEY `galley_remixes_published_idx` (`publishedToCookbook`),
  KEY `galley_remixes_visibility_idx` (`visibility`)
);
