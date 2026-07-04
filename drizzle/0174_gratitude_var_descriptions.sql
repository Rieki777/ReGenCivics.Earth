-- 0174: Plain-language descriptions for the gratitude game variables.
--
-- The Game Mechanics page renders each description from
-- game_variables.description (varHelp). These rewrites make every gratitude
-- variable understandable to a player who has never read a spec, and
-- disambiguate the two multiplier families:
--   gratitude.budget_multiplier.*  -> lunar-cycle BUDGET (ADR-30 economy)
--   gratitude.multiplier.*         -> legacy trust-score weighting only
-- NOTE: no apostrophes inside string literals (the migration splitter does
-- not handle doubled-quote escapes).

UPDATE game_variables SET description = 'Everyone starts each lunar cycle (new moon to new moon, about 29.5 days) with this many gratitude points to give. Your citizenship tier multiplies it, and streaks add a bonus on top.' WHERE `key` = 'gratitude.base_budget';

UPDATE game_variables SET description = 'You can acknowledge up to this many people per cycle at full strength. Go past it and your budget spreads thinner, so each person receives a smaller share. Each person can be acknowledged once per cycle.' WHERE `key` = 'gratitude.full_power_threshold';

UPDATE game_variables SET description = 'Acknowledge the full-power number of people in back-to-back cycles and your budget grows by this much for every cycle in the streak. Miss a cycle and the streak resets.' WHERE `key` = 'gratitude.streak_bonus_per_cycle';

UPDATE game_variables SET description = 'The biggest budget boost a streak can give you, no matter how long the streak runs.' WHERE `key` = 'gratitude.streak_bonus_max';

UPDATE game_variables SET description = 'Explorers give gratitude at the base budget. Every acknowledgment still counts toward the pool.' WHERE `key` = 'gratitude.budget_multiplier.explorer';

UPDATE game_variables SET description = 'Co-Creators carry double the base gratitude budget, so their acknowledgments move more of the pool toward the people they thank.' WHERE `key` = 'gratitude.budget_multiplier.co_creator';

UPDATE game_variables SET description = 'Stewards carry triple the base gratitude budget. Deep contributors get more say in where the pool flows.' WHERE `key` = 'gratitude.budget_multiplier.steward';

UPDATE game_variables SET description = 'Sages carry five times the base gratitude budget, the most weight in the game. Gratitude from a Sage moves real value.' WHERE `key` = 'gratitude.budget_multiplier.sage';

UPDATE game_variables SET description = 'The total ReGen released at the end of every lunar cycle. It splits among everyone who received gratitude that cycle, in proportion to the budget-weighted appreciation they received. Sending is free. Receiving is where the pool pays out.' WHERE `key` = 'gratitude.pool_per_cycle';

UPDATE game_variables SET description = 'How much ReGen you need to accumulate before you can claim it on-chain through Hypha. Keeps claims meaningful instead of dusty.' WHERE `key` = 'gratitude.claim_threshold';

-- Legacy trust-graph multipliers: clarify they are NOT the budget.
UPDATE game_variables SET description = 'Legacy trust-score weight for received gratitude at the Explorer tier. Shapes trust scores only. The gratitude budget uses the separate budget multipliers.' WHERE `key` = 'gratitude.multiplier.explorer';
UPDATE game_variables SET description = 'Legacy trust-score weight for received gratitude at the Co-Creator tier. Trust scores only. The budget uses the budget multipliers.' WHERE `key` = 'gratitude.multiplier.co_creator';
UPDATE game_variables SET description = 'Legacy trust-score weight for received gratitude at the Steward tier. Trust scores only. The budget uses the budget multipliers.' WHERE `key` = 'gratitude.multiplier.steward';
UPDATE game_variables SET description = 'Legacy trust-score weight for received gratitude at the Sage tier. Trust scores only. The budget uses the budget multipliers.' WHERE `key` = 'gratitude.multiplier.sage';
