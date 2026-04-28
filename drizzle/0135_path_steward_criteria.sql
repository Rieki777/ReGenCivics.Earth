-- 0135_path_steward_criteria.sql
--
-- 2026-04-27: schema columns to support Land Project Steward criterion.
--
-- Per QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 3.3, the Land
-- Project Steward tier earns when the project has both:
--   * Completed at least one season of the Game Co-Creation Journey
--   * Successfully launched a Game for their community
--
-- Both signals attach to the existing applications row (one application
-- = one land project). New columns:
--
--   seasonsCompleted: integer count, incremented at season-end review
--   gameLaunchedAt: timestamp set when the project's community-facing
--                   game ships (admin-marked or webhook-driven later)
--
-- Both default to 0 / NULL so existing rows behave as "Steward not yet
-- earned" without backfill, matching Phase 1's forward-only policy.
--
-- The tier_detector reads these to fire steward_earned events on the
-- land_project path. Until either column has data, the criterion is a
-- no-op.

ALTER TABLE applications
  ADD COLUMN seasonsCompleted INT NOT NULL DEFAULT 0,
  ADD COLUMN gameLaunchedAt TIMESTAMP NULL;
