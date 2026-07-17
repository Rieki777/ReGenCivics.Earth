-- 0203: Crowdpooling claims upgrade on campaign_contributions.
-- Spec: CROWDPOOLING_PLATFORM_SPEC.md Part B Migration B (decisions 4, 5, 7).
-- The claim lifecycle gains 'expired' (claim window passed, quantity released
-- by the nightly sweep, terminal) and 'thanked' (steward closed the loop with
-- a note and optional photo, superset of fulfilled). contributionType gains
-- 'knowledge'. 'financial' now means crypto pledges only (decision 7) since
-- fiat routes to partner links and never touches us. Enum widening via
-- MODIFY COLUMN is additive and safe on existing rows.

ALTER TABLE `campaign_contributions`
  MODIFY COLUMN `status` enum('pending','accepted','rejected','withdrawn','fulfilled','expired','thanked') NOT NULL DEFAULT 'pending';

ALTER TABLE `campaign_contributions`
  MODIFY COLUMN `contributionType` enum('land','equipment','role','resource','financial','knowledge') NOT NULL;

ALTER TABLE `campaign_contributions`
  ADD COLUMN `quantityPledged` int NOT NULL DEFAULT 1,
  ADD COLUMN `claimExpiresAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `acknowledgedAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `acknowledgedNote` text NULL,
  ADD COLUMN `acknowledgedImageUrl` varchar(512) NULL DEFAULT NULL,
  ADD COLUMN `referredBy` varchar(16) NULL DEFAULT NULL,
  ADD COLUMN `isAnonymous` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `hyphaBridgeKey` varchar(16) NULL DEFAULT NULL,
  ADD COLUMN `playerContributionId` int NULL DEFAULT NULL;
