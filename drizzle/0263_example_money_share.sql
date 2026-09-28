-- Example campaigns ask for money at about 20% of the whole ask.
--
-- Rye's ruling of 2026-09-27 ("Yes do this"): fix the four example campaigns
-- now rather than at the re-seed after 0251. Their money asks read 81 to 86
-- percent of the whole (a legacy crypto need plus a large financialTarget),
-- while real campaigns are guided toward 10 to 30 percent. Their example
-- route figures scale with the new money ask so no example reads as landed.
--
-- EXAMPLE DATA ONLY, and safe to apply before the deploy. Every statement is
-- limited to campaigns with isDemo = 1 (and their needs and routes). No column
-- changes type, no real campaign is touched, and old code reads the same
-- columns it always did.
--
-- Why each step runs, in this order (step 3 reads step 2's financialTarget):
--   1. Legacy crypto needs on examples drop to value 0. They render nowhere
--      (NeedsRegistry and listOpenNeeds skip money kinds), new needs cannot
--      use them, and the progress helper adds their value to the money ask.
--   2. financialTarget becomes the in-kind ask divided by four, rounded to the
--      nearest 1,000, never below 1,000 when there is an in-kind ask. Money is
--      then about a fifth of the whole ask.
--   3. Each example route's cachedRaised becomes its share of 40% of the new
--      money ask, split in the ratio the routes had, each rounded to 500. Real
--      looking progress that never lands. cachedPercent and
--      cachedContributorCount are left alone (no client reads cachedPercent).
--      The aggregate derived table is materialized (GROUP BY), the documented
--      way to read the table a multi-table UPDATE writes.
--   4. Nine months at most (ruling 2026-09-04): an example over 273 days runs
--      270, so no example close date breaks the cap.
--
-- Idempotent: a second run writes the same figures. shared/exampleCampaignFigures.ts
-- holds the same rule in TypeScript for the seed script and the tests
-- (server/example-figures.test.ts runs these statements twice on fixtures).
-- Tables with updatedAt ON UPDATE keep their updatedAt (only figures change).
-- campaign_partner_links has no updatedAt.
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-27, section 3.1.

-- 1. Legacy crypto needs on examples leave the money ask.
UPDATE `campaign_items` ci
  JOIN `campaigns` c ON c.id = ci.campaignId
  SET ci.estimatedValue = 0, ci.updatedAt = ci.updatedAt
  WHERE c.isDemo = 1 AND ci.kind = 'crypto' AND ci.estimatedValue <> 0;

-- 2. The money ask: a round thousand near a quarter of the in-kind ask.
UPDATE `campaigns` c
  JOIN (SELECT ci.campaignId, SUM(ci.estimatedValue) AS inKind
          FROM `campaign_items` ci
         WHERE ci.kind NOT IN ('crypto', 'financial_link')
         GROUP BY ci.campaignId) k ON k.campaignId = c.id
  SET c.financialTarget = GREATEST(ROUND(k.inKind / 4, -3), 1000), c.updatedAt = c.updatedAt
  WHERE c.isDemo = 1 AND k.inKind > 0;

-- 3. Example routes: together about 40% of the new money ask, each rounded to 500.
UPDATE `campaign_partner_links` pl
  JOIN `campaigns` c ON c.id = pl.campaignId
  JOIN (SELECT campaignId, SUM(cachedRaised) AS total
          FROM `campaign_partner_links`
         WHERE status = 'example' AND cachedRaised IS NOT NULL
         GROUP BY campaignId) t ON t.campaignId = pl.campaignId
  SET pl.cachedRaised = ROUND(c.financialTarget * 2 * pl.cachedRaised / (5 * t.total * 500)) * 500
  WHERE c.isDemo = 1 AND pl.status = 'example' AND pl.cachedRaised IS NOT NULL AND t.total > 0;

-- 4. Nine months at most: an example over 273 days runs 270.
UPDATE `campaigns` SET durationDays = 270, updatedAt = updatedAt
  WHERE isDemo = 1 AND durationDays > 273;
