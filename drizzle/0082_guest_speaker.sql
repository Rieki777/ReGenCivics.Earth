-- #25: Add guest speaker fields to events table
ALTER TABLE `events` ADD COLUMN `guestSpeakerName` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN `guestSpeakerBio` TEXT DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN `guestSpeakerTopic` VARCHAR(500) DEFAULT NULL;
