-- The close date, steward nudges and the notices around them.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it. Every
-- enum change appends values old code never writes, every new column is
-- nullable, and the game variables are new rows. Nothing is backfilled.
--
-- campaigns
--   * status gains 'closed': the close date (startedAt or publishedAt plus
--     durationDays) passed and the campaign didn't complete. Only the daily
--     close job writes it (server/lib/campaign-close.ts), with a conditional
--     UPDATE; no person can move a campaign there (shared/campaignStatus.ts).
--   * closedAt: when the close job closed it (complete or not).
--   * closeOutcome: 'complete' or 'did_not_complete' for a campaign the job
--     closed; NULL for one still open or marked complete by hand.
--   * closeNoticedAt: stamped once every close notice went out, so a crash
--     between the close and its notices is finished on the next run.
--   * finalStretchNoticedAt: the two-weeks-before-close follower notice went out.
--
-- campaign_contributions
--   * nudge1At, nudge2At: the steward nudges at 2 and 7 days of waiting went out.
--   * waitNoteAt: the contributor's "still waiting" note at 14 days went out.
--   * closeReleasedAt: the close released this accepted offer, which tells a
--     release the close made from one a steward made.
--   cancelNoticedAt (0248) is reused as "a cancel or close notice reached this row".
--
-- notifications.type gains six campaign notices: offer_waiting,
-- offer_still_waiting, campaign_opened, campaign_final_stretch,
-- campaign_closed, contributor_reply. Every existing value stays, in order
-- (restating 0256, the last change to this column). Any later MODIFY of this
-- column must restate the whole list below, these six included.
--
-- Two switches pause the daily job's steps without a deploy, both on:
-- crowdpool.auto_close and crowdpool.nudges.
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-27, section 3.2.

ALTER TABLE `campaigns`
  MODIFY COLUMN `status` enum('draft','pending_review','active','funded','completed','cancelled','rejected','closed') NOT NULL DEFAULT 'draft',
  ADD COLUMN `closedAt` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `closeOutcome` ENUM('complete','did_not_complete') NULL DEFAULT NULL,
  ADD COLUMN `closeNoticedAt` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `finalStretchNoticedAt` TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE `campaign_contributions`
  ADD COLUMN `nudge1At` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `nudge2At` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `waitNoteAt` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `closeReleasedAt` TIMESTAMP NULL DEFAULT NULL;

-- Additive only: every existing value stays, in order (restating 0256), and six are appended.
ALTER TABLE `notifications`
  MODIFY COLUMN `type` enum('forum_reply','quest_complete','fund_update','vouch','mention','gratitude','reaction_milestone','guide_reply','elder_reply','thread_followed_activity','governance_stage','system','contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','claim_complete','claim_failed','campaign_update','contribution_delivered','contribution_thanked','contribution_released','role_filled','campaign_approved','campaign_declined','campaign_cancelled','campaign_completed','claim_expired','role_reopened','offer_waiting','offer_still_waiting','campaign_opened','campaign_final_stretch','campaign_closed','contributor_reply') NOT NULL;

INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive)
VALUES
  ('crowdpool', 'lifecycle', 'crowdpool.auto_close', 'Close campaigns at their close date',
   'When on, the daily job closes each real live campaign at its close date: complete when both halves landed, closed otherwise. Examples never close. Turn off to pause closing without a deploy.',
   1, 'boolean', 1, 1),
  ('crowdpool', 'notices', 'crowdpool.nudges', 'Nudge stewards about waiting offers',
   'When on, stewards hear when an offer has waited 2 days and again at 7, and contributors with an account hear at 14 days. Turn off to pause without a deploy.',
   1, 'boolean', 1, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);
