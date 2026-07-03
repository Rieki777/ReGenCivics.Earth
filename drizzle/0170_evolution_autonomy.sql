-- Migration 0170: Evolution Engine autonomy variables (ASSEMBLY_PAGE_SPEC.md section 7.3)
-- The machine's leash, governed by the same mechanism as every other game
-- variable (Rung 1). Default tier 1 means variable changes auto-apply but
-- features never auto-ship. Raising the tier to 3 is an act of meta-governance
-- the community performs, not a deploy. Seeded with display metadata so they
-- appear on the Game Mechanics page.

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('evolution', 'autonomy', 'evolution.max_autonomy_tier', 'Max autonomy tier', 'How far the game may evolve itself. 0=humans apply by hand, 1=ratified variable changes auto-apply (default), 2=content auto-applies, 3=features auto-build and auto-ship. Community-governed', 1, 'integer', 1, 0, 3, NULL),
('evolution', 'autonomy', 'evolution.launch_window_hours', 'Launch window', 'Hours a gated feature PR waits in a visible shipping-soon state before it auto-merges. Any Steward can pause it. The community can vote this to 0 when trust in the machine is earned', 24, 'integer', 24, 0, 168, 'hours'),
('evolution', 'autonomy', 'evolution.circuit_breaker_failures', 'Circuit breaker threshold', 'Consecutive failed or rolled-back feature ships that freeze Rung 3 (autonomy tier drops to 1) until the community re-enables it. Code-enforced, not tunable below 1', 2, 'integer', 2, 1, 10, NULL)
ON DUPLICATE KEY UPDATE `key` = `key`;
