-- Migration 0150: Add chaptersJson + transcriptJson to recordings
-- Run with: npx tsx scripts/run-migration.ts drizzle/0150_recording_chapters_transcript.sql
--
-- Phase 1 of the coordination-engine completion. The synthesize pass already
-- produces chapters, but they were discarded because there was no column.
-- transcriptJson stores timestamped { start, text } segments so the Schedule
-- page's chapters and transcript can deep-link into the YouTube player.
-- Both are nullable; existing rows read as NULL.

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS chaptersJson JSON DEFAULT NULL
    COMMENT 'Synthesize-pass chapters: [{ tSeconds, title }]';

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS transcriptJson JSON DEFAULT NULL
    COMMENT 'Timestamped transcript segments: [{ start, text }]';
