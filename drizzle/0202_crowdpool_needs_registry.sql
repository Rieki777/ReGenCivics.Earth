-- 0202: Crowdpooling needs registry, upgrade on campaign_items.
-- Spec: CROWDPOOLING_PLATFORM_SPEC.md Part B Migration A (locked decisions 7-9).
-- Every need gets a kind (item / role / shift / loan / knowledge / crypto /
-- financial_link), a capitalType from the 9-capital taxonomy, quantity
-- tracking (wanted / claimed / delivered), and optional time windows for
-- shifts and loans. 'crypto' is trackable money on-platform (decision 7) --
-- fiat renders only as financial_link partner CTAs and is never collected.
-- The legacy category column stays for back-compat reads, new UI keys off
-- kind + capitalType. Idempotency comes from _migrations_applied tracking,
-- not ADD COLUMN IF NOT EXISTS (MariaDB-only, rejected by this MySQL).

ALTER TABLE `campaign_items`
  ADD COLUMN `kind` enum('item','role','shift','loan','knowledge','crypto','financial_link') NOT NULL DEFAULT 'item',
  ADD COLUMN `capitalType` enum('intellectual','social','material','financial','living','cultural','spiritual','experiential','health') NULL DEFAULT NULL,
  ADD COLUMN `quantityWanted` int NOT NULL DEFAULT 1,
  ADD COLUMN `quantityClaimed` int NOT NULL DEFAULT 0,
  ADD COLUMN `quantityDelivered` int NOT NULL DEFAULT 0,
  ADD COLUMN `needDeadline` timestamp NULL DEFAULT NULL,
  ADD COLUMN `shiftStartsAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `shiftEndsAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `loanWindowStart` timestamp NULL DEFAULT NULL,
  ADD COLUMN `loanWindowEnd` timestamp NULL DEFAULT NULL,
  ADD COLUMN `groupClaimable` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `priorityPinned` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `imageUrl` varchar(512) NULL DEFAULT NULL;

-- Backfill kind + capitalType from the legacy category enum.
-- Roles keep capitalType NULL (the right capital depends on the role itself
-- and gets set per-need by stewards or the wizard, not guessed here).
UPDATE `campaign_items` SET `kind` = 'item', `capitalType` = 'living' WHERE `category` = 'land';
UPDATE `campaign_items` SET `kind` = 'item', `capitalType` = 'material' WHERE `category` = 'equipment';
UPDATE `campaign_items` SET `kind` = 'role', `capitalType` = NULL WHERE `category` = 'role';
UPDATE `campaign_items` SET `kind` = 'item', `capitalType` = 'material' WHERE `category` = 'resource';

-- Backfill quantityWanted from the legacy per-category quantity columns so
-- existing needs show honest slot counts instead of the default 1.
UPDATE `campaign_items` SET `quantityWanted` = `equipmentQuantity` WHERE `category` = 'equipment' AND `equipmentQuantity` IS NOT NULL AND `equipmentQuantity` > 0;
UPDATE `campaign_items` SET `quantityWanted` = `resourceQuantity` WHERE `category` = 'resource' AND `resourceQuantity` IS NOT NULL AND `resourceQuantity` > 0;
