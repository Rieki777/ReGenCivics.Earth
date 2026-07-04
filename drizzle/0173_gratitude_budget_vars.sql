-- 0173: Seed the gratitude BUDGET variables for the lunar-cycle economy.
--
-- The proportional-budget model (ADR-30) needs its own tier multipliers.
-- The existing gratitude.multiplier.* keys (seeded in 0099 at 1.0/1.2/1.5/2.0)
-- drive the OLD trust-graph bonus and must not be repurposed, so the budget
-- model gets distinct gratitude.budget_multiplier.* keys at the spec values
-- (1/2/3/5). base_budget, full_power_threshold, and streak keys are seeded so
-- the Game Mechanics page can show and tune them. pool_per_cycle and
-- claim_threshold already exist (0166).

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('gratitude', 'budget', 'gratitude.base_budget', 'Gratitude base budget', 'Base gratitude points every player gets per lunar cycle before the tier multiplier and streak bonus', 100, 'integer', 100, 10, 1000, 'points'),
('gratitude', 'budget', 'gratitude.full_power_threshold', 'Full-power threshold', 'Number of people you can acknowledge at full strength each cycle before the per-person share dilutes', 10, 'integer', 10, 1, 50, 'people'),
('gratitude', 'budget', 'gratitude.streak_bonus_per_cycle', 'Streak bonus per cycle', 'Effective-budget bonus added for each consecutive cycle you acknowledge 10+ unique people', 0.03, 'percentage', 0.03, 0, 0.2, NULL),
('gratitude', 'budget', 'gratitude.streak_bonus_max', 'Streak bonus cap', 'Maximum streak bonus to the effective gratitude budget', 0.30, 'percentage', 0.30, 0, 1, NULL),
('gratitude', 'budget', 'gratitude.budget_multiplier.explorer', 'Explorer budget multiplier', 'Explorer tier multiplier on the gratitude base budget', 1.0, 'multiplier', 1.0, 0, 10, NULL),
('gratitude', 'budget', 'gratitude.budget_multiplier.co_creator', 'Co-Creator budget multiplier', 'Co-Creator tier multiplier on the gratitude base budget', 2.0, 'multiplier', 2.0, 0, 10, NULL),
('gratitude', 'budget', 'gratitude.budget_multiplier.steward', 'Steward budget multiplier', 'Steward tier multiplier on the gratitude base budget', 3.0, 'multiplier', 3.0, 0, 10, NULL),
('gratitude', 'budget', 'gratitude.budget_multiplier.sage', 'Sage budget multiplier', 'Sage tier multiplier on the gratitude base budget', 5.0, 'multiplier', 5.0, 0, 10, NULL)
ON DUPLICATE KEY UPDATE `key` = `key`;
