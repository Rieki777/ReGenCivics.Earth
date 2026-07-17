-- 0199: ReGen impact schema storage, Phase C1.
-- Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md (improvement 7).
-- One JSON column on the land-project table (applications), validated against
-- the zod schema in shared/impact.ts at every write (admin panel only for now).
-- Backfill of the current cohort is Rye's hand task via the admin panel.

ALTER TABLE `applications` ADD COLUMN `impact_data` json NULL;
