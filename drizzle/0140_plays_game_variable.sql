-- 0140_plays_game_variable: seeds the adoption reward for open-source Plays.
--
-- Column names match the actual game_variables schema from
-- 0096_game_system.sql / 0097_seed_game_variables.sql, not the alternate
-- key_name/display_name pattern used by other tables.
-- INSERT IGNORE so a re-run is a no-op.

INSERT IGNORE INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue)
VALUES (
  'plays',
  'adoption',
  'plays.adoption_reward',
  'Play Adoption Reward',
  'ReGen tokens credited to the creator when someone adopts an open-source Play.',
  500,
  'integer',
  500
);
