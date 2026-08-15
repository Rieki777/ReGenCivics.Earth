-- (Renumbered from 0219 on 2026-08-01: the pushed 0219_application_season.sql
-- took the number first; the runner tracks by filename, so this ships as 0223.)
-- 0223: Per-person payout cap for the gratitude pool, plus a record of what
-- each cycle actually minted.
--
-- The pool was a flat 10,000 $ReGen split proportionally with no ceiling, so
-- two people acknowledging only each other in a quiet cycle took all of it.
-- The cap makes the pool a ceiling on issuance rather than a promise to
-- issue: with a 1,000 cap, a two-person cycle mints 2,000 and the remaining
-- 8,000 is never created. Nothing rolls forward.
--
-- Also seeded: gratitude.max_payout_per_person is governed like every other
-- game variable, so the community can vote it up or down. Set it to 0 to
-- disable the cap entirely.

ALTER TABLE gratitude_cycles ADD COLUMN distributedTotal INT NULL;

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('gratitude', 'distribution', 'gratitude.max_payout_per_person', 'Max payout per person per cycle', 'The most $ReGen any one person can receive from a single cycle pool, no matter how much gratitude they were sent. This is what stops a small group acknowledging only each other from taking the whole pool. Anything the cap holds back is simply never created. Set to 0 to remove the cap.', 1000, 'integer', 1000, 0, 50000, 'ReGen')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- The full-power threshold now genuinely forfeits unspent budget, so its
-- description has to stop implying that spreading thin is the only cost.
UPDATE game_variables SET description = 'Your cycle budget is divided by this number, or by how many people you acknowledged, whichever is larger. Acknowledge fewer and the rest of your budget is forfeited: use it or lose it. Acknowledge more and everyone gets a thinner slice. Each person can be acknowledged once per cycle.' WHERE `key` = 'gratitude.full_power_threshold';
