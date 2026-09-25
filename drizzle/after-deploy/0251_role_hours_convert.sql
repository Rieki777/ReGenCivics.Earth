-- Convert role needs from one slot to hours a week. DATA change, no column
-- type change.
--
-- HELD FILE. It lives in drizzle/after-deploy/ so `run-migration.ts --all`
-- (the standard pre-push step) never picks it up: the runner only scans
-- drizzle/*.sql. Old code reading converted rows breaks (it would print hours
-- as unitless slots and add 1 per acceptance to an hours counter), so this
-- runs only AFTER the deploy that carries the hours code reports SUCCESS:
--   npx tsx scripts/run-migration.ts drizzle/after-deploy/0251_role_hours_convert.sql
-- New code treats kind='role' AND capacityUnit='count' as a count need, so the
-- conversion can trail the deploy safely. The number 0251 stays reserved:
-- scripts/check-migration-numbers.mjs reads this folder too.
--
-- Scope: only needs from the Roles step (category='role', kind='role'). The
-- Other Needs step saves Organizing, Arts, Ceremony and Wellness needs as
-- category='resource', kind='role' with no hours (a mural, a rite of passage);
-- those stay count needs, the same rule db.createCampaign applies.
--
-- Idempotent: every step filters on capacityUnit='count', and step 5 flips
-- the marker last. If the runner fails between steps 1 and 5, restore the role
-- rows from the _bak_0251_* tables (reverse SQL below) before re-running.
--
-- The backups hold only the columns the reverse SQL needs (no contributor
-- names, emails or phones). Once the conversion is verified on the site,
-- drop them:  DROP TABLE _bak_0251_role_items, _bak_0251_role_contribs
--
-- REVERSE (only if rolling code back after this ran):
--   UPDATE campaign_items ci JOIN _bak_0251_role_items b ON b.id = ci.id
--     SET ci.quantityWanted = b.quantityWanted, ci.quantityClaimed = b.quantityClaimed,
--         ci.quantityDelivered = b.quantityDelivered, ci.hoursPerWeek = b.hoursPerWeek,
--         ci.capacityUnit = 'count'
--   UPDATE campaign_contributions cc JOIN _bak_0251_role_contribs b ON b.id = cc.id
--     SET cc.quantityPledged = b.quantityPledged, cc.claimExpiresAt = b.claimExpiresAt

-- 0. Backups of exactly the rows and columns this touches.
CREATE TABLE IF NOT EXISTS `_bak_0251_role_items` (
  `id` int NOT NULL PRIMARY KEY,
  `quantityWanted` int NOT NULL,
  `quantityClaimed` int NOT NULL,
  `quantityDelivered` int NOT NULL,
  `hoursPerWeek` int NULL
);
INSERT IGNORE INTO `_bak_0251_role_items` (`id`, `quantityWanted`, `quantityClaimed`, `quantityDelivered`, `hoursPerWeek`)
  SELECT `id`, `quantityWanted`, `quantityClaimed`, `quantityDelivered`, `hoursPerWeek` FROM `campaign_items`
  WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count';
CREATE TABLE IF NOT EXISTS `_bak_0251_role_contribs` (
  `id` int NOT NULL PRIMARY KEY,
  `quantityPledged` int NOT NULL,
  `claimExpiresAt` timestamp NULL DEFAULT NULL
);
INSERT IGNORE INTO `_bak_0251_role_contribs` (`id`, `quantityPledged`, `claimExpiresAt`)
  SELECT cc.id, cc.quantityPledged, cc.claimExpiresAt FROM `campaign_contributions` cc
  JOIN `campaign_items` ci ON ci.id = cc.campaignItemId
  WHERE ci.category = 'role' AND ci.kind = 'role' AND ci.capacityUnit = 'count';

-- 1. Offers and holders: quantityPledged becomes hours a week (the offer when
--    known, else hours per slot times slots), clamped to the role's total and
--    never below 1. Roles never expire.
UPDATE `campaign_contributions` cc
JOIN `campaign_items` ci ON ci.id = cc.campaignItemId
SET cc.quantityPledged = GREATEST(1, LEAST(
      COALESCE(NULLIF(cc.hoursPerWeek, 0), COALESCE(NULLIF(ci.hoursPerWeek, 0), 40) * cc.quantityPledged),
      COALESCE(NULLIF(ci.hoursPerWeek, 0), 40) * GREATEST(ci.quantityWanted, 1))),
    cc.claimExpiresAt = NULL
WHERE ci.category = 'role' AND ci.kind = 'role' AND ci.capacityUnit = 'count';

-- 2. Needs: hours a week needed = hours per slot times slots (40 stands in
--    for a role with no hours), then hoursPerWeek mirrors it. Two statements,
--    so nothing depends on left-to-right SET evaluation (MariaDB's
--    SIMULTANEOUS_ASSIGNMENT mode would change that).
UPDATE `campaign_items`
SET `quantityWanted` = GREATEST(1, COALESCE(NULLIF(`hoursPerWeek`, 0), 40) * GREATEST(`quantityWanted`, 1))
WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count';
UPDATE `campaign_items`
SET `hoursPerWeek` = `quantityWanted`
WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count';

-- 3. Counters from rows. This also clears old over-delivery drift.
UPDATE `campaign_items` ci
SET ci.quantityClaimed = (
      SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM `campaign_contributions` cc
      WHERE cc.campaignItemId = ci.id AND cc.status IN ('accepted','fulfilled','thanked')),
    ci.quantityDelivered = (
      SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM `campaign_contributions` cc
      WHERE cc.campaignItemId = ci.id AND cc.status IN ('fulfilled','thanked'))
WHERE ci.category = 'role' AND ci.kind = 'role' AND ci.capacityUnit = 'count';

-- 4. Count roles had no accept cap, so two people accepted on one 20-hour
--    slot now stand at 40 hours. Raise the hours needed to what already
--    stands, so claimed and delivered never pass wanted (contract section 5).
--    Two statements again, for the same reason as step 2.
UPDATE `campaign_items`
SET `quantityWanted` = `quantityClaimed`
WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count'
  AND `quantityClaimed` > `quantityWanted`;
UPDATE `campaign_items`
SET `hoursPerWeek` = `quantityWanted`
WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count';

-- 5. Mark converted. Last, so every step above is re-runnable.
UPDATE `campaign_items` SET `capacityUnit` = 'hours_per_week'
WHERE `category` = 'role' AND `kind` = 'role' AND `capacityUnit` = 'count';
