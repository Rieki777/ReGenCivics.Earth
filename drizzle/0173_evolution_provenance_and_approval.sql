-- Two small pieces of the Evolution Engine's trust chain.
--
-- 1. game_variable_history.proposalId: history rows carried provenance only
--    inside the reason string. A real column makes "which vote changed this"
--    a queryable fact for the Record, not a string parse.
--
-- 2. evolution.launch_require_approval: Rye's standing decision is that
--    machine-built features need a human approval on the merge until AI can
--    verify code-matches-vote. Seeded ON. Governed like every other game
--    variable, so the community can vote it off when that trust is earned.

ALTER TABLE game_variable_history ADD COLUMN proposalId INT NULL;

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('evolution', 'autonomy', 'evolution.launch_require_approval', 'Launch approval required', 'When 1, a machine-built feature PR needs a human approved-for-launch label before the launch window can merge it, even at autonomy tier 3. The community can vote this to 0 when trust in automated verification is earned', 1, 'integer', 1, 0, 1, NULL)
ON DUPLICATE KEY UPDATE `key` = `key`;
