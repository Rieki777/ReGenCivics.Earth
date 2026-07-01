-- Migration 0149: Add theme preference column to player_profiles
-- DO NOT RUN YET — run after Fix 15 is fully deployed and tested on production.
-- Run with: npx tsx scripts/run-migration.ts drizzle/0149_user_theme_preference.sql
--
-- This adds optional server-side theme persistence so the user's light/dark
-- preference follows them across devices. The client already persists to
-- localStorage (ThemeContext); this migration is for users who want
-- cross-device sync in a future release.

-- Plain ADD COLUMN (MySQL rejects ADD COLUMN IF NOT EXISTS, a MariaDB-ism).
-- Idempotency comes from the run-migration.ts _migrations_applied tracking.
ALTER TABLE player_profiles
  ADD COLUMN themePreference VARCHAR(10) DEFAULT NULL
    COMMENT 'User theme preference: "light" | "dark" | NULL (system/localStorage default)';
