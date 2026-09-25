-- Indexes for campaign_contributions, which until now had only its primary
-- key. Additive; leads the deploy.
--
-- Why: the hours-accept transaction sums the standing hours on one need with
-- SELECT ... FOR UPDATE. With no index that read scanned the whole table
-- under REPEATABLE READ and locked every row, so each accept, hours change
-- or need resize blocked every contribution write on the site while it ran.
-- The cancel service's UPDATE ... WHERE campaignId = ? did the same. With
-- these, both lock only the rows of that need or that campaign.
CREATE INDEX `campaign_contributions_item_status_idx` ON `campaign_contributions` (`campaignItemId`, `status`);
CREATE INDEX `campaign_contributions_campaign_status_idx` ON `campaign_contributions` (`campaignId`, `status`);
