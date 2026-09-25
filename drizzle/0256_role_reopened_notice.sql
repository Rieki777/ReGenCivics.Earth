-- A notice for when a filled role opens up again.
--
-- A role measured in hours a week reads filled once its accepted hours reach
-- the hours it needs. It opens up again when a steward releases someone,
-- lowers someone's accepted hours, or raises the hours the role needs. The
-- people still waiting on the role (pending) now hear about it on the
-- notification spine, through notifyRoleReopened in
-- server/lib/campaign-notify.ts (which also decides whether people a steward
-- declined hear: ROLE_REOPENED_REACHES_DECLINED).
--
-- Additive only: every existing enum value stays, in order, and the new one is
-- appended. The list below restates 0248, the last change to this column.
ALTER TABLE `notifications`
  MODIFY COLUMN `type` enum('forum_reply','quest_complete','fund_update','vouch','mention','gratitude','reaction_milestone','guide_reply','elder_reply','thread_followed_activity','governance_stage','system','contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','claim_complete','claim_failed','campaign_update','contribution_delivered','contribution_thanked','contribution_released','role_filled','campaign_approved','campaign_declined','campaign_cancelled','campaign_completed','claim_expired','role_reopened') NOT NULL;
