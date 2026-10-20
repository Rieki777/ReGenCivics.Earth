-- A land project's Village profile (ADR-77): what its stewards confirmed or
-- typed for its Village OS 1.0. ADDITIVE ONLY: two new tables. Old code never
-- reads them. MariaDB and MySQL 8+ compatible.
--
-- Every other answer stays where it was given (the application, the hosting
-- request, each weekly board); the profile reads them live. This table holds
-- only the stewards' own word on each decision in shared/villageDecisions.ts,
-- one row per application and decision key:
--   how = 'confirmed': a suggestion kept as the steward saw it (for a board
--         block, the snapshot, so the page can say when the boards move on);
--   how = 'answered':  words or a choice the steward gave on the profile page.
-- `value` is JSON text. Keys are permanent (villageDecisions.ts says so).
--
-- Safe to apply before the deploy: old code reads nothing here.
-- Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0301_village_profile_answers.sql

CREATE TABLE IF NOT EXISTS `village_profile_answers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `applicationId` INT NOT NULL,
  `decisionKey` VARCHAR(48) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `how` ENUM('confirmed','answered') NOT NULL,
  `updatedBy` INT NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `village_profile_answers_app_key_idx` (`applicationId`, `decisionKey`),
  KEY `village_profile_answers_app_idx` (`applicationId`)
);

-- Every earlier board card a project's stewards claimed from the profile page
-- (a card with no application, tied to theirs). Kept so a claim can be given
-- back, and so an admin can see who tied which card. One row per card.
CREATE TABLE IF NOT EXISTS `village_profile_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `applicationId` INT NOT NULL,
  `cardId` INT NOT NULL,
  `claimedBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `village_profile_claims_card_idx` (`cardId`),
  KEY `village_profile_claims_app_idx` (`applicationId`)
);
