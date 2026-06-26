-- Migration 0146: Add governance lifecycle stage to forum threads
-- Part of the Dialogue Process improvements from the 2026-06-25 field report
-- governanceStage tracks where a thread is in the dialogue to sensing to proposal to decided arc
-- sensingStartedAt and sensingStartedBy record who triggered the Sensing transition

ALTER TABLE forumPosts
  ADD COLUMN governanceStage ENUM('dialogue','sensing','proposal','decided') NOT NULL DEFAULT 'dialogue',
  ADD COLUMN sensingStartedAt TIMESTAMP NULL,
  ADD COLUMN sensingStartedBy INT NULL;

-- Seed governance variables used to gate auto-suggest (tunable without a deploy)
INSERT IGNORE INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue)
VALUES
  ('governance', 'sensing', 'governance.sensing_min_participants', 'Sensing min participants', 'Minimum distinct participant count before showing the sensing prompt', '3', 'integer', '3'),
  ('governance', 'sensing', 'governance.sensing_min_weighted_reactions', 'Sensing min reactions', 'Minimum sum of weighted reactions before showing the sensing prompt', '5', 'integer', '5'),
  ('governance', 'sensing', 'governance.sensing_min_citizen_tier', 'Sensing min tier', 'Minimum citizenship tier required to manually enter Sensing (0=visitor 1=citizen 2=steward 3=guardian)', '1', 'integer', '1');
