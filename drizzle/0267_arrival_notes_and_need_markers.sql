-- The arrival note and the "Needed to start" marker.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it: two new
-- tables, nothing existing changes. Old code never reads them.
--
-- Why their own tables (finding F6): campaigns.getItems and the items inside
-- campaigns.getById select every campaign_items column, so any column added
-- there goes public on the next deploy and enters the crowdpool hub contract.
-- Neither of these may ever be public.
--
-- campaign_arrival_notes: what someone needs once their offer is accepted
-- (where to go, what to bring, who to ask for, meals, beds, parking or
-- transit). One campaign-wide note (campaignItemId 0) and at most one per
-- need; a need's note fills any field it leaves blank from the campaign note
-- (resolveArrivalNote in shared/offerStatus.ts). Read only by the project's
-- stewards, by the person whose offer stands, and through that offer's
-- status link. campaignItemId is 0, never NULL, for the campaign-wide note,
-- so the unique key holds (a NULL would allow duplicates).
--
-- campaign_need_markers: a row means a project steward marked the need as one
-- the project can't begin without. Unmarking deletes it. Steward-only; it
-- changes nothing about completion, which stays at 100% of the in-kind ask
-- (ruling 2026-09-27, question 11).
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-27, section 3.5.

CREATE TABLE IF NOT EXISTS `campaign_arrival_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaignId` INT NOT NULL,
  `campaignItemId` INT NOT NULL DEFAULT 0,
  `whereToGo` VARCHAR(500) NULL DEFAULT NULL,
  `whatToBring` VARCHAR(500) NULL DEFAULT NULL,
  `askFor` VARCHAR(120) NULL DEFAULT NULL,
  `meals` VARCHAR(300) NULL DEFAULT NULL,
  `beds` VARCHAR(300) NULL DEFAULT NULL,
  `gettingThere` VARCHAR(500) NULL DEFAULT NULL,
  `updatedBy` INT NOT NULL,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `campaign_arrival_notes_uq` (`campaignId`, `campaignItemId`)
);

CREATE TABLE IF NOT EXISTS `campaign_need_markers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaignId` INT NOT NULL,
  `campaignItemId` INT NOT NULL,
  `markedBy` INT NOT NULL,
  `markedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `campaign_need_markers_item_uq` (`campaignItemId`),
  KEY `campaign_need_markers_campaign_idx` (`campaignId`)
);
