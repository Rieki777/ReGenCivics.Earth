-- recordings.transcript was TEXT (64KB). A long caption file on row 39
-- failed the save and the pipeline retried it every run.
-- Production already has MEDIUMTEXT. Re-running this ALTER is safe.
--
-- Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0293_recording_transcript_mediumtext.sql
-- Do not apply this file to production from the agent that added it.

ALTER TABLE `recordings`
  MODIFY `transcript` mediumtext;
