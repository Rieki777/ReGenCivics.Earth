INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue) VALUES

-- Voting weights by citizenship tier (Improvement #11)
('governance', 'weights', 'governance.vote_weight.visitor', 'Vote weight: Visitor', 'Stance weight for Visitor tier citizens in Loomio decisions', 1, 'integer', 1),
('governance', 'weights', 'governance.vote_weight.citizen', 'Vote weight: Citizen', 'Stance weight for Citizen tier in Loomio decisions', 2, 'integer', 2),
('governance', 'weights', 'governance.vote_weight.contributor', 'Vote weight: Contributor', 'Stance weight for Contributor tier in Loomio decisions', 3, 'integer', 3),
('governance', 'weights', 'governance.vote_weight.steward', 'Vote weight: Steward', 'Stance weight for Steward tier in Loomio decisions', 5, 'integer', 5),

-- Readiness gates for promoting a forum thread to a decision (Improvement #1)
('governance', 'promotion', 'governance.promotion.min_thread_age_hours', 'Promotion: minimum thread age', 'Hours a forum thread must exist before it can be promoted to a decision', 48, 'integer', 48),
('governance', 'promotion', 'governance.promotion.min_unique_voices', 'Promotion: minimum unique voices', 'Distinct citizens who must have replied before promotion', 3, 'integer', 3),
('governance', 'promotion', 'governance.promotion.cosigner_window_hours', 'Promotion: co-signer window', 'Hours for a second citizen to co-sign a promotion before it expires (Dual-key)', 24, 'integer', 24),
('governance', 'promotion', 'governance.promotion.heat_score_threshold', 'Promotion: heat score threshold', 'Composite heat score at which the green Ready-to-promote button lights up', 50, 'integer', 50),

-- Decision defaults and windows
('governance', 'defaults', 'governance.default_decision_window_days', 'Default decision window', 'Default number of days a new decision stays open for voting', 7, 'integer', 7),
('governance', 'defaults', 'governance.reflection_window_hours', 'Reflection window', 'Hours after a decision opens during which people can read but not vote', 24, 'integer', 24),
('governance', 'defaults', 'governance.closing_soon_window_hours', 'Closing soon window', 'How many hours before close a decision is marked closing soon', 48, 'integer', 48),
('governance', 'defaults', 'governance.snapshot_window_hours', 'Snapshot (urgent) window', 'Hours for a snapshot-mode urgent decision. Requires Steward sign-off', 6, 'integer', 6),

-- Sunset and reversibility (Improvement #13 plus sunset addition)
('governance', 'sunset', 'governance.default_sunset_days', 'Default sunset', 'Default number of days before a decision sunsets if no renewal', 365, 'integer', 365),
('governance', 'sunset', 'governance.sunset_renewal_warning_days', 'Sunset renewal warning', 'Days before sunset that a renewal thread auto-creates', 7, 'integer', 7),
('governance', 'sunset', 'governance.one_way_door_min_window_hours', 'One-way-door minimum window', 'Minimum voting window in hours for one-way-door decisions', 72, 'integer', 72),

-- Storyteller system (Improvement #14)
('governance', 'storyteller', 'governance.storyteller_threshold_tokens', 'Storyteller threshold', 'Internal token value above which a decision auto-assigns a storyteller', 100000, 'integer', 100000),
('governance', 'storyteller', 'governance.storyteller_narrative_min_words', 'Storyteller min words', 'Minimum word count for a storyteller narrative to publish', 300, 'integer', 300),
('governance', 'storyteller', 'governance.storyteller_narrative_max_words', 'Storyteller max words', 'Maximum word count for a storyteller narrative', 600, 'integer', 600),

-- Pre-mortem (Improvement #15)
('governance', 'premortem', 'governance.premortem.auto_create_delay_hours', 'Pre-mortem auto-create delay', 'Hours after main decision opens that the pre-mortem sub-poll auto-creates', 24, 'integer', 24),
('governance', 'premortem', 'governance.premortem.top_concerns_to_address', 'Pre-mortem top concerns', 'Number of top-agreed concerns the proposer must respond to before close', 3, 'integer', 3),

-- Claim thresholds for the Hypha Bridge (Improvement #11 internal tokens)
('governance', 'claim', 'governance.claim_threshold_tokens', 'Claim threshold (to Hypha)', 'Internal token balance a player must reach before they can claim to Hypha on Base', 1000, 'integer', 1000),
('governance', 'claim', 'governance.claim_bundle_max_items', 'Claim bundle max items', 'Maximum internal ledger entries bundled into a single Hypha claim proposal', 20, 'integer', 20),
('governance', 'claim', 'governance.claim_cooldown_days', 'Claim cooldown', 'Days a player must wait between successful Hypha claims', 30, 'integer', 30),

-- Delegation (Improvement #3)
('governance', 'delegation', 'governance.delegation_max_hops', 'Delegation max hops', 'Maximum transitive hops for proxy delegation before delegation stops flowing', 2, 'integer', 2),
('governance', 'delegation', 'governance.delegation_is_active', 'Delegation enabled', 'Whether proxy delegation is turned on right now', 0, 'boolean', 0),

-- ReGen Guide posting (Improvement #4)
('governance', 'regen_guide', 'governance.guide.proactive_posts_per_week', 'Guide proactive posts per week', 'Maximum proactive Guide posts per tenant per week (rate limit)', 5, 'integer', 5),
('governance', 'regen_guide', 'governance.guide.devil_advocate_unanimity_pct', 'Guide devil-advocate trigger', 'Percentage of unanimous consent that triggers Guide devil-advocate post', 95, 'integer', 95),
('governance', 'regen_guide', 'governance.guide.is_active', 'Guide participation enabled', 'Whether ReGen Guide can post and comment in governance contexts', 1, 'boolean', 1),

-- Load dashboard (Improvement #20)
('governance', 'load', 'governance.load.warning_threshold', 'Governance load warning', 'Rolling-30-day decision count above which the community load bar turns yellow', 15, 'integer', 15),
('governance', 'load', 'governance.load.critical_threshold', 'Governance load critical', 'Rolling-30-day decision count above which the load bar turns red and suggests a pause', 30, 'integer', 30),

-- Back Field (Improvement #6, renamed from "parking lot")
('governance', 'backfield', 'governance.backfield.review_cadence_days', 'Back Field review cadence', 'Days between Steward reviews of the Back Field backlog', 90, 'integer', 90);
