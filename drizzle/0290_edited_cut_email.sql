-- Edited-cut attachment and the "edited recording is up" letter.
--
-- A clean upload should land on the session recording that already exists,
-- with its own chapter list (the description), separate from AI chapters.
-- editedEmailSent tracks that letter. emailSent stays the summary / notes letter.
-- recording_cut_events is the audit trail for attach and send.
--
-- Apply before the feature is used. Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0290_edited_cut_email.sql
-- Do not apply this file to production from the agent that added it.

ALTER TABLE `recordings`
  ADD COLUMN `editedYoutubeVideoId` varchar(32) NULL,
  ADD COLUMN `editedCutAttachedAt` timestamp NULL,
  ADD COLUMN `editedCutMatch` varchar(255) NULL,
  ADD COLUMN `editedEmailSent` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `descriptionChaptersJson` json NULL,
  ADD INDEX `recordings_editedYoutubeVideoId_idx` (`editedYoutubeVideoId`);

CREATE TABLE IF NOT EXISTS `recording_cut_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recordingId` int NOT NULL,
  `action` varchar(40) NOT NULL,
  `youtubeVideoId` varchar(32) NULL,
  `detail` varchar(500) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `recording_cut_events_recording_idx` (`recordingId`, `createdAt`)
);
