-- Give or lend, need windows, and money routes that an admin verifies.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it. Every
-- statement adds a column with a default, fills a NEW column, or inserts
-- game variables. No existing column changes type or meaning, and old code
-- never sees the new columns: drizzle selects name the old columns, and the
-- old getPartnerLinks is a select() of the old schema.
--
-- Why each backfill runs:
--   * Legacy kind 'loan' needs take loans only, so they get acceptsGift 0,
--     acceptsLoan 1, and their custody window (loanWindowStart/End) copied
--     into the new need window (neededFrom/Until).
--   * Contributions on those needs are lends, so they get offerMode 'lend'
--     and the need's window as their dates.
--   Both tables carry updatedAt ON UPDATE CURRENT_TIMESTAMP, so both
--   UPDATEs set `updatedAt = updatedAt` to keep it: only new columns change.
--   The windows are TIMESTAMPs, and DATE() reads a TIMESTAMP in the session
--   time zone, so on a session west of UTC a window starting early on the
--   9th became the 8th. Each date is taken in UTC (CONVERT_TZ from the
--   session zone to +00:00), the day the rest of the app shows. COALESCE
--   keeps the plain DATE() if the session zone is a named zone and the
--   server has no time zone tables (CONVERT_TZ then returns NULL).
--   * Every existing campaign_partner_links row belongs to an example
--     campaign (only seed scripts ever wrote them), so on example campaigns
--     they become status 'example' (shown, never linked out) with the
--     campaign's currency. Rows on real campaigns stay 'pending' (hidden
--     until an admin verifies them). Only new columns change.
--
-- The game variables are guidance (the money share band, never enforced;
-- ruling 2026-09-24) and one rail, crowdpool.rails.loan_routes, OFF until
-- counsel rules on showing a Steward loan route to every visitor.
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-25, section 3.1.

-- What a need asks for and when, and how a thing may come (give or lend).
ALTER TABLE `campaign_items`
  ADD COLUMN `neededFrom` DATE NULL DEFAULT NULL,
  ADD COLUMN `neededUntil` DATE NULL DEFAULT NULL,
  ADD COLUMN `acceptsGift` TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN `acceptsLoan` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `workMode` ENUM('on_site','remote','either') NULL DEFAULT NULL;

-- Legacy kind 'loan' needs take loans only; their custody window becomes the need window.
UPDATE `campaign_items`
  SET `acceptsGift` = 0, `acceptsLoan` = 1,
      `neededFrom` = COALESCE(DATE(CONVERT_TZ(`loanWindowStart`, @@session.time_zone, '+00:00')), DATE(`loanWindowStart`)),
      `neededUntil` = COALESCE(DATE(CONVERT_TZ(`loanWindowEnd`, @@session.time_zone, '+00:00')), DATE(`loanWindowEnd`)),
      `updatedAt` = `updatedAt`
  WHERE `kind` = 'loan' AND `acceptsLoan` = 0;

ALTER TABLE `campaign_contributions`
  ADD COLUMN `offerMode` ENUM('give','lend') NULL DEFAULT NULL,
  ADD COLUMN `availableFrom` DATE NULL DEFAULT NULL,
  ADD COLUMN `lendUntil` DATE NULL DEFAULT NULL,
  ADD COLUMN `lendTerms` VARCHAR(300) NULL DEFAULT NULL,
  ADD COLUMN `returnedAt` TIMESTAMP NULL DEFAULT NULL;

-- Contributions on legacy loan needs are lends.
UPDATE `campaign_contributions` cc
  JOIN `campaign_items` ci ON ci.id = cc.campaignItemId
  SET cc.offerMode = 'lend',
      cc.availableFrom = COALESCE(DATE(CONVERT_TZ(ci.loanWindowStart, @@session.time_zone, '+00:00')), DATE(ci.loanWindowStart)),
      cc.lendUntil = COALESCE(DATE(CONVERT_TZ(ci.loanWindowEnd, @@session.time_zone, '+00:00')), DATE(ci.loanWindowEnd)),
      cc.updatedAt = cc.updatedAt
  WHERE ci.kind = 'loan' AND cc.offerMode IS NULL;

-- Money routes: added by a project steward, verified by a ReGen Civics admin.
ALTER TABLE `campaign_partner_links`
  ADD COLUMN `status` ENUM('pending','verified','rejected','example') NOT NULL DEFAULT 'pending',
  ADD COLUMN `proofUrl` VARCHAR(512) NULL DEFAULT NULL,
  ADD COLUMN `reviewNote` VARCHAR(1000) NULL DEFAULT NULL,
  ADD COLUMN `addedBy` INT NULL DEFAULT NULL,
  ADD COLUMN `verifiedBy` INT NULL DEFAULT NULL,
  ADD COLUMN `verifiedAt` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `cachedCurrency` VARCHAR(8) NULL DEFAULT NULL;

-- Every existing row belongs to an example campaign (only seed scripts wrote them).
UPDATE `campaign_partner_links` pl
  JOIN `campaigns` c ON c.id = pl.campaignId
  SET pl.status = 'example', pl.cachedCurrency = COALESCE(pl.cachedCurrency, c.currency)
  WHERE c.isDemo = 1 AND pl.status = 'pending';

-- Soft money-share guidance (never enforced) and the loan-route rail.
INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive)
VALUES
  ('crowdpool', 'economics', 'crowdpool.cash_share_min_pct', 'Money share, low end of the usual range (%)',
   'Guidance only. Campaigns usually ask for 10 to 30 percent of the whole ask in money. Nothing blocks a number outside the range, and 0 is allowed.',
   10, 'integer', 10, 1),
  ('crowdpool', 'economics', 'crowdpool.cash_share_max_pct', 'Money share, high end of the usual range (%)',
   'Guidance only. See crowdpool.cash_share_min_pct.', 30, 'integer', 30, 1),
  ('crowdpool', 'economics', 'crowdpool.cash_share_default_pct', 'Suggested money share (%)',
   'The share the campaign wizard suggests. Guidance only.', 20, 'integer', 20, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.loan_routes', 'Loan routes can be verified',
   'Lets an admin verify a Steward loan route so it shows on campaign pages. OFF until counsel rules on showing an interest-bearing loan to every visitor, including the EEA and the UK.',
   0, 'boolean', 0, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);
