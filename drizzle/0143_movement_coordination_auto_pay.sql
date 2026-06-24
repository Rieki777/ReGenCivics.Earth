-- 0143_movement_coordination_auto_pay: Phase 4 of the Movement Coordination
-- Engine. Seeds the auto-pay threshold game variable that the callTasks
-- submit path reads to decide whether a bounty crosses the manual-consent
-- gate or pays out the moment the assignee submits an artifact.
--
-- The threshold lives in game_variables so Rye can tune it from the admin
-- variables editor without a code deploy. Default 50 $ReGen keeps small
-- routine tasks frictionless while routing bigger work through the circle
-- steward consent gate. Set to 0 to disable auto-pay entirely.
--
-- Run via the migration runner, never ad-hoc. No semicolons in comments
-- because the runner splits naively on the semicolon character.

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue)
VALUES (
  'coordination',
  'reward',
  'coordination.auto_pay_bounty_max',
  'Auto-pay bounty maximum',
  'Call tasks with a bounty at or below this amount auto-credit on submit, skipping the circle steward consent step. Set to 0 to force every task through manual consent regardless of bounty size.',
  50,
  'integer',
  50
)
ON DUPLICATE KEY UPDATE description = VALUES(description);
