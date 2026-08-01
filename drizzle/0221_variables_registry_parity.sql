-- 0221: Variables-registry parity — promote engine hardcodes to game_variables.
--
-- Every row here was a numeric literal in server code (audited 2026-07-31,
-- game-amora docs/GAME_MECHANICS_AUDIT_2026-07-31.md Part B3). The code now
-- reads each key through the canonical cached reader with the OLD literal as
-- its fallback, so this seed changes no behavior — it makes the values
-- governable. minValue/maxValue double as the governance auto-apply hard
-- bounds. ON DUPLICATE no-op keeps re-runs and pre-existing rows safe.
-- `maxValue` is backtick-quoted because MAXVALUE is a MySQL reserved word.

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('events', 'rewards', 'events.attendance_reward_regen', 'Event attendance reward', '$ReGen credited for attending a community event, whether an admin marks attendance or the player self checks in. Was 33 hardcoded independently in two code paths.', 33, 'integer', 33, 0, 1000, '$ReGen'),
('quests', 'verification', 'quests.attested_bonus_fraction', 'Peer-attestation bonus fraction', 'Bonus fraction of a crew quest''s $ReGen reward paid when a crewmate attests the completion (verification ladder rung 2, ADR-42''s 1.25x). 0.25 means +25%.', 0.25, 'decimal', 0.25, 0, 1, NULL),
('ship', 'rewards', 'ship.regen_per_quest_point', 'Ship quest $ReGen per point', 'Conversion rate from ship quest action points to $ReGen credited on verified completion. Was an implicit 1:1 - tune this instead of repricing every action row.', 1, 'decimal', 1, 0, 100, '$ReGen'),
('bounty', 'learning', 'bounty.learning.fast_claim_days', 'Fast-claim signal window (days)', 'A bounty claimed within this many days reads as a fast-claim demand signal. The one learning dial that skipped the variable treatment its siblings got.', 2, 'integer', 2, 1, 30, 'days'),
('bounty', 'learning', 'bounty.learning.min_sample', 'Demand-learning minimum sample', 'Bounties a (circle, scope tier) group needs before its demand factor is allowed to move. Below this the factor holds.', 3, 'integer', 3, 1, 50, NULL),
('governance', 'assembly', 'governance.launch_carryover_idle_days', 'Launch carry-over window (days)', 'Days a ready-to-launch proposal may sit before anyone (not just the owner) can carry it to the binding vote.', 7, 'integer', 7, 1, 60, 'days'),
('governance', 'straw_poll', 'governance.straw_poll.consensus_pct', 'Straw poll: consensus fraction', 'Top-choice share of straw-poll votes that lights the ready-to-promote signal (advisory).', 0.66, 'decimal', 0.66, 0.5, 1, NULL),
('governance', 'straw_poll', 'governance.straw_poll.min_votes', 'Straw poll: minimum votes', 'Total straw-poll votes required before the ready-to-promote signal can light.', 5, 'integer', 5, 1, 100, NULL),
('paths', 'thresholds', 'paths.player.steward.quest_count', 'Player Steward: quest count', 'Distinct quest completions required on the player path to reach Steward.', 33, 'integer', 33, 1, 500, NULL),
('paths', 'thresholds', 'paths.player.steward.vote_count', 'Player Steward: vote count', 'Proposal votes required on the player path to reach Steward.', 144, 'integer', 144, 1, 1000, NULL),
('paths', 'bonuses', 'paths.tier_bonus.co_creator', 'Tier bonus: Co-Creator', 'One-time RGVoice grant on first earning Co-Creator on a path.', 77, 'integer', 77, 0, 10000, 'RGVoice'),
('paths', 'bonuses', 'paths.tier_bonus.steward', 'Tier bonus: Steward', 'One-time RGVoice grant on first earning Steward on a path.', 144, 'integer', 144, 0, 10000, 'RGVoice'),
('paths', 'bonuses', 'paths.tier_bonus.sage', 'Tier bonus: Sage', 'One-time RGVoice grant on earning Sage (cross-path, once).', 233, 'integer', 233, 0, 10000, 'RGVoice'),
('paths', 'thresholds', 'paths.ally.co_creator.min_distinct_tool_users', 'Ally Co-Creator: distinct tool users', 'Distinct signed-in users who must have used an ally''s approved tool for the ally to reach Co-Creator.', 11, 'integer', 11, 1, 1000, NULL),
('paths', 'thresholds', 'paths.land_project.steward.min_seasons', 'Land-project Steward: seasons', 'Seasons a land project must complete (with a launched game) to reach Steward.', 1, 'integer', 1, 0, 20, NULL),
('paths', 'thresholds', 'paths.sage.percentile_threshold', 'Sage: percentile threshold', 'Daily contribution percentile a player must hold to count a day toward Sage. DECLARED AHEAD OF ENFORCEMENT: the daily-snapshot check is not yet implemented.', 80, 'integer', 80, 0, 100, '%'),
('paths', 'thresholds', 'paths.sage.days_pct_required', 'Sage: share of season days', 'Share of season days that must meet the Sage percentile threshold. DECLARED AHEAD OF ENFORCEMENT: the daily-snapshot check is not yet implemented.', 80, 'integer', 80, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.guardian', 'Tier band: Guardian', 'Contribution percentile at or above which a player''s public tier label is Guardian.', 95, 'integer', 95, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.elder', 'Tier band: Elder', 'Contribution percentile at or above which the tier label is Elder.', 85, 'integer', 85, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.cultivator', 'Tier band: Cultivator', 'Contribution percentile at or above which the tier label is Cultivator.', 70, 'integer', 70, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.grower', 'Tier band: Grower', 'Contribution percentile at or above which the tier label is Grower.', 50, 'integer', 50, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.sapling', 'Tier band: Sapling', 'Contribution percentile at or above which the tier label is Sapling.', 30, 'integer', 30, 0, 100, '%'),
('scoring', 'tier_bands', 'tiers.percentile.sprout', 'Tier band: Sprout', 'Contribution percentile at or above which the tier label is Sprout - below this the label is Seedling.', 15, 'integer', 15, 0, 100, '%')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- org_rating.min_raters was ALREADY seeded by 0099 (value 5, category
-- 'organisations'/'ratings', no bounds). This upsert recategorizes it and
-- adds the governance hard bounds on existing databases, and seeds it fresh
-- on baseline-built ones - while never touching a live value.
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('ratings', 'thresholds', 'org_rating.min_raters', 'Org rating: minimum raters', 'Ratings needed before an organisation''s regenerative score is published. Read live by the rate mutation (in-code fallback 5).', 5, 'integer', 5, 1, 100, NULL)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  subcategory = VALUES(subcategory),
  displayName = VALUES(displayName),
  description = VALUES(description),
  `minValue` = COALESCE(game_variables.`minValue`, VALUES(`minValue`)),
  `maxValue` = COALESCE(game_variables.`maxValue`, VALUES(`maxValue`));
