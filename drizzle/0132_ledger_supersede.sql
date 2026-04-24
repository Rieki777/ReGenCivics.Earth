-- 0132_ledger_supersede.sql
--
-- 2026-04-24 — Supersede governanceTokenLedger with user_token_ledger.
--
-- Context: the old governanceTokenLedger was a single-currency, per-tenant
-- queue of tokens waiting to be claimed on Hypha. The new user_token_ledger
-- (added in 0131) is per-token-type (rgvoice / regen / rcvoice / rcivics)
-- and lives alongside public balance columns on player_profiles, giving
-- a clean total = public + private model.
--
-- This migration:
--   1) Extends user_token_ledger with the columns the old ledger carried
--      (tenantId, claimedAt, hyphaBridgeId, sourceRef) so it is a
--      complete replacement and the Hypha bridge prefill can read from it.
--   2) Copies every unclaimed row from governanceTokenLedger into
--      user_token_ledger, tagged with tokenType='regen' since every
--      current writer (gratitude, harvest, quest) earns the economic
--      game token. Marks the old rows claimedAt=NOW() with a reason so
--      they never get claimed twice.
--   3) Bumps each affected user's player_profiles.regenPrivate by the
--      total migrated amount so the profile token box total reflects
--      the carry-over immediately.
--   4) Seeds per-token claim thresholds into game_variables:
--        claim_threshold_regen   = 1000
--        claim_threshold_rgvoice = 20
--        claim_threshold_rcivics = 1000
--        claim_threshold_rcvoice = 20
--      Per Rye's sizing: $ReGen / $RCivics claim in larger chunks (gas
--      makes tiny claims silly), RGVoice / RCVoice are voice-weight
--      signals so smaller batches are fine.

-- ── 1) Extend user_token_ledger ─────────────────────────────────────────────
ALTER TABLE user_token_ledger
  ADD COLUMN tenantId INT DEFAULT NULL,
  ADD COLUMN claimedAt TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN hyphaBridgeId INT DEFAULT NULL,
  ADD COLUMN sourceRef VARCHAR(120) DEFAULT NULL,
  ADD INDEX user_token_ledger_tenantId_idx (tenantId),
  ADD INDEX user_token_ledger_claimedAt_idx (claimedAt);

-- ── 2) Copy unclaimed rows across ──────────────────────────────────────────
-- Every writer today targets the economic game token, so map to 'regen'.
INSERT INTO user_token_ledger (
  userId, tokenType, amount, source, sourceId, sourceRef, description,
  tenantId, claimedAt, hyphaBridgeId, createdAt
)
SELECT
  userId,
  'regen' AS tokenType,
  CAST(amount AS SIGNED) AS amount,
  CONCAT('migrated_from_', type) AS source,
  id AS sourceId,
  sourceRef,
  description,
  tenantId,
  NULL AS claimedAt,   -- still unclaimed in the new ledger
  hyphaBridgeId,
  createdAt
FROM governanceTokenLedger
WHERE claimedAt IS NULL
  AND amount IS NOT NULL;

-- ── 3) Bump regenPrivate column by each user's total migrated amount ───────
-- Using a derived table so the UPDATE is deterministic.
UPDATE player_profiles pp
JOIN (
  SELECT userId, SUM(CAST(amount AS SIGNED)) AS total
  FROM governanceTokenLedger
  WHERE claimedAt IS NULL AND amount IS NOT NULL
  GROUP BY userId
) agg ON agg.userId = pp.userId
SET pp.regenPrivate = pp.regenPrivate + agg.total;

-- ── 4) Mark the old rows as consumed so they never double-claim ────────────
UPDATE governanceTokenLedger
SET
  claimedAt = CURRENT_TIMESTAMP,
  description = CONCAT(
    COALESCE(description, ''),
    ' [migrated 2026-04-24 to user_token_ledger]'
  )
WHERE claimedAt IS NULL;

-- ── 5) Seed per-token claim thresholds ─────────────────────────────────────
-- ON DUPLICATE KEY so we do not clobber an existing tuned value. game_variables
-- has category / subcategory / displayName / valueType columns too; fill them
-- so the admin UI renders these cleanly.
INSERT INTO game_variables
  (category,    subcategory,        `key`,                                  displayName,                 description,                                                                 value,  valueType,  defaultValue, isActive)
VALUES
  ('governance', 'claim_thresholds', 'governance.claim_threshold_regen',    '$ReGen claim threshold',    'Minimum regenPrivate before $ReGen can be claimed on Hypha',                '1000', 'integer',  '1000',       1),
  ('governance', 'claim_thresholds', 'governance.claim_threshold_rgvoice',  'RGVoice claim threshold',   'Minimum rgvoicePrivate before RGVoice can be claimed on Hypha',             '20',   'integer',  '20',         1),
  ('governance', 'claim_thresholds', 'governance.claim_threshold_rcivics',  '$RCivics claim threshold',  'Minimum rcivicsPrivate before $RCivics can be claimed on Hypha',            '1000', 'integer',  '1000',       1),
  ('governance', 'claim_thresholds', 'governance.claim_threshold_rcvoice',  'RCVoice claim threshold',   'Minimum rcvoicePrivate before RCVoice can be claimed on Hypha',             '20',   'integer',  '20',         1)
ON DUPLICATE KEY UPDATE value = VALUES(value), description = VALUES(description);
