-- Seed citizenship tier power toggle variables (6 powers x 4 tiers = 24 variables)
-- Plus harvest multipliers and additional requirement variables

-- Explorer powers (all false, entry tier)
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'powers', 'citizenship.explorer.can_submit_proposals', 'Explorer: submit proposals', 'Explorers can submit proposals', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.explorer.can_signal_vote', 'Explorer: signal vote', 'Explorers can signal-vote on proposals', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.explorer.can_rate_producers', 'Explorer: rate producers', 'Explorers can rate food producers', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.explorer.can_nominate_tiers', 'Explorer: nominate tiers', 'Explorers can nominate for tier advancement', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.explorer.can_arbitrate', 'Explorer: arbitrate', 'Explorers can arbitrate disputes', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.explorer.can_sponsor', 'Explorer: sponsor', 'Explorers can sponsor new players', 0, 'boolean', 0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Co-Creator powers
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'powers', 'citizenship.co_creator.can_submit_proposals', 'Co-Creator: submit proposals', 'Co-Creators can submit proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.co_creator.can_signal_vote', 'Co-Creator: signal vote', 'Co-Creators can signal-vote on proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.co_creator.can_rate_producers', 'Co-Creator: rate producers', 'Co-Creators can rate food producers', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.co_creator.can_nominate_tiers', 'Co-Creator: nominate tiers', 'Co-Creators can nominate for tier advancement', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.co_creator.can_arbitrate', 'Co-Creator: arbitrate', 'Co-Creators can arbitrate disputes', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.co_creator.can_sponsor', 'Co-Creator: sponsor', 'Co-Creators can sponsor new players', 0, 'boolean', 0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Steward powers
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'powers', 'citizenship.steward.can_submit_proposals', 'Steward: submit proposals', 'Stewards can submit proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.steward.can_signal_vote', 'Steward: signal vote', 'Stewards can signal-vote on proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.steward.can_rate_producers', 'Steward: rate producers', 'Stewards can rate food producers', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.steward.can_nominate_tiers', 'Steward: nominate tiers', 'Stewards can nominate for tier advancement', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.steward.can_arbitrate', 'Steward: arbitrate', 'Stewards can arbitrate disputes', 0, 'boolean', 0),
('citizenship', 'powers', 'citizenship.steward.can_sponsor', 'Steward: sponsor', 'Stewards can sponsor new players', 0, 'boolean', 0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Sage powers (all enabled)
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'powers', 'citizenship.sage.can_submit_proposals', 'Sage: submit proposals', 'Sages can submit proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.sage.can_signal_vote', 'Sage: signal vote', 'Sages can signal-vote on proposals', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.sage.can_rate_producers', 'Sage: rate producers', 'Sages can rate food producers', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.sage.can_nominate_tiers', 'Sage: nominate tiers', 'Sages can nominate for tier advancement', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.sage.can_arbitrate', 'Sage: arbitrate', 'Sages can arbitrate disputes', 1, 'boolean', 1),
('citizenship', 'powers', 'citizenship.sage.can_sponsor', 'Sage: sponsor', 'Sages can sponsor new players', 1, 'boolean', 1)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Harvest multipliers per tier
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'harvest', 'citizenship.explorer.harvest_multiplier', 'Explorer harvest multiplier', 'Harvest share multiplier for Explorers', 1.0, 'multiplier', 1.0),
('citizenship', 'harvest', 'citizenship.co_creator.harvest_multiplier', 'Co-Creator harvest multiplier', 'Harvest share multiplier for Co-Creators', 1.5, 'multiplier', 1.5),
('citizenship', 'harvest', 'citizenship.steward.harvest_multiplier', 'Steward harvest multiplier', 'Harvest share multiplier for Stewards', 2.0, 'multiplier', 2.0),
('citizenship', 'harvest', 'citizenship.sage.harvest_multiplier', 'Sage harvest multiplier', 'Harvest share multiplier for Sages', 3.0, 'multiplier', 3.0)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Grace period and demotion settings
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'demotion', 'citizenship.demotion.enabled', 'Demotion enabled', 'Auto-demote players who no longer meet tier requirements', 1, 'boolean', 1),
('citizenship', 'demotion', 'citizenship.demotion.notify_player', 'Notify on grace start', 'Send notification when grace period begins', 1, 'boolean', 1),
('citizenship', 'demotion', 'citizenship.demotion.admin_exempt_enabled', 'Admin exemptions', 'Allow admins to exempt specific players from demotion', 1, 'boolean', 1)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Additional Steward requirement variables from spec
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'steward', 'citizenship.steward.req.gratitude_given', 'Min gratitude given', 'Gratitude tokens given by Steward candidates', 15, 'integer', 15),
('citizenship', 'steward', 'citizenship.steward.req.endorsement_from_steward_or_sage', 'Endorsement from Steward/Sage', 'Must receive endorsement from existing Steward or Sage', 1, 'integer', 1)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Additional Sage requirement variables from spec
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('citizenship', 'sage', 'citizenship.sage.req.rites_complete', 'All rites complete', 'Total rites completed for Sage', 13, 'integer', 13),
('citizenship', 'sage', 'citizenship.sage.req.seasonal_councils_served', 'Seasonal councils served', 'Must have served on at least 1 Seasonal Council', 1, 'integer', 1),
('citizenship', 'sage', 'citizenship.sage.req.endorsement_from_sage', 'Endorsement from Sage', 'Must receive endorsements from existing Sages', 2, 'integer', 2),
('citizenship', 'sage', 'citizenship.sage.req.trust_score_percentile', 'Trust score percentile', 'Trust score must be above this percentile', 80, 'integer', 80)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);

-- Food economy variables
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES
('food_economy', 'go_live', 'food_economy.go_live.min_committed_producers', 'Min committed producers', 'Per bioregion for food economy go-live', 10, 'integer', 10),
('food_economy', 'go_live', 'food_economy.go_live.min_active_community_members', 'Min active community', 'Per bioregion for food economy go-live', 100, 'integer', 100)
ON DUPLICATE KEY UPDATE displayName = VALUES(displayName);
