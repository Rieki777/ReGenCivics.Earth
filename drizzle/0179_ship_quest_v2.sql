-- Ship Quest v2: points-threshold entry, weighted draws with an audit log,
-- nominations that enter the draw, and sponsorable crew profiles.
--
-- Entry stops being "complete all 7 actions" and becomes "reach the points
-- threshold." This migration adds the tables and columns the new model needs.
-- Additive and idempotent; safe to re-run.

-- 1. Crew profiles: the sponsorable card a crew fills in on entering the draw.
CREATE TABLE IF NOT EXISTS `ship_crew_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NULL,
  `nominationId` INT NULL,
  `displayName` VARCHAR(200) NOT NULL,
  `photoUrl` VARCHAR(512) NULL,
  `bio` TEXT NULL,
  `intent` TEXT NULL,
  `videoUrl` VARCHAR(512) NULL,
  `isPublic` BOOLEAN NOT NULL DEFAULT FALSE,
  `sponsorGoalCents` INT NOT NULL DEFAULT 210000,
  `sponsoredCents` INT NOT NULL DEFAULT 0,
  `status` ENUM('draft','published','sponsored','sailed') NOT NULL DEFAULT 'draft',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `ship_crew_user_uq` (`userId`),
  UNIQUE KEY `ship_crew_nomination_uq` (`nominationId`),
  KEY `ship_crew_status_idx` (`status`),
  KEY `ship_crew_public_idx` (`isPublic`)
);

-- 2. Giveaway drawings audit log: eligible set, weights, seed, roll, winner.
CREATE TABLE IF NOT EXISTS `ship_giveaway_drawings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `drawnByUserId` INT NULL,
  `seed` BIGINT NOT NULL,
  `totalTickets` INT NOT NULL,
  `roll` DECIMAL(20,4) NOT NULL,
  `eligibleCount` INT NOT NULL DEFAULT 0,
  `winnerUserId` INT NULL,
  `winnerNominationId` INT NULL,
  `winnerLabel` VARCHAR(200) NULL,
  `audit` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ship_giveaway_created_idx` (`createdAt`)
);

-- 3. Nominations enter the draw: a new status, a linked account once activated,
-- and a timestamp for the invite email sent on approval.
ALTER TABLE `ship_nominations`
  MODIFY COLUMN `status` ENUM('submitted','shortlisted','selected','approved_for_draw')
    NOT NULL DEFAULT 'submitted';
ALTER TABLE `ship_nominations` ADD COLUMN `nomineeUserId` INT NULL;
ALTER TABLE `ship_nominations` ADD COLUMN `inviteEmailSentAt` TIMESTAMP NULL;

-- 4. Sponsorship donations attach to a crew profile with a program tag so
-- Transparency/Reconciliation can segment ship-gift revenue by crew.
ALTER TABLE `church_donations` ADD COLUMN `program` VARCHAR(64) NULL;
ALTER TABLE `church_donations` ADD COLUMN `crewProfileId` INT NULL;
