-- 0224_ship_blackout_source.sql
--
-- Phase 2 of the Outdoorsy sync: let a blackout row remember where it came from.
--
-- Until now every ship_blackout_dates row was written by a human through the
-- admin panel. The inbound sync writes them too, and the two kinds must be told
-- apart for two reasons:
--
--   1. The outbound feed must EXCLUDE source='outdoorsy' rows. Otherwise we hand
--      Outdoorsy its own bookings back as blocks, and a cancellation on their
--      side can never reopen the week because our feed keeps asserting it.
--   2. A row the sync owns is reconciled against the feed on every run, so a
--      human deleting one would just watch it reappear. The admin UI marks them
--      read-only (Phase 3).
--
-- externalUid is UNIQUE so the sync's upsert is idempotent. MySQL permits any
-- number of NULLs in a unique index, so every hand-written row (which has no
-- UID) still inserts fine.
--
-- Numbered 0224 rather than the 0223 the plan doc assumed: 0223 was taken by
-- 0223_gratitude_payout_cap.sql.

ALTER TABLE ship_blackout_dates
  ADD COLUMN source VARCHAR(24) NOT NULL DEFAULT 'manual',
  ADD COLUMN externalUid VARCHAR(255) NULL,
  ADD COLUMN externalUpdatedAt TIMESTAMP NULL,
  ADD COLUMN syncedAt TIMESTAMP NULL;

CREATE UNIQUE INDEX ship_blackout_external_uid_idx
  ON ship_blackout_dates (externalUid);

CREATE INDEX ship_blackout_source_idx
  ON ship_blackout_dates (source);
