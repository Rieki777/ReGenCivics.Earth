-- 0175: ReGen Ship (CORE program) table family.
--
-- The regenerative pirate ship + ReGen Fleet. Treasure map locations, voyage
-- bookings, the Maiden Voyage Quest, concierge sessions, seed plantings, the
-- public voyage log, digital passport, and live position pings. See
-- CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md and the ReGen Ship ADRs.
--
-- NOTE: no apostrophes inside string literals (the migration splitter does not
-- handle doubled-quote escapes). Loose-FK convention: nullable INT columns
-- reference other tables by id with no enforced constraint.

CREATE TABLE IF NOT EXISTS `ship_locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL,
  `type` ENUM('land_project','spring','waterfall','lake','geology','forest','food_forest','seed_site','boondock','event_venue') NOT NULL,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `bioregion` VARCHAR(64) NOT NULL DEFAULT 'cascadia',
  `description` TEXT NULL,
  `websiteUrl` VARCHAR(512) NULL,
  `imageUrl` VARCHAR(512) NULL,
  `isVerified` BOOLEAN NOT NULL DEFAULT 0,
  `addedByUserId` INT NULL,
  `linkedEventId` INT NULL,
  `linkedApplicationId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_locations_slug_uq` (`slug`),
  KEY `ship_locations_type_idx` (`type`),
  KEY `ship_locations_verified_idx` (`isVerified`),
  KEY `ship_locations_bioregion_idx` (`bioregion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_bookings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `guests` INT NOT NULL DEFAULT 1,
  `status` ENUM('requested','approved','platform_pending','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'requested',
  `platformBookingRef` VARCHAR(255) NULL,
  `dietCommitmentAt` TIMESTAMP NULL,
  `waterDoctrineCommitmentAt` TIMESTAMP NULL,
  `offeringDonationId` INT NULL,
  `referredByUserId` INT NULL,
  `isWinnerVoyage` BOOLEAN NOT NULL DEFAULT 0,
  `isGifted` BOOLEAN NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_bookings_status_idx` (`status`),
  KEY `ship_bookings_start_idx` (`startDate`),
  KEY `ship_bookings_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_blackout_dates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `reason` VARCHAR(255) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_blackout_start_idx` (`startDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_pricing_windows` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  `label` VARCHAR(120) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_pricing_start_idx` (`startDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_quest_actions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(120) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `isRequired` BOOLEAN NOT NULL DEFAULT 1,
  `proofType` ENUM('link','photo','referral_shortlisted','game_quest','forum') NOT NULL DEFAULT 'link',
  `linkedQuestId` INT NULL,
  `forumPostId` INT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_quest_actions_slug_uq` (`slug`),
  KEY `ship_quest_actions_sort_idx` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_quest_completions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `actionId` INT NOT NULL,
  `proofUrl` VARCHAR(512) NULL,
  `note` TEXT NULL,
  `status` ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verifiedByUserId` INT NULL,
  `verifiedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_quest_completion_uq` (`userId`, `actionId`),
  KEY `ship_quest_completion_user_idx` (`userId`),
  KEY `ship_quest_completion_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_nominations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nominatorUserId` INT NULL,
  `nomineeName` VARCHAR(200) NOT NULL,
  `nomineeContact` VARCHAR(320) NULL,
  `reason` TEXT NOT NULL,
  `isSelfNomination` BOOLEAN NOT NULL DEFAULT 0,
  `status` ENUM('submitted','shortlisted','selected') NOT NULL DEFAULT 'submitted',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_nominations_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_keeper_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `location` VARCHAR(255) NULL,
  `experience` TEXT NULL,
  `availability` TEXT NULL,
  `status` ENUM('submitted','interviewing','accepted','declined') NOT NULL DEFAULT 'submitted',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_keeper_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_fleet_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ownerName` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `rvYearMakeModel` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `message` TEXT NULL,
  `status` ENUM('submitted','in_conversation','joined') NOT NULL DEFAULT 'submitted',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_fleet_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_winter_host_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `projectName` VARCHAR(200) NOT NULL,
  `contactName` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `location` VARCHAR(255) NULL,
  `powerHookup` BOOLEAN NOT NULL DEFAULT 0,
  `freezeProtectionPlan` TEXT NULL,
  `siteDescription` TEXT NULL,
  `proposedShare` VARCHAR(120) NULL,
  `status` ENUM('submitted','in_conversation','accepted','declined') NOT NULL DEFAULT 'submitted',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_winter_host_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_concierge_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NULL,
  `bookingId` INT NULL,
  `profileAnswers` JSON NULL,
  `itinerary` JSON NULL,
  `messages` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_concierge_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_seed_plantings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `bookingId` INT NULL,
  `locationId` INT NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `species` VARCHAR(200) NULL,
  `photoUrl` VARCHAR(512) NULL,
  `notes` TEXT NULL,
  `isVerified` BOOLEAN NOT NULL DEFAULT 0,
  `plantedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_seed_plantings_user_idx` (`userId`),
  KEY `ship_seed_plantings_verified_idx` (`isVerified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_log_entries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bookingId` INT NOT NULL,
  `userId` INT NOT NULL,
  `dayNumber` INT NULL,
  `title` VARCHAR(200) NULL,
  `content` TEXT NOT NULL,
  `photoUrl` VARCHAR(512) NULL,
  `isPublic` BOOLEAN NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_log_booking_idx` (`bookingId`),
  KEY `ship_log_public_idx` (`isPublic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_passport_stamps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `locationId` INT NOT NULL,
  `bookingId` INT NULL,
  `photoUrl` VARCHAR(512) NULL,
  `stampedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_passport_uq` (`userId`, `locationId`),
  KEY `ship_passport_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship_position_pings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `source` ENUM('manual','tracker') NOT NULL DEFAULT 'manual',
  `note` VARCHAR(255) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_position_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Season 2 application referral attribution for Maiden Voyage Quest action #3.
ALTER TABLE `applications` ADD COLUMN `shipReferralHandle` VARCHAR(40) NULL;
ALTER TABLE `applications` ADD COLUMN `shipReferralUserId` INT NULL;
