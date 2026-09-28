-- Example campaigns that never go stale: roll each live example near its
-- close date forward, whole, so it reads partway through its window again.
--
-- Examples never close (ruling 2026-09-27) and run from startedAt (or
-- publishedAt) plus durationDays, so their dates age. On 2026-09-28
-- production's Harmony Valley read a close date of 5 Oct 2026, and after that
-- it would have shown a past close date forever. Demos can't be re-seeded
-- while drizzle/after-deploy/0251 is held, so this moves them in place, once.
-- The daily crowdpool job applies the same rule each day from here on
-- (server/lib/example-window.ts), paused by crowdpool.examples_roll.
--
-- EXAMPLE DATA ONLY, and safe to apply before or after the deploy. Every row
-- it moves belongs to a campaign with isDemo = 1 and status 'active'. No
-- column changes type, no real campaign is touched, and old code reads the
-- same columns it always did.
--
-- The rule (shared/exampleWindow.ts exampleShiftDays holds it in TypeScript,
-- in the same integer arithmetic). With D = durationDays and left = seconds
-- from now to the close date (startedAt or publishedAt, plus D days):
--   * an example rolls when left < LEAST(30, round(3D/10)) days, so under 30
--     days left or past its close, and a short window rolls at 30% left
--   * it moves by the fewest whole days that leave round(3D/5) days, about
--     60% of its window. Whole days, so DATE and TIMESTAMP columns move by
--     exactly the same interval.
--
-- What moves, by that interval (EXAMPLE_DATED_COLUMNS in
-- server/lib/example-window.ts lists the same columns, and
-- server/example-window.test.ts checks this file against it):
--   * campaign_items: every need's window (needDeadline, the shift times, the
--     legacy loan window, neededFrom and neededUntil)
--   * campaign_contributions: the lend's dates and the claim's expiry, and
--     every stamp of what happened (submitted, reviewed, fulfilled, thanked,
--     returned, confirmed, the cancel, nudge, wait and close stamps, createdAt)
--   * campaign_updates: publishedAt and createdAt
--   * campaign_partner_links: lastFetchedAt (the route's "as of" date) and verifiedAt
--   * campaigns: startedAt and publishedAt (the window itself), and the review,
--     completion and close stamps. createdAt stays: no page shows it, and it
--     records when the row was made.
-- Planned dates move by the whole interval. Stamps of things that happened
-- move too, but never past now (LEAST with now), so nothing reads as having
-- happened in the future. Examples refuse ticks, markers, arrival notes and
-- replies, and practice offers write nothing, so no other table holds a date
-- that belongs to an example.
--
-- Tables with updatedAt ON UPDATE keep their updatedAt (updatedAt = updatedAt).
--
-- Safe to run twice, and safe after a failure part way. The session runs in
-- UTC, so TIMESTAMP arithmetic never crosses a daylight-saving change in the
-- session's zone, and the zone is restored at the end. The shift is decided
-- once per campaign into a ledger table with the time it was decided, and
-- each step moves only campaigns at that step, then advances them. A second
-- run finds no example near its close and moves nothing. A run that stopped
-- part way keeps its ledger, so running the file again finishes the
-- remaining steps with the same shift and never moves a table twice. The
-- ledger is dropped at the end. The switch for the daily job is added last,
-- so the job can't roll anything before this file has finished.
--
-- MariaDB and MySQL 8+ compatible (the target table sits in the FROM clause
-- of the ledger insert, never in a subquery). Build: example windows,
-- 2026-09-28.

SET @rc0268_tz = @@session.time_zone;

SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `_example_window_0268` (
  `campaignId` INT NOT NULL,
  `shiftDays` INT NOT NULL,
  `nowAt` DATETIME NOT NULL,
  `stepsDone` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`campaignId`)
);

-- Decide each example's shift, once. A campaign already in the ledger keeps its row.
INSERT INTO `_example_window_0268` (campaignId, shiftDays, nowAt)
SELECT c.id,
       GREATEST(0, (((6 * c.durationDays + 5) DIV 10) * 86400
         - TIMESTAMPDIFF(SECOND, n.nowAt, COALESCE(c.startedAt, c.publishedAt) + INTERVAL c.durationDays DAY)
         + 86399) DIV 86400),
       n.nowAt
  FROM `campaigns` c
  CROSS JOIN (SELECT UTC_TIMESTAMP() AS nowAt) n
 WHERE c.isDemo = 1 AND c.status = 'active'
   AND c.durationDays > 0
   AND COALESCE(c.startedAt, c.publishedAt) IS NOT NULL
   AND TIMESTAMPDIFF(SECOND, n.nowAt, COALESCE(c.startedAt, c.publishedAt) + INTERVAL c.durationDays DAY)
       < LEAST(30, (3 * c.durationDays + 5) DIV 10) * 86400
ON DUPLICATE KEY UPDATE stepsDone = stepsDone;

-- 1. Needs: every window moves by the whole interval.
UPDATE `campaign_items` ci
  JOIN `_example_window_0268` w ON w.campaignId = ci.campaignId AND w.stepsDone = 0
  JOIN `campaigns` c ON c.id = ci.campaignId AND c.isDemo = 1
   SET ci.needDeadline = DATE_ADD(ci.needDeadline, INTERVAL w.shiftDays DAY),
       ci.shiftStartsAt = DATE_ADD(ci.shiftStartsAt, INTERVAL w.shiftDays DAY),
       ci.shiftEndsAt = DATE_ADD(ci.shiftEndsAt, INTERVAL w.shiftDays DAY),
       ci.loanWindowStart = DATE_ADD(ci.loanWindowStart, INTERVAL w.shiftDays DAY),
       ci.loanWindowEnd = DATE_ADD(ci.loanWindowEnd, INTERVAL w.shiftDays DAY),
       ci.neededFrom = DATE_ADD(ci.neededFrom, INTERVAL w.shiftDays DAY),
       ci.neededUntil = DATE_ADD(ci.neededUntil, INTERVAL w.shiftDays DAY),
       ci.updatedAt = ci.updatedAt;

UPDATE `_example_window_0268` SET stepsDone = 1 WHERE stepsDone = 0;

-- 2. Offers: the lend's dates and the claim's expiry move whole, what happened never past now.
UPDATE `campaign_contributions` cc
  JOIN `_example_window_0268` w ON w.campaignId = cc.campaignId AND w.stepsDone = 1
  JOIN `campaigns` c ON c.id = cc.campaignId AND c.isDemo = 1
   SET cc.availableFrom = DATE_ADD(cc.availableFrom, INTERVAL w.shiftDays DAY),
       cc.lendUntil = DATE_ADD(cc.lendUntil, INTERVAL w.shiftDays DAY),
       cc.claimExpiresAt = DATE_ADD(cc.claimExpiresAt, INTERVAL w.shiftDays DAY),
       cc.submittedAt = LEAST(DATE_ADD(cc.submittedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.createdAt = LEAST(DATE_ADD(cc.createdAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.reviewedAt = LEAST(DATE_ADD(cc.reviewedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.fulfilledAt = LEAST(DATE_ADD(cc.fulfilledAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.acknowledgedAt = LEAST(DATE_ADD(cc.acknowledgedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.returnedAt = LEAST(DATE_ADD(cc.returnedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.hyphaConfirmedAt = LEAST(DATE_ADD(cc.hyphaConfirmedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.cancelNoticedAt = LEAST(DATE_ADD(cc.cancelNoticedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.nudge1At = LEAST(DATE_ADD(cc.nudge1At, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.nudge2At = LEAST(DATE_ADD(cc.nudge2At, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.waitNoteAt = LEAST(DATE_ADD(cc.waitNoteAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.closeReleasedAt = LEAST(DATE_ADD(cc.closeReleasedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cc.updatedAt = cc.updatedAt;

UPDATE `_example_window_0268` SET stepsDone = 2 WHERE stepsDone = 1;

-- 3. Updates: posted, never past now. The table has no updatedAt.
UPDATE `campaign_updates` cu
  JOIN `_example_window_0268` w ON w.campaignId = cu.campaignId AND w.stepsDone = 2
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1
   SET cu.publishedAt = LEAST(DATE_ADD(cu.publishedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       cu.createdAt = LEAST(DATE_ADD(cu.createdAt, INTERVAL w.shiftDays DAY), w.nowAt);

UPDATE `_example_window_0268` SET stepsDone = 3 WHERE stepsDone = 2;

-- 4. Money routes: the "as of" date and the verification, never past now. The table has no updatedAt.
UPDATE `campaign_partner_links` pl
  JOIN `_example_window_0268` w ON w.campaignId = pl.campaignId AND w.stepsDone = 3
  JOIN `campaigns` c ON c.id = pl.campaignId AND c.isDemo = 1
   SET pl.lastFetchedAt = LEAST(DATE_ADD(pl.lastFetchedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       pl.verifiedAt = LEAST(DATE_ADD(pl.verifiedAt, INTERVAL w.shiftDays DAY), w.nowAt);

UPDATE `_example_window_0268` SET stepsDone = 4 WHERE stepsDone = 3;

-- 5. The campaign last: its window moves whole, its stamps never past now.
UPDATE `campaigns` c
  JOIN `_example_window_0268` w ON w.campaignId = c.id AND w.stepsDone = 4
   SET c.startedAt = DATE_ADD(c.startedAt, INTERVAL w.shiftDays DAY),
       c.publishedAt = DATE_ADD(c.publishedAt, INTERVAL w.shiftDays DAY),
       c.reviewedAt = LEAST(DATE_ADD(c.reviewedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       c.completedAt = LEAST(DATE_ADD(c.completedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       c.closedAt = LEAST(DATE_ADD(c.closedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       c.closeNoticedAt = LEAST(DATE_ADD(c.closeNoticedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       c.finalStretchNoticedAt = LEAST(DATE_ADD(c.finalStretchNoticedAt, INTERVAL w.shiftDays DAY), w.nowAt),
       c.updatedAt = c.updatedAt
 WHERE c.isDemo = 1;

UPDATE `_example_window_0268` SET stepsDone = 5 WHERE stepsDone = 4;

DROP TABLE IF EXISTS `_example_window_0268`;

SET time_zone = @rc0268_tz;

INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive)
VALUES
  ('crowdpool', 'lifecycle', 'crowdpool.examples_roll', 'Keep example campaigns current',
   'When on, the daily job moves each example campaign forward in time once its close date is under 30 days away, so it reads partway through its window again. It moves example campaigns only. Turn off to pause without a deploy.',
   1, 'boolean', 1, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);
