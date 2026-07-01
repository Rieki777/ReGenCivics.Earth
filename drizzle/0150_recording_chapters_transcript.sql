-- Migration 0150: Add chaptersJson + transcriptJson to recordings
-- Run with: npx tsx scripts/run-migration.ts drizzle/0150_recording_chapters_transcript.sql
--
-- Phase 1 of the coordination-engine completion. The synthesize pass already
-- produces chapters, but they were discarded because there was no column.
-- transcriptJson stores timestamped start/text segments so the Schedule page
-- chapters and transcript can deep-link into the YouTube player.
-- Both are nullable, so existing rows read as NULL. The runner records applied
-- migrations, so this is not re-run once it succeeds.

ALTER TABLE recordings
  ADD COLUMN chaptersJson JSON NULL COMMENT 'Synthesize-pass chapters: array of tSeconds + title',
  ADD COLUMN transcriptJson JSON NULL COMMENT 'Timestamped transcript segments: array of start + text';
