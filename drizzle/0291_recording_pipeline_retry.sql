-- Retry bookkeeping for recordings that still have no transcript.
-- descriptionChaptersJson is added by drizzle/0290_edited_cut_email.sql.
--
-- Apply before the pipeline retry surfaces are used.
-- Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0291_recording_pipeline_retry.sql
-- Do not apply this file to production from the agent that added it.

ALTER TABLE `recordings`
  ADD COLUMN `processAttempts` int NOT NULL DEFAULT 0,
  ADD COLUMN `lastError` varchar(500) NULL,
  ADD COLUMN `nextRetryAt` timestamp NULL;
