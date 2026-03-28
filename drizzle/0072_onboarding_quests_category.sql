-- Migration: Add welcome-aboard-quests forum category
-- Houses Welcome Aboard quest discussion threads

INSERT INTO `forumCategories` (`slug`, `name`, `description`, `icon`, `color`, `sortOrder`)
VALUES (
  'welcome-aboard-quests',
  'Welcome Aboard Quests',
  'Discussion threads for the 10 Welcome Aboard quests. Share your completions, reflections, and social posts here.',
  'Compass',
  '#f0a35e',
  7
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
