-- 0144_movement_coordination_flywheel: Phase 5 of the Movement
-- Coordination Engine. Seeds two game variables the flywheel agent
-- reads to decide when a claim is stale and when it must be released
-- back to the open pool.
--
-- Defaults
--   coordination.stale_claim_nudge_days = 7    one nudge after a week
--   coordination.stale_claim_expire_days = 14  auto-release after two
--
-- Set either to a very large number to effectively disable that side
-- of the flywheel without removing the cron job. The agent tolerates
-- a missing variable and falls back to the defaults above.
--
-- Run via the migration runner, never ad-hoc. No semicolons in
-- comments because the runner splits naively on the semicolon.

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('coordination', 'flywheel', 'coordination.stale_claim_nudge_days', 'Stale claim nudge days', 'Days after a member claims a call task before the flywheel sends a single in-app nudge. Set very high to silence nudges without disabling the cron.', 7, 'integer', 7),
('coordination', 'flywheel', 'coordination.stale_claim_expire_days', 'Stale claim expire days', 'Days after a member claims a call task before the flywheel reverts it to open and returns it to the circle pool. Must be greater than the nudge value or the nudge never fires.', 14, 'integer', 14)
ON DUPLICATE KEY UPDATE description = VALUES(description);
