-- Ready to crowdpool ticks, stored on the campaign.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it: one new
-- table, nothing existing changes. Old code never reads it.
--
-- Until now a steward's ticks lived only in their browser (localStorage in
-- CrowdpoolReadiness.tsx), so the review team never saw what the project
-- ticked. A row here means a project steward ticked that item for that
-- campaign; an untick deletes the row. itemKey is the permanent key from
-- shared/crowdpoolReadiness.ts (ReadinessItem.key). Keys are never renamed:
-- a replaced item gets a new key and the old one goes on
-- RETIRED_READINESS_KEYS, so a stored tick never points at nothing.
-- Written only through campaigns.setReadinessTick (project stewards, through
-- server/lib/project-steward.ts); read by campaigns.getReadiness.
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-25, section 3.2.

CREATE TABLE IF NOT EXISTS `campaign_readiness_ticks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaignId` INT NOT NULL,
  `itemKey` VARCHAR(40) NOT NULL,
  `tickedBy` INT NOT NULL,
  `tickedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `campaign_readiness_ticks_uq` (`campaignId`, `itemKey`)
);
