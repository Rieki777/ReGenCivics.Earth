-- Migration 0146: Add governance lifecycle stage to forum threads
-- Part of the Dialogue Process improvements (2026-06-25 field report batch)
-- governanceStage tracks where a thread is in the dialogue → sensing → proposal → decided arc.
-- sensingStartedAt / sensingStartedBy record who triggered the transition into Sensing.

ALTER TABLE forumPosts
  ADD COLUMN governanceStage ENUM('dialogue','sensing','proposal','decided') NOT NULL DEFAULT 'dialogue',
  ADD COLUMN sensingStartedAt TIMESTAMP NULL,
  ADD COLUMN sensingStartedBy INT NULL;

-- Seed governance variables used to gate auto-suggest (tunable without a deploy)
INSERT IGNORE INTO game_variables (key_name, value, description, updatedAt)
VALUES
  ('governance.sensing_min_participants', '3', 'Minimum distinct participant count before showing the "Ready to sense the room?" prompt', NOW()),
  ('governance.sensing_min_weighted_reactions', '5', 'Minimum sum of weighted reactions before showing the sensing prompt', NOW()),
  ('governance.sensing_min_citizen_tier', '1', 'Minimum citizenship tier required to manually enter Sensing (0=visitor, 1=citizen, 2=steward, 3=guardian)', NOW());
