-- Campaign notices on the notification spine, plus two closed states for
-- contributions. Additive only: every existing enum value stays, in order,
-- and new values are appended. The notifications.type list below restates
-- what 0205 left in the database (checked with SHOW COLUMNS on 2026-09-24).
ALTER TABLE `notifications`
  MODIFY COLUMN `type` enum('forum_reply','quest_complete','fund_update','vouch','mention','gratitude','reaction_milestone','guide_reply','elder_reply','thread_followed_activity','governance_stage','system','contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','claim_complete','claim_failed','campaign_update','contribution_delivered','contribution_thanked','contribution_released','role_filled','campaign_approved','campaign_declined','campaign_cancelled','campaign_completed','claim_expired') NOT NULL;

-- released: a steward freed an accepted place. cancelled: the campaign was
-- cancelled while this offer was waiting or accepted.
ALTER TABLE `campaign_contributions`
  MODIFY COLUMN `status` enum('pending','accepted','rejected','withdrawn','fulfilled','expired','thanked','released','cancelled') NOT NULL DEFAULT 'pending';

-- Stamped when a cancellation notice reached this contributor. NULL rows are
-- retried by the daily batch.
ALTER TABLE `campaign_contributions`
  ADD COLUMN `cancelNoticedAt` timestamp NULL DEFAULT NULL;

-- Project pages look campaigns up by application.
CREATE INDEX `campaigns_applicationId_idx` ON `campaigns` (`applicationId`);
