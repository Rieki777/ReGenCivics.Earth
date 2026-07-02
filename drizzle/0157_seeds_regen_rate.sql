-- SEEDS -> $ReGen claim conversion rate as a tunable game variable.
-- Decision (2026-07-02): $ReGen is valued at $0.10, so $1 of SEEDS
-- contribution converts to 10 $ReGen (x10). Held in game_variables so the
-- rate can be retuned from the admin UI without a deploy, and so the claim
-- page always displays the true value via game.getMechanics.
-- Columns are backticked because `maxValue`/`minValue` are reserved words in
-- MySQL (MAXVALUE is used in partitioning) and error out unquoted.
INSERT INTO `game_variables` (`category`, `subcategory`, `key`, `displayName`, `description`, `value`, `valueType`, `defaultValue`, `minValue`, `maxValue`, `isActive`) SELECT 'tokens', 'seeds', 'seeds.regen_per_usd', 'SEEDS claim rate ($ReGen per $1)', 'How many $ReGen a SEEDS claimant receives per $1 USD of recorded contribution. At $ReGen = $0.10 this is 10.', 10, 'multiplier', 10, 0, 1000, 1 WHERE NOT EXISTS (SELECT 1 FROM `game_variables` WHERE `key` = 'seeds.regen_per_usd');
