-- Crowdpool Hypha on-chain confirmation.
-- When a formalized contribution's Hypha proposal passes on chain, the webhook
-- cascade (cascadeCrowdpoolPassed) stamps this so the campaign reflects the
-- confirmation without a join to hyphaBridges. NULL until confirmed.
ALTER TABLE `campaign_contributions`
  ADD COLUMN `hyphaConfirmedAt` timestamp NULL DEFAULT NULL;
