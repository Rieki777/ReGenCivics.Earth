-- 0205: Crowdpooling campaign flags, follows, and email-only followers.
-- Spec: CROWDPOOLING_PLATFORM_SPEC.md Part B Migration D (decisions 3, 5).
-- isDemo labels the seeded example campaigns so they render with the Example
-- badge and never count in the gallery impact strip. forumPostId links the
-- campaign's discussion thread, seasonId ties a campaign to its season.
-- user_follows gains the 'campaign' target for account holders, notifications
-- gains 'campaign_update' for the follower fan-out. campaign_followers holds
-- email-only followers from the GetNotified form (no account required),
-- unsubscribeToken goes into every email they receive.

ALTER TABLE `campaigns`
  ADD COLUMN `isDemo` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `forumPostId` int NULL DEFAULT NULL,
  ADD COLUMN `seasonId` int NULL DEFAULT NULL;

-- Additive enum widening, existing values preserved in order.
ALTER TABLE `user_follows`
  MODIFY COLUMN `targetType` enum('user','category','bioregion','tag','campaign') NOT NULL;

ALTER TABLE `notifications`
  MODIFY COLUMN `type` enum('forum_reply','quest_complete','fund_update','vouch','mention','gratitude','reaction_milestone','guide_reply','elder_reply','thread_followed_activity','governance_stage','system','contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','claim_complete','claim_failed','campaign_update') NOT NULL;

-- The unique key doubles as the campaignId lookup index (leftmost prefix).
CREATE TABLE IF NOT EXISTS `campaign_followers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) NULL DEFAULT NULL,
  `unsubscribeToken` varchar(32) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaign_followers_campaign_email_uq` (`campaignId`, `email`)
);
