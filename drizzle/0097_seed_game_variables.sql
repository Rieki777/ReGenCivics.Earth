-- Seed all initial game variables from REGEN_GAMES_SPEC_V1.md Part 1.4

-- Scoring weights
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('scoring', 'weights', 'scoring.weights.quest_routine', 'Quest (routine) points', 'Points earned per routine quest completion', 10, 'integer', 10),
('scoring', 'weights', 'scoring.weights.quest_seasonal', 'Quest (seasonal rite) points', 'Points earned per seasonal rite completion', 25, 'integer', 25),
('scoring', 'weights', 'scoring.weights.quest_epic', 'Quest (epic) points', 'Points earned per epic quest completion', 100, 'integer', 100),
('scoring', 'weights', 'scoring.weights.quest_welcome', 'Quest (welcome aboard) points', 'Points earned per welcome aboard quest', 5, 'integer', 5),
('scoring', 'weights', 'scoring.weights.forum_post', 'Forum post points', 'Points for creating a forum post', 5, 'integer', 5),
('scoring', 'weights', 'scoring.weights.forum_quality_reply', 'Quality reply points', 'Points for a reply with 3+ reactions', 3, 'integer', 3),
('scoring', 'weights', 'scoring.weights.forum_quality_threshold', 'Quality reply threshold', 'Minimum reactions for a reply to count as quality', 3, 'integer', 3),
('scoring', 'weights', 'scoring.weights.event_attended', 'Event attendance points', 'Points per event attended', 15, 'integer', 15),
('scoring', 'weights', 'scoring.weights.contribution_base', 'Contribution (base) points', 'Minimum points for a logged contribution', 10, 'integer', 10),
('scoring', 'weights', 'scoring.weights.contribution_max', 'Contribution (max) points', 'Maximum points for a high-value contribution', 50, 'integer', 50),
('scoring', 'weights', 'scoring.weights.contribution_verified_bonus', 'Verified contribution bonus', 'Added on top when admin verifies', 25, 'integer', 25),
('scoring', 'weights', 'scoring.weights.crowdpool_contribution', 'Crowd-pooling contribution', 'Points per crowd-pooling pledge', 20, 'integer', 20),
('scoring', 'weights', 'scoring.weights.referral_signup', 'Referral signup points', 'When a referred user creates account', 10, 'integer', 10),
('scoring', 'weights', 'scoring.weights.referral_first_quest', 'Referral first quest bonus', 'When referred user completes first quest', 15, 'integer', 15),
('scoring', 'weights', 'scoring.weights.endorsement_from_project', 'Endorsement from project', 'Receiving endorsement from a land project', 20, 'integer', 20),
('scoring', 'weights', 'scoring.weights.endorsement_from_player', 'Endorsement from player', 'Receiving endorsement from another player', 5, 'integer', 5),
('scoring', 'weights', 'scoring.weights.endorsement_given', 'Endorsement given', 'Giving an endorsement', 2, 'integer', 2),
('scoring', 'weights', 'scoring.weights.badge_base', 'Badge earned (base)', 'Minimum points for earning a badge', 10, 'integer', 10),
('scoring', 'weights', 'scoring.weights.badge_max', 'Badge earned (max)', 'Maximum points for a high-tier badge', 50, 'integer', 50),
('scoring', 'weights', 'scoring.weights.lunar_streak', 'Lunar streak (per week)', 'Compounds weekly for consecutive engagement', 2, 'integer', 2),
('scoring', 'weights', 'scoring.weights.gratitude_received', 'Gratitude received', 'Points when receiving a gratitude token', 3, 'integer', 3),
('scoring', 'weights', 'scoring.weights.gratitude_sent', 'Gratitude sent', 'Points for sending gratitude', 1, 'integer', 1),
('scoring', 'weights', 'scoring.weights.flag_validated_penalty', 'Validated flag penalty', 'Score deduction when flagged and confirmed', -50, 'integer', -50),
('scoring', 'weights', 'scoring.weights.cascading_endorsement_penalty', 'Cascading endorsement penalty', 'Score hit when you endorsed a flagged entity', -10, 'integer', -10);

-- Trust multiplier settings
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, minValue, maxValue) VALUES
('trust', 'multipliers', 'trust.multiplier.min', 'Trust multiplier floor', 'Lowest possible trust multiplier', 0.5, 'multiplier', 0.5, 0.1, 1.0),
('trust', 'multipliers', 'trust.multiplier.max', 'Trust multiplier ceiling', 'Highest possible trust multiplier', 1.5, 'multiplier', 1.5, 1.0, 3.0),
('trust', 'multipliers', 'trust.multiplier.default', 'Default trust multiplier', 'Applied to new players with no endorsements', 1.0, 'multiplier', 1.0, 0.5, 1.5),
('trust', 'weights', 'trust.endorsement_project_weight', 'Project endorsement weight', 'How much a project endorsement contributes to trust', 4, 'integer', 4, NULL, NULL),
('trust', 'weights', 'trust.endorsement_player_weight', 'Player endorsement weight', 'How much a player endorsement contributes to trust', 1, 'integer', 1, NULL, NULL),
('trust', 'weights', 'trust.account_age_weight', 'Account age weight', 'Trust bonus per completed season', 0.5, 'decimal', 0.5, NULL, NULL),
('trust', 'weights', 'trust.flag_penalty_weight', 'Flag penalty weight', 'Trust reduction per validated flag received', -5, 'integer', -5, NULL, NULL),
('trust', 'thresholds', 'trust.endorsements_for_max', 'Endorsements needed for max', 'Total weighted endorsements to reach 1.5x', 10, 'integer', 10, NULL, NULL);

-- Seasonal composting
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('composting', 'decay', 'composting.decay_rate', 'Seasonal decay rate', 'Percent of raw points that decay each season', 10, 'percentage', 10),
('composting', 'thresholds', 'composting.minimum_floor', 'Minimum retained points', 'Points never decay below this floor', 100, 'integer', 100),
('composting', 'toggle', 'composting.is_active', 'Composting enabled', 'Toggle composting on/off (off for early seasons)', 0, 'boolean', 0);

-- Harvest distribution
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('harvest', 'pool', 'harvest.pool_size', 'Seasonal token pool', 'Total $ReGen distributed as Harvest each season', 10000, 'integer', 10000),
('harvest', 'toggle', 'harvest.is_active', 'Harvest enabled', 'Toggle seasonal harvest on/off', 0, 'boolean', 0),
('harvest', 'thresholds', 'harvest.min_score_percentile', 'Minimum percentile for harvest', 'Players below this percentile get zero harvest', 10, 'integer', 10),
('harvest', 'distribution', 'harvest.distribution_curve', 'Distribution curve exponent', 'Higher = more reward to top percentiles', 1.5, 'decimal', 1.5);

-- Gratitude settings
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('gratitude', 'budget', 'gratitude.budget_base', 'Base gratitude budget', 'Gratitude tokens each player gets per season', 5, 'integer', 5),
('gratitude', 'budget', 'gratitude.budget_per_percentile', 'Bonus per percentile', 'Extra gratitude per contribution percentile point', 0.1, 'decimal', 0.1),
('gratitude', 'budget', 'gratitude.max_budget', 'Max gratitude budget', 'Cap on gratitude tokens per season', 15, 'integer', 15),
('gratitude', 'limits', 'gratitude.message_max_chars', 'Max message length', 'Character limit for gratitude messages', 280, 'integer', 280);

-- Land project status thresholds
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('projects', 'thresholds', 'projects.status.active_endorsements', 'Active status: endorsements', 'Player endorsements needed for Active', 3, 'integer', 3),
('projects', 'thresholds', 'projects.status.active_contributions', 'Active status: contributions', 'Logged contributions needed for Active', 5, 'integer', 5),
('projects', 'thresholds', 'projects.status.established_endorsements', 'Established: endorsements', 'Endorsements needed for Established', 10, 'integer', 10),
('projects', 'thresholds', 'projects.status.established_campaigns', 'Established: funded campaigns', 'Funded crowd-pooling campaigns for Established', 1, 'integer', 1),
('projects', 'thresholds', 'projects.status.anchor_endorsements', 'Anchor: endorsements', 'Endorsements needed for Anchor', 25, 'integer', 25),
('projects', 'thresholds', 'projects.status.anchor_seasons', 'Anchor: active seasons', 'Seasons active for Anchor status', 4, 'integer', 4);

-- Forum reputation weighting
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('forum', 'weights', 'forum.vote_weight_min', 'Min vote weight', 'Vote weight for lowest-tier player', 1.0, 'multiplier', 1.0),
('forum', 'weights', 'forum.vote_weight_max', 'Max vote weight', 'Vote weight for Guardian-tier player', 2.0, 'multiplier', 2.0),
('forum', 'thresholds', 'forum.quality_reply_min_reactions', 'Quality reply threshold', 'Reactions needed for a reply to count as quality', 3, 'integer', 3);

-- Contribution-gated quest tiers
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('quests', 'tiers', 'quests.tier_steward_min', 'Steward tier minimum percentile', 'Contribution percentile needed for Steward-tier quests', 70, 'integer', 70),
('quests', 'tiers', 'quests.tier_elder_min', 'Elder tier minimum percentile', 'Contribution percentile needed for Elder-tier quests', 85, 'integer', 85),
('quests', 'tiers', 'quests.tier_guardian_min', 'Guardian tier minimum percentile', 'Contribution percentile needed for Guardian-tier quests', 95, 'integer', 95),
('quests', 'tiers', 'quests.require_rites_complete', 'Require Rites of Passage', 'Must complete all 13 Rites before tier quests', 1, 'boolean', 1);

-- Governance / Seasonal Councils
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('governance', 'councils', 'governance.council_seats', 'Council seats per season', 'Number of seats on the seasonal council', 7, 'integer', 7),
('governance', 'councils', 'governance.council_min_score', 'Council minimum score', 'Minimum percentile to qualify for council', 80, 'integer', 80),
('governance', 'councils', 'governance.council_require_rites', 'Council requires Rites', 'Must complete Rites to sit on council', 1, 'boolean', 1),
('governance', 'thresholds', 'governance.cocreator_threshold_percentile', 'Co-creator threshold', 'Top N percentile eligible for co-creator invite', 90, 'integer', 90);

-- Seed initial season
INSERT INTO game_seasons (name, slug, startDate, endDate, status) VALUES
('Season of Roots', 'season-of-roots', '2026-03-01', '2026-08-31', 'active');
