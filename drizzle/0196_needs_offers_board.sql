-- 0196: Needs and Offers board, Phase B2.
-- Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md (improvement 10,
-- ecosystem-wide per Rye's amendment in MISSION_FOUNDATIONS_15_IMPROVEMENTS_2026-07-16.md).
-- Two boards (project needs, player offers) fed by the /board page and by optional
-- needs/offers fields on every application form, tagged with the source form.
-- Posters may be signed-in players (ownerId) or form applicants (contactEmail),
-- so both identity columns are nullable and the procedure layer requires one.
-- needs_offers_matches is the matcher's ledger: one row per (need, offer) pair
-- ever considered introduced, so the intro email can never send twice.
-- No FK constraints per repo convention; integrity lives in the procedure layer.

CREATE TABLE IF NOT EXISTS `project_needs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerId` int NULL DEFAULT NULL,
  `contactName` varchar(200) NULL DEFAULT NULL,
  `contactEmail` varchar(320) NULL DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `body` text NULL,
  `tags` json NULL,
  `bioregionId` int NULL DEFAULT NULL,
  `timeWindow` varchar(200) NULL DEFAULT NULL,
  `status` enum('open','matched','closed') NOT NULL DEFAULT 'open',
  `source` varchar(50) NOT NULL DEFAULT 'board',
  `sourceId` int NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_needs_status_bioregionId_idx` (`status`, `bioregionId`),
  KEY `project_needs_ownerId_idx` (`ownerId`)
);

CREATE TABLE IF NOT EXISTS `player_offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerId` int NULL DEFAULT NULL,
  `contactName` varchar(200) NULL DEFAULT NULL,
  `contactEmail` varchar(320) NULL DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `body` text NULL,
  `tags` json NULL,
  `bioregionId` int NULL DEFAULT NULL,
  `timeWindow` varchar(200) NULL DEFAULT NULL,
  `status` enum('open','matched','closed') NOT NULL DEFAULT 'open',
  `source` varchar(50) NOT NULL DEFAULT 'board',
  `sourceId` int NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `player_offers_status_bioregionId_idx` (`status`, `bioregionId`),
  KEY `player_offers_ownerId_idx` (`ownerId`)
);

CREATE TABLE IF NOT EXISTS `needs_offers_matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `needId` int NOT NULL,
  `offerId` int NOT NULL,
  `matchedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `emailSentAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `needs_offers_matches_needId_offerId_unique` (`needId`, `offerId`)
);

-- Optional needs/offers capture on every application form (additive columns only).
ALTER TABLE `applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `investor_inquiries` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `custom_game_applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `local_food_applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `ship_keeper_applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `ship_fleet_applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
ALTER TABLE `ship_winter_host_applications` ADD COLUMN `needsText` text NULL, ADD COLUMN `offersText` text NULL;
