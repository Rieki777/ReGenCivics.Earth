-- Who cast a call time vote, when they were signed in (ADR-72). ADDITIVE ONLY:
-- one nullable column on each vote table. Old code never writes it, so every
-- existing row stays NULL until its voter comes back signed in and the page
-- attaches their browser's row to their account. MariaDB and MySQL 8+.
--
-- The badges beside the votes (accepted land project, Alliance Partner) are
-- worked out from this column when the tally is read, so a vote cast before
-- its voter was approved shows the badge the moment they are.
--
-- interopTimeVotes also has a runtime CREATE TABLE IF NOT EXISTS guard
-- (ensureVotesTable, server/lib/interopCircle.ts) from before 0246 was
-- applied. It is left without this column on purpose: it only runs where the
-- table is missing, and this migration adds the column after it.
--
-- Safe to apply before the deploy: old code neither reads nor writes it.
--   npx tsx scripts/run-migration.ts drizzle/0298_vote_user_ids.sql

ALTER TABLE `season_schedule_votes`
  ADD COLUMN `userId` INT NULL DEFAULT NULL,
  ADD KEY `season_schedule_votes_user_idx` (`userId`);

ALTER TABLE `interopTimeVotes`
  ADD COLUMN `userId` INT NULL DEFAULT NULL,
  ADD KEY `interop_vote_user_idx` (`userId`);
