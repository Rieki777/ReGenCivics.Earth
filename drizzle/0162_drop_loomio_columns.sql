-- Remove the dormant Loomio integration columns. Loomio was never brought
-- live (the API key stayed a placeholder), so these columns hold no real
-- data. Governance deliberation now happens in the ReGen Gov app, and the
-- Loomio webhook receiver, API sender, and subgroup sync have all been
-- removed from the codebase. See ADR-23.
ALTER TABLE forumPromotionRequests DROP COLUMN loomioSentAt;

ALTER TABLE forumPostDecisions DROP COLUMN loomioGroupKey;
ALTER TABLE forumPostDecisions DROP COLUMN loomioDiscussionId;
ALTER TABLE forumPostDecisions DROP COLUMN loomioPollKey;
ALTER TABLE forumPostDecisions DROP COLUMN loomioDecisionUrl;

ALTER TABLE governanceTenants DROP COLUMN loomioGroupKey;

ALTER TABLE governanceAgreements DROP COLUMN loomioDecisionId;
ALTER TABLE governanceAgreements DROP COLUMN loomioPollKey;
