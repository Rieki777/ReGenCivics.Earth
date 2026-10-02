-- A crowdpool delivery's score points count once (bundle 1, item 5).
--
-- Why: deliveryPayoff (server/routes/campaigns.ts) scores a delivery for an
-- account holder before it checks for a player profile, and
-- linkAnonymousContributions, which runs on every sign-in, scored again for
-- any delivered row with no playerContributionId. So an account holder who
-- had no profile at delivery got two crowdpool_contribution score rows for
-- one contribution. contribution_score_events had no unique key, so nothing
-- stopped it. Both call sites now use recordCrowdpoolScoreOnce
-- (server/game/index.ts), which inserts only when no row exists.
--
-- What this does:
--   1. Deletes the duplicate crowdpool score rows, keeping the earliest row
--      for each contribution.
--   2. Adds crowdpoolScoreRef, a STORED generated column that holds the
--      contribution id for a crowdpool score row and NULL for every other
--      row, with a UNIQUE key on it. NULLs never collide, so endorsements and
--      every other action are untouched.
--
-- DATA CLEANUP plus an ADDITIVE column and key. Safe to apply before the
-- deploy: while old code runs, a second crowdpool score insert for the same
-- contribution fails on the new key, and both call sites already catch that
-- and log it as non-fatal. Points per delivery are unchanged. The next
-- nightly run recomputes contributionScoreRaw from these rows, so people
-- who were counted twice drop back to one score row per delivery (their
-- tier can move with it). MariaDB and MySQL 8+ compatible (verified on
-- MariaDB 12.3 with a temporary copy of the table). Safe to re-run after a
-- failure: the DELETE finds nothing new, and the ALTER is one statement.
--
-- If crowdpool roles ever score week by week (audit P7, undecided), that
-- needs its own action name or this key dropped: the key allows one
-- crowdpool_contribution row per contribution.

DELETE e FROM `contribution_score_events` e
  JOIN `contribution_score_events` k
    ON k.action = e.action AND k.referenceType = e.referenceType
   AND k.referenceId = e.referenceId AND k.id < e.id
 WHERE e.action = 'crowdpool_contribution' AND e.referenceType = 'crowdpool'
   AND e.referenceId IS NOT NULL;

ALTER TABLE `contribution_score_events`
  ADD COLUMN `crowdpoolScoreRef` INT GENERATED ALWAYS AS (IF(`action` = 'crowdpool_contribution' AND `referenceType` = 'crowdpool', `referenceId`, NULL)) STORED,
  ADD UNIQUE KEY `contribution_score_events_crowdpool_once` (`crowdpoolScoreRef`);
