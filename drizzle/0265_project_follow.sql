-- Follow a project, so a follow lasts from one season's campaign to the next.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it. The enum
-- change appends a value old code never writes, the new column is nullable,
-- and the backfills fill the new column or add new follow rows. Campaign
-- follows stay exactly as they are, so old code keeps working.
--
-- user_follows.targetType gains 'project'. A project follow's targetId is
-- the project ref from shared/projectKey.ts (projectRefFor): 'a{applicationId}'
-- for a project with an application, 'c{campaignId}' for a campaign with none.
--
-- campaign_followers (email followers, no account) gains projectRef, the same
-- ref, so an email follow reads across seasons too.
--
-- Why each backfill runs:
--   * Every email follower row gets its campaign's project ref.
--   * Every account follow of a campaign also becomes a follow of its project.
--     The unique key user_follows_uq (userId, targetType, targetId) makes this
--     safe to repeat, and INSERT IGNORE skips a pair that already exists. The
--     IGNORE also keeps a non-numeric targetId on another target type from
--     stopping the statement under strict mode.
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-27, section 3.3.

ALTER TABLE `user_follows`
  MODIFY COLUMN `targetType` enum('user','category','bioregion','tag','campaign','project') NOT NULL;

ALTER TABLE `campaign_followers`
  ADD COLUMN `projectRef` VARCHAR(24) NULL DEFAULT NULL,
  ADD INDEX `campaign_followers_project_idx` (`projectRef`);

-- Email followers carry their project, so a follow reads across seasons.
UPDATE `campaign_followers` cf
  JOIN `campaigns` c ON c.id = cf.campaignId
  SET cf.projectRef = IF(c.applicationId IS NOT NULL, CONCAT('a', c.applicationId), CONCAT('c', c.id))
  WHERE cf.projectRef IS NULL;

-- Every account follow of a campaign also follows its project. Campaign follows stay.
INSERT IGNORE INTO `user_follows` (`userId`, `targetType`, `targetId`, `createdAt`)
  SELECT uf.userId, 'project',
         IF(c.applicationId IS NOT NULL, CONCAT('a', c.applicationId), CONCAT('c', c.id)),
         uf.createdAt
    FROM `user_follows` uf
    JOIN `campaigns` c ON c.id = CAST(uf.targetId AS UNSIGNED)
   WHERE uf.targetType = 'campaign';
