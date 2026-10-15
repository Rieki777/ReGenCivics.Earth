-- Add questInterests to player_profiles so focus areas can save.
--
-- playerProfiles.updateFocusAreas / getFocusAreas (server/routes/players.ts)
-- read and write `player_profiles.questInterests`, but that column only ever
-- existed on the legacy `userProfiles` table (added in
-- 0035_user_path_onboarding.sql). The Focus Area picker in profile Settings
-- therefore 500s on save against production.
--
-- userProfiles.questInterests keeps its own meaning (path-onboarding
-- interests); this column stores the game-profile focus areas the picker
-- manages. JSON-stringified string array of FOCUS_AREAS slugs.
ALTER TABLE `player_profiles`
  ADD COLUMN `questInterests` text;
