ALTER TABLE `player_profiles` ADD COLUMN `citizenshipTier` ENUM('explorer','co_creator','steward','sage') NOT NULL DEFAULT 'explorer';

ALTER TABLE `player_profiles` ADD COLUMN `citizenshipTierUpdatedAt` TIMESTAMP NULL;

ALTER TABLE `player_profiles` ADD COLUMN `graceStartedAt` TIMESTAMP NULL;

ALTER TABLE `player_profiles` ADD COLUMN `seasonsCompleted` INT NOT NULL DEFAULT 0;
