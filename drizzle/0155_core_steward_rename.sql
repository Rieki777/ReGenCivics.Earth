-- Migration 0155: rename the church role title priest/priestess -> Steward
-- Run with: npx tsx scripts/run-migration.ts drizzle/0155_core_steward_rename.sql
--   (or: npx tsx scripts/run-migration.ts --all)
--
-- The church has adopted "Steward" as the single, gender-neutral official
-- title for the role formerly split into priest/priestess (ADR-20). Same
-- table, same payment-rights columns. Only the `role` enum's values change.
-- Depends on migration 0153 (creates church_role_holders).
--
-- Three-step enum change so existing rows are never coerced to an empty
-- string mid-migration (safe whether 0153 has run with zero rows yet, or
-- with real holders already seeded):
--   1. widen the enum to include 'steward' alongside the old values
--   2. move any existing priest/priestess rows over to 'steward'
--   3. narrow the enum to 'steward' only

ALTER TABLE church_role_holders
  MODIFY COLUMN role ENUM('priest','priestess','steward') NOT NULL;

UPDATE church_role_holders
  SET role = 'steward'
  WHERE role IN ('priest', 'priestess');

ALTER TABLE church_role_holders
  MODIFY COLUMN role ENUM('steward') NOT NULL DEFAULT 'steward';
