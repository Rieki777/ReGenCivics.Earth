-- Seed Game Variables: Citizenship tiers, trust scores, harvest, gratitude, referrals, quest tiers, lunar cycles

-- ─── Citizenship Tier Requirements ────────────────────────────────────────

-- Co-Creator requirements
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'co_creator', 'citizenship.co_creator.min_percentile', 'Min percentile', 'Minimum contribution score percentile for Co-Creator', 15, 'integer', 15),
('citizenship', 'co_creator', 'citizenship.co_creator.min_fire_quest', 'Fire quest required', 'Must complete Fire quest (1=yes)', 1, 'boolean', 1),
('citizenship', 'co_creator', 'citizenship.co_creator.min_rites', 'Min seasonal rites', 'Minimum seasonal rites completed', 1, 'integer', 1),
('citizenship', 'co_creator', 'citizenship.co_creator.min_gratitude_sent', 'Min gratitude sent', 'Minimum gratitude tokens sent', 5, 'integer', 5),
('citizenship', 'co_creator', 'citizenship.co_creator.min_seasons', 'Min seasons active', 'Minimum seasons with activity', 2, 'integer', 2)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Steward requirements
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'steward', 'citizenship.steward.min_percentile', 'Min percentile', 'Minimum contribution score percentile for Steward', 50, 'integer', 50),
('citizenship', 'steward', 'citizenship.steward.min_epic_quests', 'Min epic quests', 'Epic quests completed', 1, 'integer', 1),
('citizenship', 'steward', 'citizenship.steward.min_endorsements_project', 'Min project endorsements', 'Endorsements from land projects', 1, 'integer', 1),
('citizenship', 'steward', 'citizenship.steward.min_gratitude_received', 'Min gratitude received', 'Gratitude tokens received from others', 10, 'integer', 10),
('citizenship', 'steward', 'citizenship.steward.min_seasons', 'Min seasons active', 'Minimum seasons with activity', 3, 'integer', 3)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Sage requirements
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'sage', 'citizenship.sage.min_percentile', 'Min percentile', 'Minimum contribution score percentile for Sage', 90, 'integer', 90),
('citizenship', 'sage', 'citizenship.sage.min_seasons', 'Min seasons active', 'Minimum seasons with activity', 6, 'integer', 6),
('citizenship', 'sage', 'citizenship.sage.min_contributions', 'Min total contributions', 'Total verified contributions', 100, 'integer', 100),
('citizenship', 'sage', 'citizenship.sage.min_endorsements_total', 'Min total endorsements', 'Total endorsements received', 10, 'integer', 10)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Grace period
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'grace', 'citizenship.grace_period_days', 'Grace period (days)', 'Days before demotion after requirements drop', 30, 'integer', 30)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Citizenship Power Variables (per tier) ───────────────────────────────

-- Gratitude budgets per tier
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'powers', 'citizenship.gratitude_budget.explorer', 'Explorer gratitude budget', 'Gratitude tokens per season for Explorers', 3, 'integer', 3),
('citizenship', 'powers', 'citizenship.gratitude_budget.co_creator', 'Co-Creator gratitude budget', 'Gratitude tokens per season for Co-Creators', 5, 'integer', 5),
('citizenship', 'powers', 'citizenship.gratitude_budget.steward', 'Steward gratitude budget', 'Gratitude tokens per season for Stewards', 8, 'integer', 8),
('citizenship', 'powers', 'citizenship.gratitude_budget.sage', 'Sage gratitude budget', 'Gratitude tokens per season for Sages', 13, 'integer', 13)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Gratitude multipliers per tier
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('gratitude', 'multipliers', 'gratitude.multiplier.explorer', 'Explorer gratitude multiplier', 'Weight applied to Explorer gratitude', 1.0, 'multiplier', 1.0),
('gratitude', 'multipliers', 'gratitude.multiplier.co_creator', 'Co-Creator gratitude multiplier', 'Weight applied to Co-Creator gratitude', 1.2, 'multiplier', 1.2),
('gratitude', 'multipliers', 'gratitude.multiplier.steward', 'Steward gratitude multiplier', 'Weight applied to Steward gratitude', 1.5, 'multiplier', 1.5),
('gratitude', 'multipliers', 'gratitude.multiplier.sage', 'Sage gratitude multiplier', 'Weight applied to Sage gratitude', 2.0, 'multiplier', 2.0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Trust graph gratitude variables
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('gratitude', 'trust_graph', 'gratitude.trust_graph.received_weight', 'Received gratitude weight', 'How much each received gratitude adds to multiplier', 0.1, 'decimal', 0.1),
('gratitude', 'trust_graph', 'gratitude.trust_graph.max_bonus', 'Max trust graph bonus', 'Cap on bonus from gratitude trust graph', 0.5, 'decimal', 0.5)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Trust Score Weights ──────────────────────────────────────────────────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('trust', 'weights', 'trust.weight.endorsements_from_projects', 'Project endorsement weight', 'Trust weight per project endorsement', 4, 'integer', 4),
('trust', 'weights', 'trust.weight.endorsements_from_players', 'Player endorsement weight', 'Trust weight per player endorsement', 1, 'integer', 1),
('trust', 'weights', 'trust.weight.account_age_seasons', 'Account age weight', 'Trust bonus per completed season', 0.5, 'decimal', 0.5),
('trust', 'weights', 'trust.weight.quests_completed', 'Quests completed weight', 'Trust bonus per quest completed', 0.2, 'decimal', 0.2),
('trust', 'weights', 'trust.weight.gratitude_received', 'Gratitude received weight', 'Trust bonus per gratitude received', 0.3, 'decimal', 0.3),
('trust', 'weights', 'trust.weight.flags_validated', 'Validated flag penalty', 'Trust reduction per validated flag', -5, 'integer', -5),
('trust', 'weights', 'trust.weight.contribution_percentile', 'Contribution percentile weight', 'Trust bonus per percentile point', 0.01, 'decimal', 0.01),
('trust', 'composting', 'trust.composting_rate', 'Trust composting rate', 'Percentage of trust score that decays each season if inactive', 5, 'percentage', 5)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Harvest Distribution Variables ───────────────────────────────────────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('harvest', 'split', 'harvest.split.contributors', 'Contributors share', 'Percentage of harvest pool for contributors', 30, 'percentage', 30),
('harvest', 'split', 'harvest.split.bffs', 'BFFs share', 'Percentage of harvest pool for Bioregional Financing Facilities', 20, 'percentage', 20),
('harvest', 'split', 'harvest.split.orgs', 'Organisations share', 'Percentage of harvest pool for alliance organisations', 20, 'percentage', 20),
('harvest', 'split', 'harvest.split.treasury', 'Treasury share', 'Percentage of harvest pool retained in treasury', 30, 'percentage', 30),
('harvest', 'testing', 'harvest.test_pool_size', 'Test pool size', 'Amount of $ReGen for early-season test distributions (admin sets)', 0, 'integer', 0),
('harvest', 'toggle', 'harvest.go_live_enabled', 'Harvest go-live', 'Full automated harvest distribution (requires 50 orgs, 500 players, 10 land projects)', 0, 'boolean', 0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Referral Reward Variables ────────────────────────────────────��───────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('referral', 'rewards', 'referral.reward.signup', 'Signup reward', '$ReGen earned when referred user creates account', 5, 'integer', 5),
('referral', 'rewards', 'referral.reward.first_quest', 'First quest reward', '$ReGen earned when referred user completes first quest', 10, 'integer', 10),
('referral', 'rewards', 'referral.reward.seasonal_rite', 'Seasonal rite reward', '$ReGen earned when referred user completes a seasonal rite', 15, 'integer', 15),
('referral', 'rewards', 'referral.reward.crowdpooling', 'Crowd-pooling reward', '$ReGen earned when referred user contributes to crowd-pooling', 25, 'integer', 25),
('referral', 'rewards', 'referral.reward.second_degree', 'Second-degree reward', '$ReGen earned from 2nd-degree referral activity', 5, 'integer', 5),
('referral', 'limits', 'referral.max_rewards_per_month', 'Max rewards per month', 'Cap on referral rewards per user per month', 50, 'integer', 50),
('referral', 'limits', 'referral.max_second_degree_per_month', 'Max 2nd-degree per month', 'Cap on 2nd-degree referral rewards per month', 10, 'integer', 10)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Proposal System Variables ─────────────────────────────────────���──────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('proposals', 'thresholds', 'proposals.signal_threshold', 'Signal vote threshold', 'Upvotes needed before proposal is ready for Hypha governance', 25, 'integer', 25)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Organisation Rating Variables ────────────────────────────────────────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('organisations', 'ratings', 'org_rating.min_raters', 'Min raters for score', 'Minimum community ratings before org gets a regenerative score', 5, 'integer', 5)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Land Project Status Thresholds ───────────────────────────────────────

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('projects', 'progression', 'project.accepted_endorsements', 'Endorsements for accepted', 'Endorsements needed to advance from applied to accepted', 1, 'integer', 1),
('projects', 'progression', 'project.active_endorsements', 'Endorsements for active', 'Endorsements needed to advance from accepted to active', 3, 'integer', 3),
('projects', 'progression', 'project.active_contributions', 'Contributions for active', 'Community contributions needed for active status', 5, 'integer', 5),
('projects', 'progression', 'project.established_funded_campaigns', 'Funded campaigns for established', 'Crowd-pooling campaigns funded for established', 1, 'integer', 1),
('projects', 'progression', 'project.established_seasons', 'Seasons for established', 'Active seasons required for established', 3, 'integer', 3),
('projects', 'progression', 'project.anchor_seasons', 'Seasons for anchor', 'Active seasons required for anchor status', 8, 'integer', 8),
('projects', 'progression', 'project.anchor_endorsements', 'Endorsements for anchor', 'Endorsements needed for anchor status', 20, 'integer', 20)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- ─── Quest Unlock Tiers ───────────────────────────────────────────────────

INSERT INTO quest_unlock_tiers (name, minimumPercentile, requiresRitesComplete) VALUES
('Cultivator', 70, TRUE),
('Elder', 85, TRUE),
('Guardian', 95, TRUE)
ON DUPLICATE KEY UPDATE minimumPercentile = VALUES(minimumPercentile);

-- ─── Lunar Cycles 2026-2028 (New Moon dates, GMT) ���────────────────────────
-- Each cycle runs from one new moon to the next

INSERT INTO lunar_cycles (startDate, endDate, name, status) VALUES
-- 2026
('2026-01-29 12:36:00', '2026-02-28 00:45:00', 'Snow Moon 2026', 'completed'),
('2026-02-28 00:45:00', '2026-03-29 10:58:00', 'Worm Moon 2026', 'completed'),
('2026-03-29 10:58:00', '2026-04-27 19:31:00', 'Pink Moon 2026', 'active'),
('2026-04-27 19:31:00', '2026-05-27 03:02:00', 'Flower Moon 2026', 'upcoming'),
('2026-05-27 03:02:00', '2026-06-25 10:31:00', 'Strawberry Moon 2026', 'upcoming'),
('2026-06-25 10:31:00', '2026-07-24 19:08:00', 'Buck Moon 2026', 'upcoming'),
('2026-07-24 19:08:00', '2026-08-23 05:07:00', 'Sturgeon Moon 2026', 'upcoming'),
('2026-08-23 05:07:00', '2026-09-21 16:54:00', 'Harvest Moon 2026', 'upcoming'),
('2026-09-21 16:54:00', '2026-10-21 06:25:00', 'Hunter Moon 2026', 'upcoming'),
('2026-10-21 06:25:00', '2026-11-19 21:47:00', 'Beaver Moon 2026', 'upcoming'),
('2026-11-19 21:47:00', '2026-12-19 14:43:00', 'Cold Moon 2026', 'upcoming'),
-- 2027
('2026-12-19 14:43:00', '2027-01-18 08:48:00', 'Wolf Moon 2027', 'upcoming'),
('2027-01-18 08:48:00', '2027-02-17 03:01:00', 'Snow Moon 2027', 'upcoming'),
('2027-02-17 03:01:00', '2027-03-18 20:23:00', 'Worm Moon 2027', 'upcoming'),
('2027-03-18 20:23:00', '2027-04-17 11:51:00', 'Pink Moon 2027', 'upcoming'),
('2027-04-17 11:51:00', '2027-05-17 01:21:00', 'Flower Moon 2027', 'upcoming'),
('2027-05-17 01:21:00', '2027-06-15 12:44:00', 'Strawberry Moon 2027', 'upcoming'),
('2027-06-15 12:44:00', '2027-07-14 22:44:00', 'Buck Moon 2027', 'upcoming'),
('2027-07-14 22:44:00', '2027-08-13 08:22:00', 'Sturgeon Moon 2027', 'upcoming'),
('2027-08-13 08:22:00', '2027-09-11 18:17:00', 'Harvest Moon 2027', 'upcoming'),
('2027-09-11 18:17:00', '2027-10-11 05:25:00', 'Hunter Moon 2027', 'upcoming'),
('2027-10-11 05:25:00', '2027-11-09 18:01:00', 'Beaver Moon 2027', 'upcoming'),
('2027-11-09 18:01:00', '2027-12-09 08:52:00', 'Cold Moon 2027', 'upcoming'),
-- 2028
('2027-12-09 08:52:00', '2028-01-08 01:25:00', 'Wolf Moon 2028', 'upcoming'),
('2028-01-08 01:25:00', '2028-02-06 18:45:00', 'Snow Moon 2028', 'upcoming'),
('2028-02-06 18:45:00', '2028-03-07 11:29:00', 'Worm Moon 2028', 'upcoming'),
('2028-03-07 11:29:00', '2028-04-06 02:49:00', 'Pink Moon 2028', 'upcoming'),
('2028-04-06 02:49:00', '2028-05-05 16:03:00', 'Flower Moon 2028', 'upcoming'),
('2028-05-05 16:03:00', '2028-06-04 03:22:00', 'Strawberry Moon 2028', 'upcoming'),
('2028-06-04 03:22:00', '2028-07-03 13:16:00', 'Buck Moon 2028', 'upcoming'),
('2028-07-03 13:16:00', '2028-08-01 22:27:00', 'Sturgeon Moon 2028', 'upcoming'),
('2028-08-01 22:27:00', '2028-08-31 07:37:00', 'Harvest Moon 2028', 'upcoming'),
('2028-08-31 07:37:00', '2028-09-29 17:36:00', 'Hunter Moon 2028', 'upcoming'),
('2028-09-29 17:36:00', '2028-10-29 05:24:00', 'Beaver Moon 2028', 'upcoming'),
('2028-10-29 05:24:00', '2028-11-27 19:24:00', 'Cold Moon 2028', 'upcoming');
