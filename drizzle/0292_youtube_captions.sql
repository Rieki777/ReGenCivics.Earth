-- YouTube caption source on each recording, and the channel-owner refresh
-- token (ciphertext only). The app never logs the token.
--
-- Apply before caption fetch is used. Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0292_youtube_captions.sql
-- Do not apply this file to production from the agent that added it.
-- 0290 is the edited-cut letter. 0291 is pipeline retry.

ALTER TABLE `recordings`
  ADD COLUMN `transcriptSource` varchar(32) NULL;

CREATE TABLE `youtube_channel_auth` (
  `id` int NOT NULL,
  `refreshTokenEnc` text NOT NULL,
  `channelId` varchar(64) NULL,
  `channelTitle` varchar(255) NULL,
  `connectedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
