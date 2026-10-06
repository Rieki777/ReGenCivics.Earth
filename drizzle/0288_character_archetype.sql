-- Local character class on the member profile, and a copy of the primary
-- key on a gift-map save.
--
-- Village OS still owns the canonical character. These columns are the
-- choice a member makes on ReGen Civics until a Hypha public-profile pull
-- exists (shared/characterSheet.ts). Gifts stay in saved_contributions.
-- primaryArchetypeKey on that table is a stamp, not a second ledger.
--
-- Apply before the feature is used. Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0288_character_archetype.sql
-- Do not apply this file to production from the agent that added it.

ALTER TABLE `player_profiles`
  ADD COLUMN `primaryArchetypeKey` varchar(32) NULL,
  ADD COLUMN `partyArchetypeKeys` json NULL,
  ADD COLUMN `portraitPresentation` enum('f','m') NULL;

ALTER TABLE `saved_contributions`
  ADD COLUMN `primaryArchetypeKey` varchar(32) NULL;
