-- Migration 0166: Game Mechanics page becomes fully database-driven (ASSEMBLY_PAGE_SPEC.md section 6)
-- Adds the unit column, moves descriptions from the frontend VARIABLE_HELP dict
-- into the DB (the dict is deleted from the page in the same change), fills
-- bounds where missing (slider bounds AND hard bounds for governance
-- auto-apply), and seeds the two phantom gratitude simulator keys for real.

ALTER TABLE game_variables ADD COLUMN unit VARCHAR(20) NULL;

UPDATE game_variables SET description = 'Points you earn for completing a routine quest. Routine quests are the small, repeatable actions that build a habit of showing up.' WHERE `key` = 'scoring.weights.quest_routine';
UPDATE game_variables SET description = 'Points for completing a seasonal rite. These are bigger, once-a-season quests tied to the wheel of the year.' WHERE `key` = 'scoring.weights.quest_seasonal';
UPDATE game_variables SET description = 'Points for completing an epic quest. These are multi-week, high-effort quests reserved for deep contributors.' WHERE `key` = 'scoring.weights.quest_epic';
UPDATE game_variables SET description = 'Points for completing a welcome aboard quest. Lower value because they''re designed to be easy first wins.' WHERE `key` = 'scoring.weights.quest_welcome';
UPDATE game_variables SET description = 'Points for writing a forum post. Small per-post value encourages quality over spam.' WHERE `key` = 'scoring.weights.forum_post';
UPDATE game_variables SET description = 'Bonus points when one of your forum replies gets enough reactions to count as quality.' WHERE `key` = 'scoring.weights.forum_quality_reply';
UPDATE game_variables SET description = 'Points for showing up to an event in person or on a call.' WHERE `key` = 'scoring.weights.event_attended';
UPDATE game_variables SET description = 'The floor value for any logged contribution before quality weighting kicks in.' WHERE `key` = 'scoring.weights.contribution_base';
UPDATE game_variables SET description = 'The ceiling for a single highly-valued contribution.' WHERE `key` = 'scoring.weights.contribution_max';
UPDATE game_variables SET description = 'Extra points added on top when an admin verifies that a contribution actually happened.' WHERE `key` = 'scoring.weights.contribution_verified_bonus';
UPDATE game_variables SET description = 'Points you earn when you pledge to a crowd-pooling campaign for a land project.' WHERE `key` = 'scoring.weights.crowdpool_contribution';
UPDATE game_variables SET description = 'Points you get when someone you invited creates an account.' WHERE `key` = 'scoring.weights.referral_signup';
UPDATE game_variables SET description = 'Bonus points when your referral completes their first quest. Rewards actually onboarding people, not just signups.' WHERE `key` = 'scoring.weights.referral_first_quest';
UPDATE game_variables SET description = 'Points you receive when a land project endorses you. Worth more than a player endorsement because projects are rarer.' WHERE `key` = 'scoring.weights.endorsement_from_project';
UPDATE game_variables SET description = 'Points you receive when another player endorses you.' WHERE `key` = 'scoring.weights.endorsement_from_player';
UPDATE game_variables SET description = 'Small points for giving an endorsement. Kept low so endorsements stay meaningful.' WHERE `key` = 'scoring.weights.endorsement_given';
UPDATE game_variables SET description = 'Points added per week when you keep engaging consistently. Compounds over the season.' WHERE `key` = 'scoring.weights.lunar_streak';
UPDATE game_variables SET description = 'Points you earn for every gratitude token sent to you.' WHERE `key` = 'scoring.weights.gratitude_received';
UPDATE game_variables SET description = 'Small points for sending gratitude. Kept low so you can''t farm score by spamming gratitude.' WHERE `key` = 'scoring.weights.gratitude_sent';
UPDATE game_variables SET description = 'Points deducted if you''re flagged and the flag is confirmed. Negative to discourage bad behavior.' WHERE `key` = 'scoring.weights.flag_validated_penalty';
UPDATE game_variables SET description = 'Small penalty if you endorsed someone who later gets flagged. Makes endorsements feel weighty.' WHERE `key` = 'scoring.weights.cascading_endorsement_penalty';
UPDATE game_variables SET description = 'The lowest trust multiplier possible. A new player with zero endorsements sits near here.' WHERE `key` = 'trust.multiplier.min';
UPDATE game_variables SET description = 'The highest trust multiplier possible. Long-time Stewards and Sages with lots of endorsements sit near here.' WHERE `key` = 'trust.multiplier.max';
UPDATE game_variables SET description = 'The trust multiplier new players start with before any endorsements.' WHERE `key` = 'trust.multiplier.default';
UPDATE game_variables SET description = 'How much each project endorsement moves your trust score. Projects matter more than individual players.' WHERE `key` = 'trust.endorsement_project_weight';
UPDATE game_variables SET description = 'How much each player endorsement moves your trust score.' WHERE `key` = 'trust.endorsement_player_weight';
UPDATE game_variables SET description = 'Trust bonus per completed season. Rewards people who stick around.' WHERE `key` = 'trust.account_age_weight';
UPDATE game_variables SET description = 'Trust loss per confirmed flag against you.' WHERE `key` = 'trust.flag_penalty_weight';
UPDATE game_variables SET description = 'How many weighted endorsements you need to reach the maximum trust multiplier.' WHERE `key` = 'trust.endorsements_for_max';
UPDATE game_variables SET description = 'Percentage of your trust score that composts away each season if you''re inactive. Keeps trust current, not historical.' WHERE `key` = 'trust.composting_rate';
UPDATE game_variables SET description = 'The percentage of your raw score that composts back to the pool each season. Keeps the game fresh by rewarding current effort over past glory.' WHERE `key` = 'composting.decay_rate';
UPDATE game_variables SET description = 'Your score never composts below this floor. Protects long-time players from losing everything during a quiet season.' WHERE `key` = 'composting.minimum_floor';
UPDATE game_variables SET description = 'Whether seasonal composting is turned on right now. Off in early seasons while the game is still calibrating.' WHERE `key` = 'composting.is_active';
UPDATE game_variables SET description = 'The total $ReGen distributed as Harvest at the end of each season. Players get a share based on their contribution percentile.' WHERE `key` = 'harvest.pool_size';
UPDATE game_variables SET description = 'Whether seasonal Harvest distribution is turned on. Off until the game has enough players, orgs, and land projects.' WHERE `key` = 'harvest.is_active';
UPDATE game_variables SET description = 'Players below this percentile get zero Harvest. Prevents dust-level payouts and rewards meaningful contribution.' WHERE `key` = 'harvest.min_score_percentile';
UPDATE game_variables SET description = 'Higher values concentrate Harvest at the top. Lower values flatten the curve.' WHERE `key` = 'harvest.distribution_curve';
UPDATE game_variables SET description = 'Share of the Harvest pool that goes to individual player contributors.' WHERE `key` = 'harvest.split.contributors';
UPDATE game_variables SET description = 'Share of the Harvest pool that goes to Bioregional Financing Facilities.' WHERE `key` = 'harvest.split.bffs';
UPDATE game_variables SET description = 'Share of the Harvest pool that goes to alliance organisations.' WHERE `key` = 'harvest.split.orgs';
UPDATE game_variables SET description = 'Share of the Harvest pool retained in the treasury for ongoing work.' WHERE `key` = 'harvest.split.treasury';
UPDATE game_variables SET description = 'Your starting gratitude budget per cycle. Multiplied by your citizenship tier, then boosted by streaks.' WHERE `key` = 'gratitude.budget_base';
UPDATE game_variables SET description = 'Extra gratitude you get per percentile point of contribution. Rewards top contributors with more voice.' WHERE `key` = 'gratitude.budget_per_percentile';
UPDATE game_variables SET description = 'The absolute ceiling on gratitude you can have in a single cycle.' WHERE `key` = 'gratitude.max_budget';
UPDATE game_variables SET description = 'Character limit on the message you attach to a gratitude send. Short because gratitude is supposed to feel quick.' WHERE `key` = 'gratitude.message_max_chars';
UPDATE game_variables SET description = 'How much weight an Explorer''s gratitude carries when distributing the $ReGen pool.' WHERE `key` = 'gratitude.multiplier.explorer';
UPDATE game_variables SET description = 'How much weight a Co-Creator''s gratitude carries.' WHERE `key` = 'gratitude.multiplier.co_creator';
UPDATE game_variables SET description = 'How much weight a Steward''s gratitude carries.' WHERE `key` = 'gratitude.multiplier.steward';
UPDATE game_variables SET description = 'How much weight a Sage''s gratitude carries. Sages have the most influence on where $ReGen flows.' WHERE `key` = 'gratitude.multiplier.sage';
UPDATE game_variables SET description = 'How much each gratitude you''ve received adds to your trust multiplier in the gratitude graph.' WHERE `key` = 'gratitude.trust_graph.received_weight';
UPDATE game_variables SET description = 'The maximum bonus you can earn from the gratitude trust graph. Caps the snowball effect.' WHERE `key` = 'gratitude.trust_graph.max_bonus';
UPDATE game_variables SET description = 'Contribution percentile you need to reach Co-Creator.' WHERE `key` = 'citizenship.co_creator.min_percentile';
UPDATE game_variables SET description = 'Whether you must complete the Fire quest to reach Co-Creator.' WHERE `key` = 'citizenship.co_creator.min_fire_quest';
UPDATE game_variables SET description = 'Seasonal rites you need to complete to reach Co-Creator.' WHERE `key` = 'citizenship.co_creator.min_rites';
UPDATE game_variables SET description = 'Gratitude tokens you need to have sent to reach Co-Creator.' WHERE `key` = 'citizenship.co_creator.min_gratitude_sent';
UPDATE game_variables SET description = 'Seasons of activity needed to reach Co-Creator.' WHERE `key` = 'citizenship.co_creator.min_seasons';
UPDATE game_variables SET description = 'Contribution percentile needed to reach Steward.' WHERE `key` = 'citizenship.steward.min_percentile';
UPDATE game_variables SET description = 'Epic quests you need to complete to reach Steward.' WHERE `key` = 'citizenship.steward.min_epic_quests';
UPDATE game_variables SET description = 'Project endorsements needed to reach Steward.' WHERE `key` = 'citizenship.steward.min_endorsements_project';
UPDATE game_variables SET description = 'Gratitude you need to have received from others to reach Steward.' WHERE `key` = 'citizenship.steward.min_gratitude_received';
UPDATE game_variables SET description = 'Seasons of activity needed to reach Steward.' WHERE `key` = 'citizenship.steward.min_seasons';
UPDATE game_variables SET description = 'Contribution percentile needed to reach Sage.' WHERE `key` = 'citizenship.sage.min_percentile';
UPDATE game_variables SET description = 'Seasons of activity needed to reach Sage. Sage is a long-game tier.' WHERE `key` = 'citizenship.sage.min_seasons';
UPDATE game_variables SET description = 'Total verified contributions needed to reach Sage.' WHERE `key` = 'citizenship.sage.min_contributions';
UPDATE game_variables SET description = 'Total endorsements received needed to reach Sage.' WHERE `key` = 'citizenship.sage.min_endorsements_total';
UPDATE game_variables SET description = 'Days you have to re-qualify before you''re demoted. Protects you from losing a tier on a quiet week.' WHERE `key` = 'citizenship.grace_period_days';
UPDATE game_variables SET description = 'Gratitude tokens an Explorer gets per season.' WHERE `key` = 'citizenship.gratitude_budget.explorer';
UPDATE game_variables SET description = 'Gratitude tokens a Co-Creator gets per season.' WHERE `key` = 'citizenship.gratitude_budget.co_creator';
UPDATE game_variables SET description = 'Gratitude tokens a Steward gets per season.' WHERE `key` = 'citizenship.gratitude_budget.steward';
UPDATE game_variables SET description = 'Gratitude tokens a Sage gets per season.' WHERE `key` = 'citizenship.gratitude_budget.sage';
UPDATE game_variables SET description = 'Player endorsements a land project needs to move into Active status.' WHERE `key` = 'projects.status.active_endorsements';
UPDATE game_variables SET description = 'Logged contributions a land project needs to move into Active status.' WHERE `key` = 'projects.status.active_contributions';
UPDATE game_variables SET description = 'Endorsements needed for Established status.' WHERE `key` = 'projects.status.established_endorsements';
UPDATE game_variables SET description = 'Funded crowd-pooling campaigns needed for Established status.' WHERE `key` = 'projects.status.established_campaigns';
UPDATE game_variables SET description = 'Endorsements needed for Anchor status. Anchors are the cornerstone land projects of the network.' WHERE `key` = 'projects.status.anchor_endorsements';
UPDATE game_variables SET description = 'Seasons of continuous activity needed for Anchor status.' WHERE `key` = 'projects.status.anchor_seasons';
UPDATE game_variables SET description = 'Lowest forum vote weight. A brand new player''s vote carries this much.' WHERE `key` = 'forum.vote_weight_min';
UPDATE game_variables SET description = 'Highest forum vote weight. A Guardian''s vote carries this much.' WHERE `key` = 'forum.vote_weight_max';
UPDATE game_variables SET description = 'Reactions a forum reply needs to count as quality and earn bonus points.' WHERE `key` = 'forum.quality_reply_min_reactions';
UPDATE game_variables SET description = 'Contribution percentile required to access Steward-tier quests.' WHERE `key` = 'quests.tier_steward_min';
UPDATE game_variables SET description = 'Contribution percentile required to access Elder-tier quests.' WHERE `key` = 'quests.tier_elder_min';
UPDATE game_variables SET description = 'Contribution percentile required to access Guardian-tier quests.' WHERE `key` = 'quests.tier_guardian_min';
UPDATE game_variables SET description = 'Whether all Rites of Passage must be complete before tier quests become available.' WHERE `key` = 'quests.require_rites_complete';
UPDATE game_variables SET description = 'Seats on the seasonal council each season.' WHERE `key` = 'governance.council_seats';
UPDATE game_variables SET description = 'Minimum contribution percentile needed to qualify for the council.' WHERE `key` = 'governance.council_min_score';
UPDATE game_variables SET description = 'Whether council members must have completed the Rites.' WHERE `key` = 'governance.council_require_rites';
UPDATE game_variables SET description = 'Top contribution percentile eligible for a Co-Creator invite.' WHERE `key` = 'governance.cocreator_threshold_percentile';
UPDATE game_variables SET description = '$ReGen you earn when someone you invited creates an account.' WHERE `key` = 'referral.reward.signup';
UPDATE game_variables SET description = '$ReGen you earn when your referral completes their first quest.' WHERE `key` = 'referral.reward.first_quest';
UPDATE game_variables SET description = '$ReGen you earn when your referral completes a seasonal rite.' WHERE `key` = 'referral.reward.seasonal_rite';
UPDATE game_variables SET description = '$ReGen you earn when your referral contributes to a crowd-pooling campaign.' WHERE `key` = 'referral.reward.crowdpooling';
UPDATE game_variables SET description = '$ReGen you earn from the activity of people your referrals invited.' WHERE `key` = 'referral.reward.second_degree';
UPDATE game_variables SET description = 'Cap on total referral rewards per user per month. Prevents referral farming.' WHERE `key` = 'referral.max_rewards_per_month';
UPDATE game_variables SET description = 'Cap on second-degree referral rewards per month.' WHERE `key` = 'referral.max_second_degree_per_month';
UPDATE game_variables SET description = 'Upvotes a proposal needs before it graduates from the community forum to Hypha governance.' WHERE `key` = 'proposals.signal_threshold';
UPDATE game_variables SET description = 'How much a Visitor''s stance counts in a governance decision. Visitors are still finding their footing, so their vote carries the base weight.' WHERE `key` = 'governance.vote_weight.visitor';
UPDATE game_variables SET description = 'How much a Citizen''s stance counts. Citizens have rooted in and carry a slightly stronger voice.' WHERE `key` = 'governance.vote_weight.citizen';
UPDATE game_variables SET description = 'How much a Contributor''s stance counts. Contributors are actively running quests and holding work.' WHERE `key` = 'governance.vote_weight.contributor';
UPDATE game_variables SET description = 'How much a Steward''s stance counts. Stewards are the elders of the community and hold the most governance weight.' WHERE `key` = 'governance.vote_weight.steward';
UPDATE game_variables SET description = 'Hours a forum thread must exist before anyone can promote it to a formal decision. Gives ideas time to breathe.' WHERE `key` = 'governance.promotion.min_thread_age_hours';
UPDATE game_variables SET description = 'Distinct citizens who must have replied in a thread before it can be promoted. Prevents one person railroading a decision.' WHERE `key` = 'governance.promotion.min_unique_voices';
UPDATE game_variables SET description = 'Hours for a second citizen to co-sign a promotion. Dual-key promotion so decisions do not start alone.' WHERE `key` = 'governance.promotion.cosigner_window_hours';
UPDATE game_variables SET description = 'Composite heat score at which the green Ready-to-promote button lights up on a forum thread.' WHERE `key` = 'governance.promotion.heat_score_threshold';
UPDATE game_variables SET description = 'Default days a new decision stays open for voting before it auto-closes.' WHERE `key` = 'governance.default_decision_window_days';
UPDATE game_variables SET description = 'Hours after a decision opens during which people can read and discuss but not yet vote. A pause so the loudest voice does not set the tone.' WHERE `key` = 'governance.reflection_window_hours';
UPDATE game_variables SET description = 'How many hours before close a decision gets marked closing soon so people can catch up before the window shuts.' WHERE `key` = 'governance.closing_soon_window_hours';
UPDATE game_variables SET description = 'Hours for a snapshot-mode urgent decision. Requires a Steward sign-off and is reserved for true emergencies.' WHERE `key` = 'governance.snapshot_window_hours';
UPDATE game_variables SET description = 'Default days before a decision sunsets if nobody renews it. Keeps the rulebook fresh and reversible.' WHERE `key` = 'governance.default_sunset_days';
UPDATE game_variables SET description = 'Days before a sunset date that a renewal thread auto-creates in the forum so the decision can be re-examined.' WHERE `key` = 'governance.sunset_renewal_warning_days';
UPDATE game_variables SET description = 'Minimum voting window in hours for one-way-door decisions. Hard to reverse moves get extra time.' WHERE `key` = 'governance.one_way_door_min_window_hours';
UPDATE game_variables SET description = 'Internal token value above which a decision auto-assigns a storyteller to write its narrative for the weekly roundup.' WHERE `key` = 'governance.storyteller_threshold_tokens';
UPDATE game_variables SET description = 'Minimum word count for a storyteller narrative to publish.' WHERE `key` = 'governance.storyteller_narrative_min_words';
UPDATE game_variables SET description = 'Maximum word count for a storyteller narrative. Keeps stories tight.' WHERE `key` = 'governance.storyteller_narrative_max_words';
UPDATE game_variables SET description = 'Hours after a main decision opens before the pre-mortem sub-poll auto-creates. Pre-mortems ask: if this fails, why?' WHERE `key` = 'governance.premortem.auto_create_delay_hours';
UPDATE game_variables SET description = 'Number of top-agreed concerns the proposer must respond to before a decision closes.' WHERE `key` = 'governance.premortem.top_concerns_to_address';
UPDATE game_variables SET description = 'Internal token balance a player must reach before they can claim to Hypha on Base. Batches small wins into meaningful on-chain moves.' WHERE `key` = 'governance.claim_threshold_tokens';
UPDATE game_variables SET description = 'Maximum internal ledger entries bundled into a single Hypha claim proposal. Keeps proposals readable.' WHERE `key` = 'governance.claim_bundle_max_items';
UPDATE game_variables SET description = 'Days a player must wait between successful Hypha claims. Smooths on-chain traffic.' WHERE `key` = 'governance.claim_cooldown_days';
UPDATE game_variables SET description = 'Maximum transitive hops for proxy delegation. If A delegates to B and B to C, the vote stops flowing after this many hops.' WHERE `key` = 'governance.delegation_max_hops';
UPDATE game_variables SET description = 'Whether proxy delegation is turned on right now. Starts off so the community gets used to direct voting first.' WHERE `key` = 'governance.delegation_is_active';
UPDATE game_variables SET description = 'Maximum proactive ReGen Guide posts per tenant per week. Rate limit so the Guide stays in service of the community.' WHERE `key` = 'governance.guide.proactive_posts_per_week';
UPDATE game_variables SET description = 'Percentage of unanimous agreement at which the ReGen Guide chimes in with a devil-advocate perspective so group-think does not close a decision.' WHERE `key` = 'governance.guide.devil_advocate_unanimity_pct';
UPDATE game_variables SET description = 'Whether the ReGen Guide can post and comment in governance contexts at all.' WHERE `key` = 'governance.guide.is_active';
UPDATE game_variables SET description = 'Rolling 30-day decision count above which the community load bar turns yellow. Signals the community is getting busy.' WHERE `key` = 'governance.load.warning_threshold';
UPDATE game_variables SET description = 'Rolling 30-day decision count above which the load bar turns red and suggests a pause. Prevents governance burnout.' WHERE `key` = 'governance.load.critical_threshold';
UPDATE game_variables SET description = 'Days between Steward reviews of the Back Field backlog. The Back Field is an agricultural metaphor for fallow ideas resting until they are ready.' WHERE `key` = 'governance.backfield.review_cadence_days';
UPDATE game_variables SET description = 'Base $ReGen for a trivial bounty, a quick favor. The valuation starts here and is raised or lowered by impact and demand.' WHERE `key` = 'bounty.tier.trivial.base';
UPDATE game_variables SET description = 'Base $ReGen for a small bounty, one clear deliverable.' WHERE `key` = 'bounty.tier.small.base';
UPDATE game_variables SET description = 'Base $ReGen for a medium bounty, a real piece of work.' WHERE `key` = 'bounty.tier.medium.base';
UPDATE game_variables SET description = 'Base $ReGen for a large bounty, a substantial build.' WHERE `key` = 'bounty.tier.large.base';
UPDATE game_variables SET description = 'Multiplier for internal polish or nice-to-have work. Below 1, so it lowers the reward.' WHERE `key` = 'bounty.impact.low';
UPDATE game_variables SET description = 'Multiplier for work that moves the movement forward. Most work lands here.' WHERE `key` = 'bounty.impact.normal';
UPDATE game_variables SET description = 'Multiplier when work directly serves a land project, unblocks a season, or heals a real relationship or system.' WHERE `key` = 'bounty.impact.high';
UPDATE game_variables SET description = 'The nudge a specific hard-to-fill bounty gets to attract someone. Applies only when the bounty is flagged hard to fill.' WHERE `key` = 'bounty.priority.boost';
UPDATE game_variables SET description = 'How strongly a reward is pulled toward what similar work has actually paid. Zero ignores precedent, one matches it.' WHERE `key` = 'bounty.anchor.weight';
UPDATE game_variables SET description = 'How far back the engine looks when it learns precedent and demand.' WHERE `key` = 'bounty.learning.window_days';
UPDATE game_variables SET description = 'How long a bounty sits open before it counts as an unclaimed signal that the reward may be too low.' WHERE `key` = 'bounty.learning.unclaimed_days';
UPDATE game_variables SET description = 'How boldly the reward rises when a kind of bounty keeps going unclaimed. This is the bolder nudge, because work going undone is the worst outcome.' WHERE `key` = 'bounty.learning.raise_sensitivity';
UPDATE game_variables SET description = 'How gently the reward falls when bounties are claimed instantly. Kept small, because a fast claim often just means good work.' WHERE `key` = 'bounty.learning.lower_sensitivity';
UPDATE game_variables SET description = 'The lowest the learned demand factor can go.' WHERE `key` = 'bounty.learning.factor_min';
UPDATE game_variables SET description = 'The highest the learned demand factor can go.' WHERE `key` = 'bounty.learning.factor_max';
UPDATE game_variables SET description = 'A safety ceiling in $ReGen on any single bounty, whatever the factors work out to.' WHERE `key` = 'bounty.max';
UPDATE game_variables SET description = 'Rewards round to clean multiples of this many $ReGen.' WHERE `key` = 'bounty.round_to';
UPDATE game_variables SET description = 'Fraction of the delivery amount paid to the proposer when the work is delivered.' WHERE `key` = 'bounty.proposal_fraction';
UPDATE game_variables SET description = 'An optional cap on total $ReGen issued through bounties per season. Zero means no cap.' WHERE `key` = 'bounty.season_budget';
UPDATE game_variables SET description = 'Hours before bounty tokens become claimable to Base, one moon cycle by default.' WHERE `key` = 'bounty.settlement_hold_hours';
UPDATE game_variables SET description = 'Minimum citizenship tier to take on large bounties.' WHERE `key` = 'bounty.large_tier_min';
UPDATE game_variables SET description = 'Legacy flat delivery amount for a trivial bounty. Superseded by the valuation engine, kept for older code paths.' WHERE `key` = 'bounty.tier.trivial.delivery';
UPDATE game_variables SET description = 'Legacy flat delivery amount for a small bounty. Superseded by the valuation engine.' WHERE `key` = 'bounty.tier.small.delivery';
UPDATE game_variables SET description = 'Legacy flat delivery amount for a medium bounty. Superseded by the valuation engine.' WHERE `key` = 'bounty.tier.medium.delivery';
UPDATE game_variables SET description = 'Legacy flat delivery amount for a large bounty. Superseded by the valuation engine.' WHERE `key` = 'bounty.tier.large.delivery';

-- Units, rule-based
UPDATE game_variables SET unit = '%' WHERE valueType = 'percentage' AND unit IS NULL;
UPDATE game_variables SET unit = 'x' WHERE valueType = 'multiplier' AND unit IS NULL;
UPDATE game_variables SET unit = 'days' WHERE (`key` LIKE '%_days' OR `key` LIKE '%.days%' OR `key` LIKE '%window_days') AND unit IS NULL;
UPDATE game_variables SET unit = 'hours' WHERE `key` LIKE '%hours%' AND unit IS NULL;
UPDATE game_variables SET unit = '$ReGen' WHERE (`key` LIKE 'referral.reward.%' OR `key` LIKE 'bounty.tier.%' OR `key` IN ('harvest.pool_size', 'bounty.max', 'bounty.round_to', 'bounty.season_budget', 'governance.claim_threshold_tokens', 'governance.claim_threshold_regen', 'gratitude.pool_per_cycle', 'gratitude.claim_threshold')) AND unit IS NULL;

-- Bounds where missing: booleans and percentages 0..1, multipliers 0..10,
-- everything else 0..max(value*10, 10). These double as governance auto-apply
-- hard bounds. Going beyond them means proposing a bounds change first.
UPDATE game_variables SET `minValue` = 0, `maxValue` = 1 WHERE valueType IN ('boolean', 'percentage') AND `minValue` IS NULL AND `maxValue` IS NULL;
UPDATE game_variables SET `minValue` = 0, `maxValue` = 10 WHERE valueType = 'multiplier' AND `minValue` IS NULL AND `maxValue` IS NULL;
UPDATE game_variables SET `minValue` = 0, `maxValue` = GREATEST(value * 10, 10) WHERE `minValue` IS NULL AND `maxValue` IS NULL;

-- Phantom simulator keys, seeded for real (page referenced them, DB never had them)
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit) VALUES
('gratitude', 'distribution', 'gratitude.pool_per_cycle', 'Gratitude pool per cycle', 'Total $ReGen released each lunar cycle and split among everyone who received gratitude, weighted by the sender''s effective budget', 10000, 'integer', 10000, 1000, 100000, '$ReGen'),
('gratitude', 'distribution', 'gratitude.claim_threshold', 'Gratitude claim threshold', 'Accumulated $ReGen from gratitude distributions needed before claiming on Hypha. The live claim gate is governance.claim_threshold_regen and this key backs the simulator slider', 1000, 'integer', 1000, 100, 10000, '$ReGen')
ON DUPLICATE KEY UPDATE `key` = `key`;
