-- ci-baseline.sql: GENERATED FILE, DO NOT EDIT BY HAND.
-- Regenerate with: npx tsx scripts/dump-ci-baseline.ts
--
-- Structure-only snapshot used to build a fresh CI database. The numbered
-- migrations cannot do this on their own (see ADR-37); CI loads this file,
-- then runs run-migration.ts --all for anything added since the snapshot.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `__drizzle_migrations`;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `_migrations_applied`;
CREATE TABLE `_migrations_applied` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `appliedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `statementsRun` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `active_quest_signals`;
CREATE TABLE `active_quest_signals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `questId` varchar(100) NOT NULL,
  `questTitle` varchar(255) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `lookingForParty` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `activity_feed_events`;
CREATE TABLE `activity_feed_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventType` varchar(50) NOT NULL,
  `actorType` enum('player','project','system') NOT NULL,
  `actorId` int DEFAULT NULL,
  `targetType` varchar(50) DEFAULT NULL,
  `targetId` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `visibility` enum('public','admin_only') DEFAULT 'public',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_type` (`eventType`),
  KEY `idx_activity_actor` (`actorId`),
  KEY `idx_activity_date` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `adminAuditLog`;
CREATE TABLE `adminAuditLog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adminUserId` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `entityType` varchar(50) DEFAULT NULL,
  `entityId` int DEFAULT NULL,
  `description` text,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `adminAuditLog_adminUserId_idx` (`adminUserId`),
  KEY `adminAuditLog_action_idx` (`action`),
  KEY `adminAuditLog_entityType_entityId_idx` (`entityType`,`entityId`),
  KEY `adminAuditLog_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `adminNotifications`;
CREATE TABLE `adminNotifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `entityId` int DEFAULT NULL,
  `entityType` varchar(50) DEFAULT NULL,
  `message` text NOT NULL,
  `snoozedUntil` datetime DEFAULT NULL,
  `handledAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `admin_automations`;
CREATE TABLE `admin_automations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('briefing_digest','attention_digest','registry_action') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cadence` enum('hourly','daily','every_other_day','weekly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `enabled` tinyint NOT NULL DEFAULT '1',
  `actionId` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actionInput` json DEFAULT NULL,
  `createdBy` int NOT NULL,
  `lastRunAt` timestamp NULL DEFAULT NULL,
  `lastResult` text COLLATE utf8mb4_unicode_ci,
  `runCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_automations_due` (`enabled`,`lastRunAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `agenda_suggestions`;
CREATE TABLE `agenda_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventId` int NOT NULL,
  `authorEmail` varchar(320) NOT NULL,
  `authorName` varchar(255) DEFAULT NULL,
  `suggestion` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agenda_suggestions_eventId_idx` (`eventId`),
  KEY `agenda_suggestions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `analytics_events`;
CREATE TABLE `analytics_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `props` json DEFAULT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sid` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `ipHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ua` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_created` (`createdAt`),
  KEY `idx_analytics_event_created` (`event`,`createdAt`),
  KEY `idx_analytics_path_created` (`path`,`createdAt`),
  KEY `idx_analytics_sid_created` (`sid`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `applicationEvents`;
CREATE TABLE `applicationEvents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicationId` int NOT NULL,
  `eventType` enum('status_change','email_sent','note_added','admin_action') NOT NULL,
  `description` text NOT NULL,
  `adminUserId` int DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `applicationId` (`applicationId`),
  CONSTRAINT `applicationEvents_ibfk_1` FOREIGN KEY (`applicationId`) REFERENCES `applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `applications`;
CREATE TABLE `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `status` enum('draft','submitted','under_review','approved','active','inactive','rejected','changes_requested') NOT NULL DEFAULT 'draft',
  `projectName` varchar(255) NOT NULL,
  `projectType` enum('early_stage','mature') NOT NULL,
  `location` varchar(255) NOT NULL,
  `vision` text NOT NULL,
  `landStatus` enum('owned','leased','committed','seeking') NOT NULL,
  `teamSize` int NOT NULL,
  `teamDescription` text NOT NULL,
  `regenerativePractices` text NOT NULL,
  `governanceApproach` text NOT NULL,
  `communityEngagement` text NOT NULL,
  `timeCommitment` text NOT NULL,
  `currentFunding` text,
  `fundingNeeds` text NOT NULL,
  `websiteUrl` varchar(512) DEFAULT NULL,
  `videoUrl` varchar(512) DEFAULT NULL,
  `documentsUrl` text,
  `additionalNotes` text,
  `submittedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `projectSizeHectares` int DEFAULT NULL,
  `currentPeopleCount` int DEFAULT NULL,
  `currentHouseholdCount` int DEFAULT NULL,
  `intendedPeopleCount` int DEFAULT NULL,
  `intendedHouseholdCount` int DEFAULT NULL,
  `mixedUse` text,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `meetingFrequency` enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus') DEFAULT NULL,
  `dietaryPatterns` text,
  `internalNotes` text,
  `adminSeeded` tinyint(1) NOT NULL DEFAULT '0',
  `stewardUserId` int DEFAULT NULL,
  `projectStatusUpdatedAt` timestamp NULL DEFAULT NULL,
  `endorsementCount` int DEFAULT '0',
  `contributionCount` int DEFAULT '0',
  `fundedCampaignCount` int DEFAULT '0',
  `seasonsActive` int DEFAULT '0',
  `projectStatus` enum('applied','accepted','active','established','anchor') DEFAULT 'applied',
  `seasonsCompleted` int NOT NULL DEFAULT '0',
  `gameLaunchedAt` timestamp NULL DEFAULT NULL,
  `shipReferralHandle` varchar(40) DEFAULT NULL,
  `shipReferralUserId` int DEFAULT NULL,
  `companionTranscript` mediumtext,
  PRIMARY KEY (`id`),
  KEY `applications_userId_idx` (`userId`),
  KEY `applications_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bannedEmails`;
CREATE TABLE `bannedEmails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `reason` text,
  `bannedBy` int DEFAULT NULL,
  `bannedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `batch_job_runs`;
CREATE TABLE `batch_job_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jobType` varchar(50) NOT NULL,
  `startedAt` datetime NOT NULL,
  `completedAt` datetime DEFAULT NULL,
  `status` enum('running','success','partial_failure','failed') DEFAULT 'running',
  `promotions` int DEFAULT '0',
  `demotions` int DEFAULT '0',
  `playersProcessed` int DEFAULT '0',
  `errors` json DEFAULT NULL,
  `triggeredBy` varchar(100) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bioregions`;
CREATE TABLE `bioregions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `realm` text,
  `subrealm` text,
  `source` varchar(64) DEFAULT NULL,
  `approved` tinyint NOT NULL DEFAULT '1',
  `submittedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `bioregions_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `blogEdits`;
CREATE TABLE `blogEdits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogEdits_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bounties`;
CREATE TABLE `bounties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sourceType` enum('call_task','contribution') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenType` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regen',
  `tier` enum('trivial','small','medium','large') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workStatus` enum('proposed','accepted','open','claimed','in_review','completed','declined','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'proposed',
  `approvedBy` int DEFAULT NULL,
  `declinedReason` text COLLATE utf8mb4_unicode_ci,
  `completionChecklist` json DEFAULT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `kind` enum('fix','feature') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sourceForumPostId` int DEFAULT NULL,
  `githubRepo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `githubIssueNumber` int DEFAULT NULL,
  `mergedPrNumbers` json DEFAULT NULL,
  `recordingId` int DEFAULT NULL,
  `roleSlug` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evidenceQuote` text COLLATE utf8mb4_unicode_ci,
  `evidenceTs` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `valuationBreakdown` json DEFAULT NULL,
  `sociocraticOverviewJson` json DEFAULT NULL,
  `priorityBoost` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `bounties_status_type_idx` (`workStatus`,`sourceType`),
  KEY `bounties_github_idx` (`githubRepo`(191),`githubIssueNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `bounty_artifacts`;
CREATE TABLE `bounty_artifacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bountyId` int NOT NULL,
  `roleId` int DEFAULT NULL,
  `userId` int NOT NULL,
  `artifactType` enum('photo','text','link','video') NOT NULL DEFAULT 'text',
  `artifactUrl` varchar(1000) DEFAULT NULL,
  `artifactText` text,
  `caption` varchar(500) DEFAULT NULL,
  `videoThumbnailUrl` varchar(1000) DEFAULT NULL,
  `videoDurationSeconds` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bounty_artifacts_bountyId_idx` (`bountyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bounty_demand_factors`;
CREATE TABLE `bounty_demand_factors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `circle` varchar(128) NOT NULL,
  `scopeTier` enum('trivial','small','medium','large') NOT NULL,
  `factor` decimal(6,4) NOT NULL DEFAULT '1.0000',
  `precedentMedian` decimal(20,6) DEFAULT NULL,
  `sampleSize` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bounty_demand_factors_circle_tier` (`circle`,`scopeTier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bounty_events`;
CREATE TABLE `bounty_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bountyId` int NOT NULL,
  `roleId` int DEFAULT NULL,
  `actorUserId` int DEFAULT NULL,
  `event` varchar(48) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bounty_events_bountyId_createdAt_idx` (`bountyId`,`createdAt`),
  CONSTRAINT `bounty_events_ibfk_1` FOREIGN KEY (`bountyId`) REFERENCES `bounties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `bounty_permissions`;
CREATE TABLE `bounty_permissions` (
  `userId` int NOT NULL,
  `canAccept` tinyint NOT NULL DEFAULT '0',
  `canReverse` tinyint NOT NULL DEFAULT '0',
  `grantedBy` int DEFAULT NULL,
  `grantedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `bounty_roles`;
CREATE TABLE `bounty_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bountyId` int NOT NULL,
  `role` enum('doer','proposer','shipper','reviewer','booster') COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int DEFAULT NULL,
  `amount` int NOT NULL DEFAULT '0',
  `payStatus` enum('unfilled','filled','payable','held','paid','reversed','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unfilled',
  `ledgerId` int DEFAULT NULL,
  `filledByLog` json DEFAULT NULL,
  `paidAt` timestamp NULL DEFAULT NULL,
  `claimableAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bounty_roles_bountyId_idx` (`bountyId`),
  KEY `bounty_roles_user_pay_idx` (`userId`,`payStatus`),
  CONSTRAINT `bounty_roles_ibfk_1` FOREIGN KEY (`bountyId`) REFERENCES `bounties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `campaign_analytics`;
CREATE TABLE `campaign_analytics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `viewDate` timestamp NOT NULL DEFAULT (now()),
  `visitorId` varchar(64) DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `referrer` varchar(512) DEFAULT NULL,
  `utmSource` varchar(100) DEFAULT NULL,
  `utmMedium` varchar(100) DEFAULT NULL,
  `utmCampaign` varchar(100) DEFAULT NULL,
  `userAgent` varchar(512) DEFAULT NULL,
  `deviceType` enum('desktop','mobile','tablet') DEFAULT 'desktop',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `campaign_contributions`;
CREATE TABLE `campaign_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `campaignItemId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `contributorName` varchar(255) NOT NULL,
  `contributorEmail` varchar(320) NOT NULL,
  `contributorPhone` varchar(50) DEFAULT NULL,
  `contributorBio` text,
  `contributionType` enum('land','equipment','role','resource','financial') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `landHectares` int DEFAULT NULL,
  `landRegion` varchar(255) DEFAULT NULL,
  `landFeatures` text,
  `equipmentName` varchar(255) DEFAULT NULL,
  `equipmentQuantity` int DEFAULT NULL,
  `equipmentCondition` varchar(50) DEFAULT NULL,
  `roleTitle` varchar(255) DEFAULT NULL,
  `hoursPerWeek` int DEFAULT NULL,
  `durationMonths` int DEFAULT NULL,
  `skills` text,
  `resourceName` varchar(255) DEFAULT NULL,
  `resourceQuantity` int DEFAULT NULL,
  `resourceUnit` varchar(50) DEFAULT NULL,
  `financialAmount` int DEFAULT NULL,
  `financialCurrency` varchar(10) DEFAULT 'USD',
  `paymentMethod` varchar(50) DEFAULT NULL,
  `estimatedValue` int NOT NULL DEFAULT '0',
  `status` enum('pending','accepted','rejected','withdrawn','fulfilled') NOT NULL DEFAULT 'pending',
  `contributorNotes` text,
  `ownerNotes` text,
  `submittedAt` timestamp NOT NULL DEFAULT (now()),
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `fulfilledAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `campaign_images`;
CREATE TABLE `campaign_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `uploadedByUserId` int NOT NULL,
  `url` varchar(1024) NOT NULL,
  `fileKey` varchar(512) NOT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `fileSize` int DEFAULT NULL,
  `category` enum('land','team','progress','infrastructure','community','other') NOT NULL DEFAULT 'other',
  `caption` varchar(500) DEFAULT NULL,
  `isCover` tinyint NOT NULL DEFAULT '0',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `campaign_items`;
CREATE TABLE `campaign_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `category` enum('land','equipment','role','resource') NOT NULL,
  `hectares` int DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `features` text,
  `videoUrl` varchar(500) DEFAULT NULL,
  `landDescription` text,
  `equipmentName` varchar(255) DEFAULT NULL,
  `equipmentQuantity` int DEFAULT '1',
  `equipmentCategory` varchar(100) DEFAULT NULL,
  `roleTitle` varchar(255) DEFAULT NULL,
  `hoursPerWeek` int DEFAULT NULL,
  `durationMonths` int DEFAULT NULL,
  `roleDescription` text,
  `resourceName` varchar(255) DEFAULT NULL,
  `resourceQuantity` int DEFAULT '1',
  `resourceUnit` varchar(50) DEFAULT NULL,
  `resourceDescription` text,
  `estimatedValue` int NOT NULL DEFAULT '0',
  `pledgedValue` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `status` enum('draft','pending_review','active','funded','completed','cancelled','rejected') NOT NULL DEFAULT 'draft',
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `projectName` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `financialTarget` int NOT NULL DEFAULT '0',
  `currency` varchar(10) DEFAULT 'USD',
  `totalValue` int NOT NULL DEFAULT '0',
  `landValue` int NOT NULL DEFAULT '0',
  `equipmentValue` int NOT NULL DEFAULT '0',
  `rolesValue` int NOT NULL DEFAULT '0',
  `resourcesValue` int NOT NULL DEFAULT '0',
  `pledgedTotal` int NOT NULL DEFAULT '0',
  `pledgedLand` int NOT NULL DEFAULT '0',
  `pledgedEquipment` int NOT NULL DEFAULT '0',
  `pledgedRoles` int NOT NULL DEFAULT '0',
  `pledgedResources` int NOT NULL DEFAULT '0',
  `pledgedFinancial` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `applicationId` int DEFAULT NULL,
  `vision` text,
  `landStatus` varchar(50) DEFAULT NULL,
  `landSize` varchar(100) DEFAULT NULL,
  `currentPhase` varchar(255) DEFAULT NULL,
  `timeline` varchar(255) DEFAULT NULL,
  `legalStructure` varchar(255) DEFAULT NULL,
  `governanceModel` text,
  `membershipModel` text,
  `housingPlans` text,
  `foodSystems` text,
  `waterSystems` text,
  `energySystems` text,
  `educationPrograms` text,
  `communityEngagement` text,
  `impactMetrics` text,
  `challenges` text,
  `teamSize` int DEFAULT NULL,
  `teamDescription` text,
  `regenerativePractices` text,
  `websiteUrl` varchar(512) DEFAULT NULL,
  `videoUrl` varchar(512) DEFAULT NULL,
  `projectImageUrl` varchar(512) DEFAULT NULL,
  `daoLink` varchar(512) DEFAULT NULL,
  `durationDays` int NOT NULL DEFAULT '90',
  `startedAt` timestamp NULL DEFAULT NULL,
  `adminNotes` text,
  `reviewedBy` int DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `generatedImageUrl` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `church_donations`;
CREATE TABLE `church_donations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` enum('stripe','zeffy') NOT NULL DEFAULT 'stripe',
  `stripeSessionId` varchar(255) DEFAULT NULL,
  `stripePaymentIntent` varchar(255) DEFAULT NULL,
  `stripeSubscriptionId` varchar(255) DEFAULT NULL,
  `zeffyPaymentId` varchar(255) DEFAULT NULL,
  `zeffyCampaignId` varchar(255) DEFAULT NULL,
  `donorUserId` int DEFAULT NULL,
  `donorEmail` varchar(320) DEFAULT NULL,
  `amountCents` int NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'usd',
  `giftInterval` enum('one_time','monthly') NOT NULL DEFAULT 'one_time',
  `status` enum('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program` varchar(64) DEFAULT NULL,
  `crewProfileId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `church_donations_session_uq` (`stripeSessionId`),
  UNIQUE KEY `church_donations_zeffy_payment_uq` (`zeffyPaymentId`),
  KEY `church_donations_donor_idx` (`donorUserId`),
  KEY `church_donations_status_idx` (`status`),
  KEY `church_donations_provider_idx` (`provider`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `church_payouts`;
CREATE TABLE `church_payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `initiatedByUserId` int NOT NULL,
  `amountCents` int NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'usd',
  `purpose` varchar(500) NOT NULL,
  `destinationRef` varchar(500) DEFAULT NULL,
  `status` enum('recorded','reconciled','void') NOT NULL DEFAULT 'recorded',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `church_payouts_initiator_idx` (`initiatedByUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `church_role_holders`;
CREATE TABLE `church_role_holders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `role` enum('steward') NOT NULL DEFAULT 'steward',
  `canAcceptPayments` tinyint NOT NULL DEFAULT '0',
  `canMakePayments` tinyint NOT NULL DEFAULT '0',
  `grantedBy` int DEFAULT NULL,
  `grantedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revokedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `church_role_holders_userId_idx` (`userId`),
  KEY `church_role_holders_active_idx` (`userId`,`revokedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `citizenship_tier_history`;
CREATE TABLE `citizenship_tier_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `fromTier` enum('explorer','co_creator','steward','sage') NOT NULL,
  `toTier` enum('explorer','co_creator','steward','sage') NOT NULL,
  `reason` enum('automatic','admin_override','nomination','grace_period_expired') NOT NULL,
  `promotedBy` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cth_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `communityAgreementVotes`;
CREATE TABLE `communityAgreementVotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agreementId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`agreementId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `communityAgreements`;
CREATE TABLE `communityAgreements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('open','ratified','in_review','declined') NOT NULL DEFAULT 'open',
  `voteCount` int NOT NULL DEFAULT '0',
  `forumThreadId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `contact_notes`;
CREATE TABLE `contact_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contactType` varchar(50) NOT NULL,
  `contactId` int NOT NULL,
  `note` text NOT NULL,
  `authorName` varchar(255) DEFAULT 'Admin',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `contact_tags`;
CREATE TABLE `contact_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contactType` varchar(50) NOT NULL,
  `contactId` int NOT NULL,
  `tag` varchar(100) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `contribution_score_events`;
CREATE TABLE `contribution_score_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `points` int NOT NULL,
  `variableKey` varchar(100) DEFAULT NULL,
  `referenceType` enum('quest','forum_post','forum_reply','event','contribution','referral','endorsement','badge','gratitude','flag','streak','crowdpool','composting') NOT NULL,
  `referenceId` int DEFAULT NULL,
  `seasonId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_score_user` (`userId`),
  KEY `idx_score_season` (`seasonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `conversationParticipants`;
CREATE TABLE `conversationParticipants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversationId` int NOT NULL,
  `userId` int NOT NULL,
  `lastReadAt` timestamp NULL DEFAULT NULL,
  `joinedAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `convParticipants_conversationId_idx` (`conversationId`),
  KEY `convParticipants_userId_idx` (`userId`),
  KEY `convParticipants_userId_convId_idx` (`userId`,`conversationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `conversations_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `council_proposals`;
CREATE TABLE `council_proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `councilId` int NOT NULL,
  `authorId` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `options` json DEFAULT NULL,
  `status` enum('draft','submitted','voting','closed') DEFAULT 'draft',
  `votingOpensAt` timestamp NULL DEFAULT NULL,
  `votingClosesAt` timestamp NULL DEFAULT NULL,
  `outcome` text,
  `adminNotes` text,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `council_seats`;
CREATE TABLE `council_seats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `councilId` int NOT NULL,
  `userId` int NOT NULL,
  `invitedAt` timestamp NULL DEFAULT NULL,
  `acceptedAt` timestamp NULL DEFAULT NULL,
  `declinedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_seat` (`councilId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `council_votes`;
CREATE TABLE `council_votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `userId` int NOT NULL,
  `selectedOption` varchar(200) NOT NULL,
  `votedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`proposalId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crowd_pooling_projects`;
CREATE TABLE `crowd_pooling_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicationId` int DEFAULT NULL,
  `projectName` varchar(255) NOT NULL,
  `projectDescription` text,
  `location` varchar(255) DEFAULT NULL,
  `projectImageUrl` varchar(512) DEFAULT NULL,
  `projectUrl` varchar(512) DEFAULT NULL,
  `targetCurrency` varchar(10) NOT NULL DEFAULT 'USD',
  `targetAmount` int NOT NULL,
  `currentAmount` int NOT NULL DEFAULT '0',
  `contributorCount` int NOT NULL DEFAULT '0',
  `startDate` timestamp NULL DEFAULT NULL,
  `endDate` timestamp NULL DEFAULT NULL,
  `status` enum('upcoming','active','completed','paused') NOT NULL DEFAULT 'upcoming',
  `isVisible` int NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crowd_pooling_proposals`;
CREATE TABLE `crowd_pooling_proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `userId` int DEFAULT NULL,
  `contributorName` varchar(255) NOT NULL,
  `contributorEmail` varchar(320) NOT NULL,
  `proposalData` text NOT NULL,
  `totalContribution` int NOT NULL DEFAULT '0',
  `financialContribution` int NOT NULL DEFAULT '0',
  `futureValueContribution` int NOT NULL DEFAULT '0',
  `status` enum('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  `contributorNotes` text,
  `reviewNotes` text,
  `submittedAt` timestamp NOT NULL DEFAULT (now()),
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `custom_game_inquiries`;
CREATE TABLE `custom_game_inquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `website_or_social` varchar(500) DEFAULT NULL,
  `land_status` varchar(100) NOT NULL,
  `community_stage` varchar(100) NOT NULL,
  `primary_goal` text NOT NULL,
  `timeline` varchar(100) NOT NULL,
  `budget_confirmed` tinyint NOT NULL DEFAULT '0',
  `referral_source` varchar(255) DEFAULT NULL,
  `additional_notes` text,
  `status` varchar(50) NOT NULL DEFAULT 'waitlist',
  `internal_notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `decisionLineage`;
CREATE TABLE `decisionLineage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `childDecisionId` int NOT NULL,
  `parentDecisionId` int NOT NULL,
  `relationship` enum('builds_on','supersedes','references') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dl` (`childDecisionId`,`parentDecisionId`),
  KEY `idx_dl_child` (`childDecisionId`),
  KEY `idx_dl_parent` (`parentDecisionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `decisionStorytellerNarratives`;
CREATE TABLE `decisionStorytellerNarratives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostDecisionId` int NOT NULL,
  `storytellerId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `narrativeBody` mediumtext NOT NULL,
  `wordCount` int NOT NULL DEFAULT '0',
  `publishedAt` timestamp NULL DEFAULT NULL,
  `status` enum('drafting','submitted','published') NOT NULL DEFAULT 'drafting',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dsn_decision` (`forumPostDecisionId`),
  KEY `idx_dsn_storyteller` (`storytellerId`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `digests`;
CREATE TABLE `digests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `generatedAt` timestamp NOT NULL DEFAULT (now()),
  `periodStart` varchar(32) NOT NULL,
  `periodEnd` varchar(32) NOT NULL,
  `contentMd` text NOT NULL,
  `forumPostId` int DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `directMessages`;
CREATE TABLE `directMessages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversationId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `deletedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `directMessages_conversationId_idx` (`conversationId`),
  KEY `directMessages_senderId_idx` (`senderId`),
  KEY `directMessages_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `economic_suggestion_votes`;
CREATE TABLE `economic_suggestion_votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suggestionId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_suggestion_vote` (`suggestionId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `economic_suggestions`;
CREATE TABLE `economic_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('open','in_review','accepted','declined') DEFAULT 'open',
  `voteCount` int DEFAULT '0',
  `forumThreadId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_econ_suggestions_author` (`authorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `elder_chat_messages`;
CREATE TABLE `elder_chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(64) NOT NULL,
  `elder` varchar(64) NOT NULL DEFAULT 'anastasia',
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `retrievedChunkIds` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `elder_chat_session_idx` (`sessionId`,`createdAt`),
  KEY `elder_chat_elder_idx` (`elder`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `elder_corpus_chunks`;
CREATE TABLE `elder_corpus_chunks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `elder` varchar(64) NOT NULL DEFAULT 'anastasia',
  `book` varchar(255) DEFAULT NULL,
  `section` varchar(512) DEFAULT NULL,
  `chunkIndex` int NOT NULL,
  `content` text NOT NULL,
  `contentTokens` int DEFAULT NULL,
  `embedding` json DEFAULT NULL,
  `embeddingModel` varchar(64) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `elder_corpus_elder_idx` (`elder`,`chunkIndex`),
  FULLTEXT KEY `elder_corpus_content_ft` (`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `emailTemplates`;
CREATE TABLE `emailTemplates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `templateKey` varchar(100) NOT NULL,
  `customSubject` varchar(500) DEFAULT NULL,
  `customBody` text,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `lastEditedBy` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emailTemplates_templateKey_unique` (`templateKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_logs`;
CREATE TABLE `email_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipientEmail` varchar(255) NOT NULL,
  `recipientName` varchar(255) DEFAULT NULL,
  `subject` varchar(500) NOT NULL,
  `template` varchar(100) DEFAULT NULL,
  `inquiryType` varchar(50) DEFAULT NULL,
  `inquiryId` int DEFAULT NULL,
  `status` enum('sent','delivered','bounced','failed') NOT NULL DEFAULT 'sent',
  `sentAt` timestamp NOT NULL DEFAULT (now()),
  `deliveredAt` timestamp NULL DEFAULT NULL,
  `openedAt` timestamp NULL DEFAULT NULL,
  `clickedAt` timestamp NULL DEFAULT NULL,
  `bounceReason` text,
  `resendEmailId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_logs_resendEmailId_idx` (`resendEmailId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_tokens`;
CREATE TABLE `email_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_tokens_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `entity_rss_feeds`;
CREATE TABLE `entity_rss_feeds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entityType` enum('land_project','organisation') NOT NULL,
  `entityId` varchar(100) NOT NULL,
  `feedUrl` varchar(1000) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `lastFetchedAt` timestamp NULL DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_attendance`;
CREATE TABLE `event_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `markedByAdminId` int DEFAULT NULL,
  `markedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tokensAwarded` int NOT NULL DEFAULT '33',
  `tokenLedgerEntryId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `eventAttendance_eventId_email_unique` (`eventId`,`email`),
  KEY `eventAttendance_eventId_idx` (`eventId`),
  KEY `eventAttendance_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_signups`;
CREATE TABLE `event_signups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `signupType` enum('reminder','waitlist') NOT NULL DEFAULT 'reminder',
  `name` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelledAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `eventSignups_eventId_email_unique` (`eventId`,`email`),
  KEY `eventSignups_eventId_idx` (`eventId`),
  KEY `eventSignups_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('open','episode','special') NOT NULL DEFAULT 'open',
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `timezone` varchar(10) DEFAULT 'UTC',
  `zoomUrl` varchar(512) DEFAULT NULL,
  `riversideRoomUrl` varchar(512) DEFAULT NULL,
  `youtubeUrl` varchar(512) DEFAULT NULL,
  `recordingId` int DEFAULT NULL,
  `status` enum('upcoming','live','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  `season` varchar(50) DEFAULT NULL,
  `episodeNumber` int DEFAULT NULL,
  `maxAttendees` int DEFAULT NULL,
  `forumThreadId` int DEFAULT NULL,
  `reminderSent` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `checkinToken` varchar(64) DEFAULT NULL,
  `guestSpeakerName` varchar(255) DEFAULT NULL,
  `guestSpeakerBio` text,
  `guestSpeakerTopic` varchar(500) DEFAULT NULL,
  `reminderScheduledFor` timestamp NULL DEFAULT NULL,
  `reminderCustomSubject` varchar(200) DEFAULT NULL,
  `reminderCustomBody` text,
  PRIMARY KEY (`id`),
  KEY `events_type_idx` (`type`),
  KEY `events_startTime_idx` (`startTime`),
  KEY `events_status_idx` (`status`),
  KEY `events_season_idx` (`season`),
  KEY `events_reminder_scheduled_idx` (`reminderScheduledFor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `featureSuggestionVotes`;
CREATE TABLE `featureSuggestionVotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suggestionId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`suggestionId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `featureSuggestions`;
CREATE TABLE `featureSuggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('open','planned','building','shipped','declined') NOT NULL DEFAULT 'open',
  `voteCount` int NOT NULL DEFAULT '0',
  `forumThreadId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumBans`;
CREATE TABLE `forumBans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `bannedBy` int NOT NULL,
  `reason` text,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumCategories`;
CREATE TABLE `forumCategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `imageUrl` varchar(500) DEFAULT NULL,
  `sortMode` varchar(20) NOT NULL DEFAULT 'activity',
  PRIMARY KEY (`id`),
  UNIQUE KEY `forumCategories_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumLikes`;
CREATE TABLE `forumLikes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `replyId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumModerators`;
CREATE TABLE `forumModerators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `addedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumPerspectives`;
CREATE TABLE `forumPerspectives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `threadId` int NOT NULL,
  `userId` int NOT NULL,
  `perspective` enum('support','can_live_with','see_differently','need_to_understand','serious_concern') NOT NULL,
  `weight` double NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forumPerspectives_thread_user` (`threadId`,`userId`),
  KEY `forumPerspectives_threadId_idx` (`threadId`),
  KEY `forumPerspectives_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumPostDecisions`;
CREATE TABLE `forumPostDecisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostId` int NOT NULL,
  `track` enum('fund','game','both') NOT NULL DEFAULT 'game',
  `reversibility` enum('reversible','semi_reversible','one_way_door') NOT NULL DEFAULT 'reversible',
  `bioregionScope` json DEFAULT NULL,
  `sunsetAt` timestamp NULL DEFAULT NULL,
  `status` enum('draft','open','closing_soon','closed','ratified','declined','cancelled') NOT NULL DEFAULT 'draft',
  `closesAt` timestamp NULL DEFAULT NULL,
  `closedAt` timestamp NULL DEFAULT NULL,
  `outcomeSummary` text,
  `outcomeReasoning` text,
  `stanceCount` int NOT NULL DEFAULT '0',
  `weightedStanceSummary` json DEFAULT NULL,
  `hyphaBridgeId` int DEFAULT NULL,
  `storytellerId` int DEFAULT NULL,
  `storytellerNarrativeId` int DEFAULT NULL,
  `proposerId` int NOT NULL,
  `coSignerId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fpd_post` (`forumPostId`),
  KEY `idx_fpd_status` (`status`,`closesAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumPosts`;
CREATE TABLE `forumPosts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoryId` int NOT NULL,
  `authorId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `content` text NOT NULL,
  `isPinned` tinyint NOT NULL DEFAULT '0',
  `isLocked` tinyint NOT NULL DEFAULT '0',
  `viewCount` int NOT NULL DEFAULT '0',
  `replyCount` int NOT NULL DEFAULT '0',
  `lastReplyAt` timestamp NULL DEFAULT NULL,
  `lastReplyBy` int DEFAULT NULL,
  `generatedImageUrl` varchar(512) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `tags` text,
  `postType` text,
  `threadStage` varchar(32) DEFAULT NULL,
  `chainId` int DEFAULT NULL,
  `bioregionId` int DEFAULT NULL,
  `linkPreviews` json DEFAULT NULL,
  `isSeed` tinyint(1) NOT NULL DEFAULT '0',
  `governanceStage` enum('dialogue','sensing','proposal','decided') NOT NULL DEFAULT 'dialogue',
  `sensingStartedAt` timestamp NULL DEFAULT NULL,
  `sensingStartedBy` int DEFAULT NULL,
  `capital` enum('intellectual','social','material','financial','living','cultural','spiritual','experiential','health') DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `forumPosts_authorId_idx` (`authorId`),
  KEY `forumPosts_listing_idx` (`categoryId`,`isPinned`,`lastReplyAt`),
  KEY `forumPosts_bioregionId_idx` (`bioregionId`),
  FULLTEXT KEY `idx_forum_fulltext` (`title`,`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumPromotionRequests`;
CREATE TABLE `forumPromotionRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostId` int NOT NULL,
  `proposerId` int NOT NULL,
  `coSignerId` int DEFAULT NULL,
  `decisionTrack` enum('fund','game','both') NOT NULL,
  `decisionQuestion` varchar(500) NOT NULL,
  `suggestedTemplate` varchar(40) NOT NULL DEFAULT 'consent',
  `reversibility` enum('reversible','semi_reversible','one_way_door') NOT NULL DEFAULT 'reversible',
  `bioregionScope` json DEFAULT NULL,
  `sunsetAt` timestamp NULL DEFAULT NULL,
  `status` enum('pending','signed','expired','cancelled') NOT NULL DEFAULT 'pending',
  `coSignedAt` timestamp NULL DEFAULT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fpr_post` (`forumPostId`),
  KEY `idx_fpr_status` (`status`,`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumReplies`;
CREATE TABLE `forumReplies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `authorId` int NOT NULL,
  `content` text NOT NULL,
  `parentReplyId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `triedThis` tinyint NOT NULL DEFAULT '0',
  `isOpenQuestion` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `forumReplies_postId_idx` (`postId`),
  KEY `forumReplies_authorId_idx` (`authorId`),
  KEY `forumReplies_openQuestion_idx` (`postId`,`isOpenQuestion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumReports`;
CREATE TABLE `forumReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporterId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `replyId` int DEFAULT NULL,
  `reason` enum('spam','harassment','inappropriate','misinformation','other') NOT NULL,
  `details` text,
  `status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
  `reviewedBy` int DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `severity` enum('soft','hard') NOT NULL DEFAULT 'soft',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumStrawPollVotes`;
CREATE TABLE `forumStrawPollVotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `strawPollId` int NOT NULL,
  `userId` int NOT NULL,
  `choice` varchar(80) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fspv` (`strawPollId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumStrawPolls`;
CREATE TABLE `forumStrawPolls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostId` int NOT NULL,
  `forumReplyId` int DEFAULT NULL,
  `creatorId` int NOT NULL,
  `question` varchar(300) NOT NULL,
  `options` json NOT NULL,
  `closesAt` timestamp NOT NULL,
  `closedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fsp_post` (`forumPostId`),
  KEY `idx_fsp_close` (`closesAt`,`closedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumThreadReadiness`;
CREATE TABLE `forumThreadReadiness` (
  `forumPostId` int NOT NULL,
  `ageHours` int NOT NULL DEFAULT '0',
  `uniqueVoiceCount` int NOT NULL DEFAULT '0',
  `hasDecisionQuestion` tinyint(1) NOT NULL DEFAULT '0',
  `trackTagged` enum('fund','game','both') DEFAULT NULL,
  `heatScore` int NOT NULL DEFAULT '0',
  `isReadyToPromote` tinyint(1) NOT NULL DEFAULT '0',
  `computedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`forumPostId`),
  KEY `idx_ftr_ready` (`isReadyToPromote`,`heatScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forumThreadWatchers`;
CREATE TABLE `forumThreadWatchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostId` int NOT NULL,
  `userId` int NOT NULL,
  `watchType` enum('promotion_ready','decision_open','decision_closed') NOT NULL DEFAULT 'promotion_ready',
  `notifiedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ftw` (`forumPostId`,`userId`,`watchType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forum_mentions`;
CREATE TABLE `forum_mentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sourceType` enum('post','reply') NOT NULL,
  `sourceId` int NOT NULL,
  `mentionedUserId` int NOT NULL,
  `mentionerUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forum_mentions_source_user_uq` (`sourceType`,`sourceId`,`mentionedUserId`),
  KEY `forum_mentions_mentioned_idx` (`mentionedUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forum_post_reads`;
CREATE TABLE `forum_post_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `lastReadAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastSeenReplyCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `forum_post_reads_user_post_uq` (`userId`,`postId`),
  KEY `forum_post_reads_user_read_idx` (`userId`,`lastReadAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forum_post_tags`;
CREATE TABLE `forum_post_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `tag` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forum_post_tags_uq` (`postId`,`tag`),
  KEY `forum_post_tags_tag_idx` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forum_subscriptions`;
CREATE TABLE `forum_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `reason` enum('authored','replied','mentioned','manual') NOT NULL,
  `muted` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forum_subscriptions_user_post_uq` (`userId`,`postId`),
  KEY `forum_subscriptions_post_idx` (`postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `forum_user_mutes`;
CREATE TABLE `forum_user_mutes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `mutedUserId` int NOT NULL,
  `scope` enum('notifications','feed','both') NOT NULL DEFAULT 'both',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forum_user_mutes_user_muted_uq` (`userId`,`mutedUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `galley_haul_items`;
CREATE TABLE `galley_haul_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `haulId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `category` enum('produce','pantry','protein','sauce','other') NOT NULL DEFAULT 'produce',
  `source` enum('market','ship','forage','store') NOT NULL DEFAULT 'market',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `galley_haul_items_haul_idx` (`haulId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `galley_hauls`;
CREATE TABLE `galley_hauls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int DEFAULT NULL,
  `userId` int NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `visibility` enum('crew','public') NOT NULL DEFAULT 'crew',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `galley_hauls_booking_idx` (`bookingId`),
  KEY `galley_hauls_user_idx` (`userId`),
  KEY `galley_hauls_visibility_idx` (`visibility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `galley_remixes`;
CREATE TABLE `galley_remixes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `haulId` int DEFAULT NULL,
  `bookingId` int DEFAULT NULL,
  `userId` int NOT NULL,
  `dishName` varchar(200) NOT NULL,
  `engine` enum('deterministic','cook') NOT NULL DEFAULT 'deterministic',
  `cardSlugs` json DEFAULT NULL,
  `recipe` json DEFAULT NULL,
  `conversation` json DEFAULT NULL,
  `photoUrls` json DEFAULT NULL,
  `visibility` enum('crew','public') NOT NULL DEFAULT 'crew',
  `publishedToCookbook` tinyint(1) NOT NULL DEFAULT '0',
  `cookbookStatus` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
  `submittedToCookbookAt` timestamp NULL DEFAULT NULL,
  `approvedByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `galley_remixes_haul_idx` (`haulId`),
  KEY `galley_remixes_user_idx` (`userId`),
  KEY `galley_remixes_published_idx` (`publishedToCookbook`),
  KEY `galley_remixes_visibility_idx` (`visibility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `game_endorsements`;
CREATE TABLE `game_endorsements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `endorserType` enum('player','project') NOT NULL,
  `endorserId` int NOT NULL,
  `endorsedType` enum('player','project') NOT NULL,
  `endorsedId` int NOT NULL,
  `note` varchar(280) DEFAULT NULL,
  `status` enum('active','revoked','endorsed_entity_flagged') DEFAULT 'active',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_endorsement` (`endorserType`,`endorserId`,`endorsedType`,`endorsedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `game_flags`;
CREATE TABLE `game_flags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `flaggerType` enum('player','project') NOT NULL,
  `flaggerId` int NOT NULL,
  `flaggedType` enum('player','project') NOT NULL,
  `flaggedId` int NOT NULL,
  `reason` enum('misrepresentation','unresponsive','safety_concern','harassment','other') NOT NULL,
  `description` text,
  `status` enum('pending','investigating','dismissed','actioned') DEFAULT 'pending',
  `adminNotes` text,
  `resolvedAt` timestamp NULL DEFAULT NULL,
  `cascadePenaltiesApplied` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_flag` (`flaggerType`,`flaggerId`,`flaggedType`,`flaggedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `game_seasons`;
CREATE TABLE `game_seasons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `status` enum('upcoming','active','closing','archived') DEFAULT 'upcoming',
  `harvestCompleted` tinyint(1) DEFAULT '0',
  `compostingCompleted` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `game_variable_history`;
CREATE TABLE `game_variable_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `variableId` int NOT NULL,
  `previousValue` decimal(20,6) NOT NULL,
  `newValue` decimal(20,6) NOT NULL,
  `changedBy` int NOT NULL,
  `reason` text,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `proposalId` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `game_variables`;
CREATE TABLE `game_variables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `subcategory` varchar(50) NOT NULL,
  `key` varchar(100) NOT NULL,
  `displayName` varchar(200) NOT NULL,
  `description` text,
  `value` decimal(20,6) NOT NULL,
  `valueType` enum('integer','decimal','percentage','boolean','multiplier') NOT NULL,
  `minValue` decimal(20,6) DEFAULT NULL,
  `maxValue` decimal(20,6) DEFAULT NULL,
  `defaultValue` decimal(20,6) NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updatedBy` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `unit` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `general_inquiries`;
CREATE TABLE `general_inquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `status` enum('new','contacted','in_progress','completed','archived') NOT NULL DEFAULT 'new',
  `pathType` enum('land_partner','create_with_regens','alliance','finance','live','role','something_else') NOT NULL,
  `email` varchar(320) NOT NULL,
  `fullName` varchar(255) DEFAULT NULL,
  `projectUrl` varchar(512) DEFAULT NULL,
  `projectInspiration` text,
  `projectProgress` text,
  `allianceOrganizations` text,
  `otherOrganization` varchar(255) DEFAULT NULL,
  `organizationUrl` varchar(512) DEFAULT NULL,
  `partnershipDescription` text,
  `landProjects` text,
  `otherProject` varchar(255) DEFAULT NULL,
  `roleArchetypes` text,
  `roleInterest` text,
  `uniqueContribution` text,
  `additionalNotes` text,
  `referralSource` varchar(255) DEFAULT NULL,
  `newsletterOptIn` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `whyIdeal` text,
  `seasonDeliverables` text,
  `cvWebsite` varchar(512) DEFAULT NULL,
  `capitalTypes` text,
  `allianceSupportCategories` text,
  `otherAllianceSupport` varchar(255) DEFAULT NULL,
  `allianceSupportDescription` text,
  `valueContribution` text,
  `whyIdealFit` text,
  `organizationalCapital` text,
  `organizationRole` text,
  `organizationScope` varchar(50) DEFAULT NULL,
  `organizationLatitude` double DEFAULT NULL,
  `organizationLongitude` double DEFAULT NULL,
  `organizationCountry` varchar(100) DEFAULT NULL,
  `internalNotes` text,
  `videoPitchUrl` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gifts`;
CREATE TABLE `gifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` varchar(64) NOT NULL,
  `description` text NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `glossary_terms`;
CREATE TABLE `glossary_terms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `term` varchar(255) NOT NULL,
  `definition` text NOT NULL,
  `sourceThreadUrl` text,
  `proposedAt` timestamp NOT NULL DEFAULT (now()),
  `approvedAt` timestamp NULL DEFAULT NULL,
  `approvedBy` int DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'proposed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `glossary_terms_term_unique` (`term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govBioregionHealth`;
CREATE TABLE `govBioregionHealth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bioregionId` int NOT NULL,
  `dimension` varchar(80) NOT NULL,
  `ringType` enum('ecological','social') NOT NULL DEFAULT 'ecological',
  `currentValue` decimal(10,2) NOT NULL DEFAULT '0.00',
  `thresholdMin` decimal(10,2) NOT NULL DEFAULT '0.00',
  `thresholdMax` decimal(10,2) NOT NULL DEFAULT '100.00',
  `unit` varchar(40) DEFAULT '%',
  `lastUpdatedBy` int DEFAULT NULL,
  `computedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_health` (`bioregionId`,`dimension`),
  KEY `idx_bio` (`bioregionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govComments`;
CREATE TABLE `govComments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `authorId` int NOT NULL,
  `parentId` int DEFAULT NULL,
  `body` text NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_proposal` (`proposalId`),
  KEY `idx_parent` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govDashboardPrefs`;
CREATE TABLE `govDashboardPrefs` (
  `userId` int NOT NULL,
  `primaryBioregionId` int DEFAULT NULL,
  `dashboardLayout` enum('compact','full') DEFAULT 'compact',
  `notificationPrefs` json DEFAULT NULL,
  `hasSeenWelcome` tinyint DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govDelegationHistory`;
CREATE TABLE `govDelegationHistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delegatorId` int NOT NULL,
  `delegateId` int NOT NULL,
  `proposalId` int DEFAULT NULL,
  `stance` varchar(20) DEFAULT NULL,
  `appliedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delegator` (`delegatorId`),
  KEY `idx_proposal` (`proposalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govPassportQuests`;
CREATE TABLE `govPassportQuests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `questSlug` varchar(80) NOT NULL,
  `questTitle` varchar(300) NOT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `evidenceUrl` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pq` (`userId`,`questSlug`),
  KEY `idx_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govProposals`;
CREATE TABLE `govProposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `authorId` int NOT NULL,
  `title` varchar(500) NOT NULL,
  `body` text NOT NULL,
  `status` enum('draft','discussion','polling','staged','sent_to_hypha','ratified','declined','withdrawn') DEFAULT 'draft',
  `decisionMethod` enum('consent','advice','consensus','mandate') DEFAULT 'consent',
  `track` enum('fund','game','operational') DEFAULT 'game',
  `urgentTag` tinyint DEFAULT '0',
  `bioregionId` int DEFAULT NULL,
  `seasonId` int DEFAULT NULL,
  `sourceForumThreadId` int DEFAULT NULL,
  `minDiscussionDays` int DEFAULT '3',
  `pollingDurationDays` int DEFAULT '5',
  `discussionOpenedAt` timestamp NULL DEFAULT NULL,
  `pollingOpenedAt` timestamp NULL DEFAULT NULL,
  `pollingClosesAt` timestamp NULL DEFAULT NULL,
  `outcomeText` text,
  `outcomeAuthorId` int DEFAULT NULL,
  `hyphaProposalId` varchar(255) DEFAULT NULL,
  `hyphaBridgeKey` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_tenant_status` (`tenantId`,`status`),
  KEY `idx_author` (`authorId`),
  KEY `idx_bioregion` (`bioregionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `govVotes`;
CREATE TABLE `govVotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `voterId` int NOT NULL,
  `stance` enum('agree','disagree','abstain','block') NOT NULL,
  `reason` text,
  `delegatedFromId` int DEFAULT NULL,
  `weight` int DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote` (`proposalId`,`voterId`),
  KEY `idx_proposal` (`proposalId`),
  KEY `idx_voter` (`voterId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceAgreements`;
CREATE TABLE `governanceAgreements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `forumPostDecisionId` int DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `text` mediumtext NOT NULL,
  `ratifiedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sunsetAt` timestamp NULL DEFAULT NULL,
  `renewalThreadId` int DEFAULT NULL,
  `status` enum('active','sunsetted','superseded','withdrawn') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ga_tenant` (`tenantId`,`status`),
  KEY `idx_ga_sunset` (`sunsetAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceBackField`;
CREATE TABLE `governanceBackField` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `forumPostId` int DEFAULT NULL,
  `proposerId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `summary` text NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `status` enum('parked','reviewing','promoted','retired') NOT NULL DEFAULT 'parked',
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` int DEFAULT NULL,
  `promotedToDecisionId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gbf_tenant_status` (`tenantId`,`status`),
  KEY `idx_gbf_proposer` (`proposerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceDelegations`;
CREATE TABLE `governanceDelegations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delegatorId` int NOT NULL,
  `delegateId` int NOT NULL,
  `topicTags` json NOT NULL,
  `tenantId` int DEFAULT NULL,
  `revokedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gd_delegator` (`delegatorId`,`revokedAt`),
  KEY `idx_gd_delegate` (`delegateId`,`revokedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governancePreMortemConcerns`;
CREATE TABLE `governancePreMortemConcerns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forumPostDecisionId` int NOT NULL,
  `authorId` int NOT NULL,
  `concernText` varchar(800) NOT NULL,
  `agreeCount` int NOT NULL DEFAULT '0',
  `proposerResponse` text,
  `proposerRespondedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gpmc_decision` (`forumPostDecisionId`,`agreeCount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceTenantMembers`;
CREATE TABLE `governanceTenantMembers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('member','moderator','steward','admin') NOT NULL DEFAULT 'member',
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `leftAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gtm` (`tenantId`,`userId`),
  KEY `idx_gtm_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceTenants`;
CREATE TABLE `governanceTenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(80) NOT NULL,
  `tenantType` enum('platform','bioregion','land_project','organization') NOT NULL,
  `displayName` varchar(200) NOT NULL,
  `description` text,
  `logoUrl` varchar(400) DEFAULT NULL,
  `bannerUrl` varchar(400) DEFAULT NULL,
  `accentColor` varchar(20) DEFAULT NULL,
  `hyphaDhoSlug` varchar(80) DEFAULT NULL,
  `parentTenantId` int DEFAULT NULL,
  `ownerUserId` int NOT NULL,
  `allowedBioregions` json DEFAULT NULL,
  `config` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_gt_type` (`tenantType`),
  KEY `idx_gt_parent` (`parentTenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governanceTokenLedger`;
CREATE TABLE `governanceTokenLedger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `tenantId` int NOT NULL,
  `amount` decimal(30,6) NOT NULL,
  `type` enum('harvest','gratitude','grant','expense','adjustment','claim') NOT NULL,
  `sourceRef` varchar(120) DEFAULT NULL,
  `description` varchar(400) DEFAULT NULL,
  `claimedAt` timestamp NULL DEFAULT NULL,
  `hyphaBridgeId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gtl_user_tenant` (`userId`,`tenantId`),
  KEY `idx_gtl_unclaimed` (`userId`,`claimedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governance_executions`;
CREATE TABLE `governance_executions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `kind` enum('variable_change','bounds_change','content','feature') NOT NULL,
  `payload` json NOT NULL,
  `status` enum('pending','applied','shipping','shipped','paused','failed','rolled_back') NOT NULL DEFAULT 'pending',
  `detail` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `executedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_execution_proposal` (`proposalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitudeLog`;
CREATE TABLE `gratitudeLog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int NOT NULL,
  `recipientId` int NOT NULL,
  `message` varchar(500) NOT NULL,
  `sourceType` varchar(32) DEFAULT NULL,
  `sourceId` int DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `cycleId` int DEFAULT NULL,
  `weight` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ack_per_cycle` (`senderId`,`recipientId`,`cycleId`),
  KEY `grat_sender` (`senderId`,`createdAt`),
  KEY `grat_recipient` (`recipientId`,`createdAt`),
  KEY `idx_grat_cycle_recipient` (`cycleId`,`recipientId`),
  KEY `idx_grat_cycle_sender` (`cycleId`,`senderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitude_budgets`;
CREATE TABLE `gratitude_budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `seasonId` int NOT NULL,
  `totalBudget` int NOT NULL,
  `spent` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_season` (`userId`,`seasonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitude_cycle_budgets`;
CREATE TABLE `gratitude_cycle_budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `cycleId` int NOT NULL,
  `tier` varchar(16) NOT NULL,
  `baseBudget` int NOT NULL,
  `multiplier` decimal(4,2) NOT NULL,
  `streakCycles` int NOT NULL DEFAULT '0',
  `streakBonus` decimal(4,3) NOT NULL DEFAULT '0.000',
  `effectiveBudget` int NOT NULL,
  `uniqueRecipients` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_cycle` (`userId`,`cycleId`),
  KEY `idx_grat_budget_cycle` (`cycleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitude_cycles`;
CREATE TABLE `gratitude_cycles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycleNumber` int NOT NULL,
  `startsAt` timestamp NOT NULL,
  `endsAt` timestamp NOT NULL,
  `poolPerCycle` int NOT NULL DEFAULT '10000',
  `status` varchar(16) NOT NULL DEFAULT 'open',
  `distributedAt` timestamp NULL DEFAULT NULL,
  `totalWeight` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cycle_number` (`cycleNumber`),
  KEY `idx_gratitude_cycle_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitude_distributions`;
CREATE TABLE `gratitude_distributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycleId` int NOT NULL,
  `userId` int NOT NULL,
  `weightReceived` double NOT NULL,
  `poolShare` decimal(18,6) NOT NULL,
  `creditedAmount` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_dist` (`cycleId`,`userId`),
  KEY `idx_grat_dist_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gratitude_transactions`;
CREATE TABLE `gratitude_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int NOT NULL,
  `receiverId` int NOT NULL,
  `amount` int NOT NULL DEFAULT '1',
  `message` varchar(280) NOT NULL,
  `seasonId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grat_sender` (`senderId`),
  KEY `idx_grat_receiver` (`receiverId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `historicalClaims`;
CREATE TABLE `historicalClaims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `claimType` enum('individual','organization') COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orgDescription` text COLLATE utf8mb4_unicode_ci,
  `formsOfCapital` json NOT NULL,
  `duration` enum('under_1_year','1_3_years','3_5_years','5_10_years','10_plus_years') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reach` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tangibleOutputs` json NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `evidenceLinks` json NOT NULL,
  `whatsAlive` text COLLATE utf8mb4_unicode_ci,
  `suggestedTier` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `suggestedTierUsd` int DEFAULT NULL,
  `suggestedTierTokens` bigint DEFAULT NULL,
  `contributorOverride` enum('accept','higher','lower') COLLATE utf8mb4_unicode_ci DEFAULT 'accept',
  `overrideReason` text COLLATE utf8mb4_unicode_ci,
  `routeToToolsLibrary` tinyint(1) DEFAULT '0',
  `routeToLocalScale` tinyint(1) DEFAULT '0',
  `routeToGovernance` tinyint(1) DEFAULT '0',
  `routeToMentoring` tinyint(1) DEFAULT '0',
  `routeToFundPathway` tinyint(1) DEFAULT '0',
  `status` enum('draft','submitted','under_review','approved','adjusted','flagged','ratified','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `currentStep` int NOT NULL DEFAULT '1',
  `reviewerId` int DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `reviewDecision` enum('confirmed','adjusted','flagged') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewNote` text COLLATE utf8mb4_unicode_ci,
  `adjustedTier` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adjustedTierUsd` int DEFAULT NULL,
  `adjustedTierTokens` bigint DEFAULT NULL,
  `finalTier` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finalTierUsd` int DEFAULT NULL,
  `finalTierTokens` bigint DEFAULT NULL,
  `ratifiedAt` datetime DEFAULT NULL,
  `proposalPartyId` int DEFAULT NULL,
  `improvementSuggestion` text COLLATE utf8mb4_unicode_ci,
  `improvementPostedToForum` tinyint(1) DEFAULT '0',
  `improvementForumPostId` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submittedAt` datetime DEFAULT NULL,
  `publishedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_claims_status` (`status`),
  KEY `idx_claims_user` (`userId`),
  KEY `idx_claims_type` (`claimType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `hyphaBridges`;
CREATE TABLE `hyphaBridges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bridgeKey` varchar(16) NOT NULL,
  `source` enum('loomio_decision','crowdpool','contribution_claim','fund_grant','expense','exit','redeem_tokens','quest_completion','other') NOT NULL,
  `sourceId` varchar(80) NOT NULL,
  `targetDhoSlug` varchar(80) NOT NULL,
  `formKind` enum('propose_contribution','deploy_funds','pay_for_expenses','membership_exit','buy_hypha_tokens','redeem_tokens','activate_spaces','change_entry_method','change_voting_method','space_settings_transparency','space_to_space_membership') NOT NULL,
  `initiatorUserId` int NOT NULL,
  `payload` json NOT NULL,
  `status` enum('created','handoff_sent','on_chain_detected','passed','failed','cancelled') NOT NULL DEFAULT 'created',
  `hyphaProposalId` varchar(80) DEFAULT NULL,
  `hyphaTxHash` varchar(80) DEFAULT NULL,
  `hyphaPassedAt` timestamp NULL DEFAULT NULL,
  `hyphaTokenAmount` decimal(30,6) DEFAULT NULL,
  `hyphaTokenSymbol` varchar(20) DEFAULT NULL,
  `hyphaRecipientWallet` varchar(60) DEFAULT NULL,
  `basescanUrl` varchar(200) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bridgeKey` (`bridgeKey`),
  KEY `idx_hb_source` (`source`,`sourceId`),
  KEY `idx_hb_status` (`status`),
  KEY `idx_hb_target` (`targetDhoSlug`),
  KEY `idx_hb_initiator` (`initiatorUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `investor_inquiries`;
CREATE TABLE `investor_inquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `status` enum('new','contacted','in_discussion','committed','declined','archived') NOT NULL DEFAULT 'new',
  `fullName` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `investorType` enum('individual','family_office','foundation','impact_fund','institutional','other') DEFAULT NULL,
  `investmentRange` enum('under_250k','250k_1m','1m_5m','5m_10m','over_10m','under_10k','10k_50k','50k_100k','100k_500k','500k_1m','over_1m') DEFAULT NULL,
  `investmentTimeline` enum('immediate','3_months','6_months','1_year','exploring') DEFAULT NULL,
  `primaryInterest` enum('land_projects','alliance_fund','both') DEFAULT NULL,
  `geographicPreference` text,
  `sectorInterests` text,
  `investmentExperience` text,
  `motivations` text,
  `impactGoals` text,
  `questionsForTeam` text,
  `referralSource` varchar(255) DEFAULT NULL,
  `documentsUrl` text,
  `additionalNotes` text,
  `preferredContact` enum('email','phone','video_call') NOT NULL DEFAULT 'email',
  `newsletterOptIn` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `internalNotes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `knowledge_map_entries`;
CREATE TABLE `knowledge_map_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoryId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `summary` text,
  `url` varchar(500) DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `suggestedByAI` tinyint NOT NULL DEFAULT '0',
  `approvedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `letter_of_intent`;
CREATE TABLE `letter_of_intent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `status` enum('pending','confirmed','withdrawn','converted') NOT NULL DEFAULT 'pending',
  `fullName` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `pledgeAmount` int NOT NULL,
  `investorType` enum('individual','family_office','foundation','impact_fund','institutional','other') NOT NULL,
  `investmentTimeline` enum('immediate','3_months','6_months','1_year','flexible') NOT NULL DEFAULT 'flexible',
  `geographicPreference` text,
  `sectorInterests` text,
  `motivations` text,
  `questionsForTeam` text,
  `additionalNotes` text,
  `referralSource` varchar(255) DEFAULT NULL,
  `submittedAt` timestamp NOT NULL DEFAULT (now()),
  `confirmedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `local_food_applications`;
CREATE TABLE `local_food_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producerName` varchar(200) NOT NULL,
  `contactEmail` varchar(200) NOT NULL,
  `contactName` varchar(200) NOT NULL,
  `bioregionId` int DEFAULT NULL,
  `locationLat` double DEFAULT NULL,
  `locationLng` double DEFAULT NULL,
  `description` text,
  `productsOffered` json DEFAULT NULL,
  `regenerativePractices` text,
  `websiteUrl` varchar(500) DEFAULT NULL,
  `localScaleProfileUrl` varchar(500) DEFAULT NULL,
  `status` enum('submitted','under_review','approved','active','declined') DEFAULT 'submitted',
  `communityRatingsCount` int DEFAULT '0',
  `regenerativeScore` double DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `lunar_cycles`;
CREATE TABLE `lunar_cycles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `seasonId` int DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `status` enum('upcoming','active','completed') DEFAULT 'upcoming',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `needs`;
CREATE TABLE `needs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` varchar(64) NOT NULL,
  `description` text NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `newsletter_subscribers`;
CREATE TABLE `newsletter_subscribers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `source` enum('homepage','investor_form','connect_form','apply_form','footer','exit_intent','other') NOT NULL DEFAULT 'other',
  `isActive` int NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `notifyRecordings` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notificationPreferences`;
CREATE TABLE `notificationPreferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicationSubmissions` tinyint NOT NULL DEFAULT '1',
  `investorInquiries` tinyint NOT NULL DEFAULT '1',
  `loiSubmissions` tinyint NOT NULL DEFAULT '1',
  `campaignContributions` tinyint NOT NULL DEFAULT '1',
  `newsletterSignups` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `allianceRequests` tinyint NOT NULL DEFAULT '1',
  `workWithRegens` tinyint NOT NULL DEFAULT '1',
  `roleRequests` tinyint NOT NULL DEFAULT '1',
  `applicationEmails` text,
  `investorEmails` text,
  `allianceEmails` text,
  `workWithRegensEmails` text,
  `roleRequestEmails` text,
  `loiEmails` text,
  `campaignEmails` text,
  `newsletterEmails` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('forum_reply','quest_complete','fund_update','vouch','mention','gratitude','reaction_milestone','guide_reply','elder_reply','thread_followed_activity','governance_stage','system','contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','claim_complete','claim_failed') NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `link` varchar(500) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actorId` int DEFAULT NULL,
  `postId` int DEFAULT NULL,
  `replyId` int DEFAULT NULL,
  `campaignId` int DEFAULT NULL,
  `contributionId` int DEFAULT NULL,
  `emailedAt` timestamp NULL DEFAULT NULL,
  `pushedAt` timestamp NULL DEFAULT NULL,
  `dedupeKey` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notifications_dedupe_uq` (`dedupeKey`),
  KEY `idx_player_unread` (`userId`,`isRead`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `org_claims`;
CREATE TABLE `org_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `orgType` enum('land_project','alliance_org') NOT NULL,
  `orgId` varchar(255) NOT NULL,
  `orgName` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `formData` json DEFAULT NULL,
  `adminNotes` text,
  `submittedAt` timestamp NOT NULL DEFAULT (now()),
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `rssPromptDismissed` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `organisation_ratings`;
CREATE TABLE `organisation_ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `raterId` int NOT NULL,
  `organisationId` int NOT NULL,
  `soilScore` tinyint DEFAULT NULL,
  `biodiversityScore` tinyint DEFAULT NULL,
  `waterScore` tinyint DEFAULT NULL,
  `chemicalFreeScore` tinyint DEFAULT NULL,
  `communityScore` tinyint DEFAULT NULL,
  `workerWellbeingScore` tinyint DEFAULT NULL,
  `overallScore` double DEFAULT NULL,
  `note` text,
  `seasonId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `organisations`;
CREATE TABLE `organisations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orgId` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(500) DEFAULT NULL,
  `description` text,
  `forumPostId` int DEFAULT NULL,
  `status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `organisations_orgId_unique` (`orgId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pending_members`;
CREATE TABLE `pending_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `email` varchar(255) NOT NULL,
  `inviteToken` varchar(64) NOT NULL,
  `status` enum('pending','accepted') NOT NULL DEFAULT 'pending',
  `userId` int DEFAULT NULL,
  `invitedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acceptedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pending_members_token_idx` (`inviteToken`),
  KEY `pending_members_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `play_adoptions`;
CREATE TABLE `play_adoptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playId` int NOT NULL,
  `userId` int NOT NULL,
  `projectName` varchar(300) DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `play_categories`;
CREATE TABLE `play_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `play_category_map`;
CREATE TABLE `play_category_map` (
  `playId` int NOT NULL,
  `categoryId` int NOT NULL,
  PRIMARY KEY (`playId`,`categoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `play_endorsements`;
CREATE TABLE `play_endorsements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playId` int NOT NULL,
  `userId` int NOT NULL,
  `comment` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_endorsement` (`playId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `play_views`;
CREATE TABLE `play_views` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playId` int NOT NULL,
  `userId` int DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `viewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `player_alliances`;
CREATE TABLE `player_alliances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playerId` int NOT NULL,
  `allianceType` enum('land_project','investor','partner') NOT NULL,
  `allianceName` varchar(200) NOT NULL,
  `allianceId` int DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `joinedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_player` (`playerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `player_capital_scores`;
CREATE TABLE `player_capital_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `intellectual` int NOT NULL DEFAULT '0',
  `social` int NOT NULL DEFAULT '0',
  `material` int NOT NULL DEFAULT '0',
  `financial` int NOT NULL DEFAULT '0',
  `living` int NOT NULL DEFAULT '0',
  `cultural` int NOT NULL DEFAULT '0',
  `spiritual` int NOT NULL DEFAULT '0',
  `experiential` int NOT NULL DEFAULT '0',
  `healthVital` int NOT NULL DEFAULT '0',
  `totalScore` int NOT NULL DEFAULT '0',
  `seasonsCompleted` int NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_capital` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `player_contributions`;
CREATE TABLE `player_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profileId` int NOT NULL,
  `userId` int NOT NULL,
  `capitalType` enum('financial','social','cultural','living','intellectual','experiential','material','spiritual','health') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `estimatedValue` int DEFAULT NULL,
  `projectName` varchar(255) DEFAULT NULL,
  `evidenceUrl` varchar(512) DEFAULT NULL,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verifiedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `player_paths`;
CREATE TABLE `player_paths` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `path` enum('investor','land_project','ally','player') NOT NULL,
  `declaredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `coCreatorEarnedAt` timestamp NULL DEFAULT NULL,
  `stewardEarnedAt` timestamp NULL DEFAULT NULL,
  `coCreatorBonusClaimedAt` timestamp NULL DEFAULT NULL,
  `stewardBonusClaimedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_paths_user_path_uniq` (`userId`,`path`),
  KEY `player_paths_userId_idx` (`userId`),
  KEY `player_paths_path_idx` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `player_profiles`;
CREATE TABLE `player_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `displayName` varchar(255) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `bio` text,
  `avatarUrl` varchar(512) DEFAULT NULL,
  `baseAccountName` varchar(255) DEFAULT NULL,
  `hyphaProfileUrl` varchar(512) DEFAULT NULL,
  `walletAddress` varchar(255) DEFAULT NULL,
  `badges` text,
  `questsCompleted` text,
  `totalContributionValue` int NOT NULL DEFAULT '0',
  `rvoiceBalance` int NOT NULL DEFAULT '0',
  `rgenBalance` int NOT NULL DEFAULT '0',
  `lastTokenSync` timestamp NULL DEFAULT NULL,
  `isVerified` int NOT NULL DEFAULT '0',
  `isActive` int NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `blockchainVerifiedAt` timestamp NULL DEFAULT NULL,
  `verificationTxHash` varchar(66) DEFAULT NULL,
  `emailDigestFrequency` enum('never','weekly','monthly','seasonal') NOT NULL DEFAULT 'monthly',
  `collaborationStatus` text,
  `dreamingOf` text,
  `bioregionId` int DEFAULT NULL,
  `locationLat` double DEFAULT NULL,
  `locationLng` double DEFAULT NULL,
  `locationPrecision` enum('exact','city','region','hidden') DEFAULT 'region',
  `locationLabel` varchar(255) DEFAULT NULL,
  `locationNomadic` tinyint NOT NULL DEFAULT '0',
  `locationEarth` tinyint NOT NULL DEFAULT '0',
  `lunarStreak` int NOT NULL DEFAULT '0',
  `lastQuestCompletedAt` datetime DEFAULT NULL,
  `currentLunarCycleStart` date DEFAULT NULL,
  `currentlyWorkingOn` varchar(200) DEFAULT NULL,
  `notificationPrefs` json DEFAULT NULL,
  `bannerUrl` varchar(512) DEFAULT NULL,
  `contributionScoreRaw` int DEFAULT '0',
  `trustScore` decimal(5,3) DEFAULT '1.000',
  `trustScoreRaw` int DEFAULT '0',
  `scoreLastCalculatedAt` timestamp NULL DEFAULT NULL,
  `trustLastCalculatedAt` timestamp NULL DEFAULT NULL,
  `currentTier` varchar(50) DEFAULT 'Seedling',
  `contributionScore` int DEFAULT '0',
  `citizenshipTier` enum('explorer','co_creator','steward','sage') NOT NULL DEFAULT 'explorer',
  `citizenshipTierUpdatedAt` timestamp NULL DEFAULT NULL,
  `graceStartedAt` timestamp NULL DEFAULT NULL,
  `seasonsCompleted` int NOT NULL DEFAULT '0',
  `capitalScoresJson` json DEFAULT NULL,
  `capitalScoresUpdatedAt` timestamp NULL DEFAULT NULL,
  `rcvoicePublic` int NOT NULL DEFAULT '0',
  `rcvoicePrivate` int NOT NULL DEFAULT '0',
  `rgvoicePrivate` int NOT NULL DEFAULT '0',
  `rcivicsPublic` int NOT NULL DEFAULT '0',
  `rcivicsPrivate` int NOT NULL DEFAULT '0',
  `regenPrivate` int NOT NULL DEFAULT '0',
  `githubHandle` varchar(255) DEFAULT NULL,
  `githubId` int DEFAULT NULL,
  `githubLinkedAt` timestamp NULL DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `forumLocation` varchar(255) DEFAULT NULL,
  `preferredLanguage` varchar(10) DEFAULT 'en',
  `reputation` int NOT NULL DEFAULT '0',
  `onboardingComplete` tinyint NOT NULL DEFAULT '0',
  `forumLastActiveAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `player_profiles_contributionScore_idx` (`contributionScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `plays`;
CREATE TABLE `plays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(300) NOT NULL,
  `slug` varchar(300) NOT NULL,
  `creatorProjectName` varchar(300) DEFAULT NULL,
  `creatorUserId` int DEFAULT NULL,
  `summary` text,
  `coverImageUrl` varchar(500) DEFAULT NULL,
  `websiteUrl` varchar(500) DEFAULT NULL,
  `pricingModel` enum('free','open_source','paid') DEFAULT 'open_source',
  `priceRegenTokens` int DEFAULT NULL,
  `externalPaymentUrl` varchar(500) DEFAULT NULL,
  `externalPriceLabel` varchar(100) DEFAULT NULL,
  `scale` enum('small','medium','large') DEFAULT 'medium',
  `communityType` varchar(100) DEFAULT NULL,
  `sectionIdentity` text,
  `sectionGovernance` text,
  `sectionEconomics` text,
  `sectionLegal` text,
  `sectionRoles` text,
  `sectionSeasons` text,
  `sectionLandEcology` text,
  `sectionAgreements` text,
  `sectionConflict` text,
  `sectionHealth` text,
  `sectionEducation` text,
  `sectionCulture` text,
  `sectionExternalRelations` text,
  `sectionScaling` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `submittedBy` int DEFAULT NULL,
  `approvedBy` int DEFAULT NULL,
  `totalViews` int DEFAULT '0',
  `totalAdoptions` int DEFAULT '0',
  `forumThreadId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `postReactions`;
CREATE TABLE `postReactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `replyId` int DEFAULT NULL,
  `emoji` varchar(8) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reactionWeight` decimal(5,2) DEFAULT '1.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reaction` (`userId`,`postId`,`replyId`,`emoji`),
  KEY `postId` (`postId`),
  KEY `replyId` (`replyId`),
  CONSTRAINT `postReactions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postReactions_ibfk_2` FOREIGN KEY (`postId`) REFERENCES `forumPosts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postReactions_ibfk_3` FOREIGN KEY (`replyId`) REFERENCES `forumReplies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `profile_merge_conflicts`;
CREATE TABLE `profile_merge_conflicts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `field` varchar(64) NOT NULL,
  `playerProfilesValue` text,
  `userProfilesValue` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `project_connections`;
CREATE TABLE `project_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postAId` int NOT NULL,
  `postBId` int NOT NULL,
  `connectionType` varchar(32) NOT NULL,
  `note` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `project_join_requests`;
CREATE TABLE `project_join_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submitterName` varchar(255) NOT NULL,
  `submitterEmail` varchar(320) NOT NULL,
  `submitterMessage` text,
  `targetType` enum('land_project','alliance_org') NOT NULL,
  `targetId` varchar(255) NOT NULL,
  `targetName` varchar(255) NOT NULL,
  `stewardUserId` int DEFAULT NULL,
  `status` enum('pending','reviewed','accepted','rejected') NOT NULL DEFAULT 'pending',
  `connectInquiryId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `proposalParties`;
CREATE TABLE `proposalParties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduledAt` datetime NOT NULL,
  `season` int NOT NULL DEFAULT '1',
  `videoLink` text COLLATE utf8mb4_unicode_ci,
  `recordingLink` text COLLATE utf8mb4_unicode_ci,
  `status` enum('scheduled','in_progress','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `proposal_signals`;
CREATE TABLE `proposal_signals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `userId` int NOT NULL,
  `score` tinyint NOT NULL,
  `moveNote` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_proposal_signal` (`proposalId`,`userId`),
  KEY `idx_signal_proposal` (`proposalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `proposal_synthesis`;
CREATE TABLE `proposal_synthesis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `pros` json DEFAULT NULL,
  `cons` json DEFAULT NULL,
  `steelman` text,
  `steelmanAddressed` json DEFAULT NULL,
  `summary` text,
  `sourceReplyCount` int NOT NULL DEFAULT '0',
  `changelog` json DEFAULT NULL,
  `lastSyncedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_synthesis_proposal` (`proposalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `proposal_updates`;
CREATE TABLE `proposal_updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `authorId` int NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `proposal_votes`;
CREATE TABLE `proposal_votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposalId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_proposal_vote` (`proposalId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `proposals`;
CREATE TABLE `proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `category` enum('fund_allocation','game_variable','new_quest','food_economy','platform_feature','community','bff_initiative','partnership','community_agreement','other') NOT NULL,
  `status` enum('idea','draft','signaling','threshold_reached','in_governance','passed','implemented','declined') DEFAULT 'idea',
  `templateType` varchar(50) DEFAULT NULL,
  `forumThreadId` int DEFAULT NULL,
  `signalVoteCount` int DEFAULT '0',
  `bioregionId` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `aim` varchar(300) DEFAULT NULL,
  `lane` enum('full','minor') NOT NULL DEFAULT 'full',
  `lastCallStartedAt` timestamp NULL DEFAULT NULL,
  `restingSince` timestamp NULL DEFAULT NULL,
  `readyToLaunchAt` timestamp NULL DEFAULT NULL,
  `hyphaBridgeKey` varchar(32) DEFAULT NULL,
  `executionPayload` json DEFAULT NULL,
  `objectionLog` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proposals_author` (`authorId`),
  KEY `idx_proposals_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `push_subscriptions`;
CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `failureCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastSeenAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscriptions_endpoint_uq` (`endpoint`),
  KEY `push_subscriptions_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `questEndorsements`;
CREATE TABLE `questEndorsements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orgId` varchar(255) NOT NULL,
  `orgType` enum('land_project','alliance_org') NOT NULL,
  `questId` varchar(100) NOT NULL,
  `endorsementType` enum('recommended','required') NOT NULL DEFAULT 'recommended',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `questSuggestionVotes`;
CREATE TABLE `questSuggestionVotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suggestionId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `questSuggestions`;
CREATE TABLE `questSuggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('open','planned','in_progress','completed','declined') NOT NULL DEFAULT 'open',
  `voteCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `questForumThreadId` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quest_completions`;
CREATE TABLE `quest_completions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `questId` varchar(100) NOT NULL,
  `questTitle` varchar(255) NOT NULL,
  `artifactType` enum('photo','text','link','video') NOT NULL DEFAULT 'text',
  `artifactUrl` varchar(1000) DEFAULT NULL,
  `artifactText` text,
  `caption` varchar(500) DEFAULT NULL,
  `visibility` enum('public','private') NOT NULL DEFAULT 'public',
  `completedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `videoThumbnailUrl` varchar(1000) DEFAULT NULL,
  `videoDurationSeconds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quest_completions_userId_idx` (`userId`),
  KEY `quest_completions_visibility_completedAt_idx` (`visibility`,`completedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quest_journal`;
CREATE TABLE `quest_journal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playerId` int NOT NULL,
  `questId` int NOT NULL,
  `completedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reflection` text,
  `forumPostId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_player_date` (`playerId`,`completedAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quest_tier_assignments`;
CREATE TABLE `quest_tier_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tierId` int NOT NULL,
  `questId` varchar(100) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tier_quest` (`tierId`,`questId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quest_unlock_tiers`;
CREATE TABLE `quest_unlock_tiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `minimumPercentile` int NOT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `requiresRitesComplete` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `recordings`;
CREATE TABLE `recordings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `riversideId` varchar(255) NOT NULL,
  `riversideUrl` varchar(512) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `sessionDate` timestamp NULL DEFAULT NULL,
  `durationSeconds` int DEFAULT NULL,
  `youtubeUrl` varchar(512) DEFAULT NULL,
  `thumbnailUrl` varchar(512) DEFAULT NULL,
  `transcript` text,
  `aiSummary` text,
  `emailSent` tinyint NOT NULL DEFAULT '0',
  `forumPostId` int DEFAULT NULL,
  `featured` tinyint NOT NULL DEFAULT '0',
  `rawWebhook` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `youtubeVideoId` varchar(32) DEFAULT NULL,
  `recordingKind` enum('raw','edited') NOT NULL DEFAULT 'raw',
  `editedYoutubeUrl` varchar(512) DEFAULT NULL,
  `overview` text,
  `decisionsJson` json DEFAULT NULL,
  `actionItemsJson` json DEFAULT NULL,
  `chaptersJson` json DEFAULT NULL COMMENT 'Synthesize-pass chapters: array of tSeconds + title',
  `transcriptJson` json DEFAULT NULL COMMENT 'Timestamped transcript segments: array of start + text',
  PRIMARY KEY (`id`),
  UNIQUE KEY `recordings_riversideId_unique` (`riversideId`),
  UNIQUE KEY `youtubeVideoId` (`youtubeVideoId`),
  KEY `recordings_riversideId_idx` (`riversideId`),
  KEY `recordings_sessionDate_idx` (`sessionDate`),
  KEY `recordings_featured_idx` (`featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_token_ledger`;
CREATE TABLE `regen_token_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `userId` int DEFAULT NULL,
  `amount` int NOT NULL,
  `reason` enum('event_attendance','quest_completion','community_contribution','referral','admin_grant','adjustment') NOT NULL,
  `eventId` int DEFAULT NULL,
  `questId` varchar(100) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `regenTokenLedger_email_idx` (`email`),
  KEY `regenTokenLedger_reason_idx` (`reason`),
  KEY `regenTokenLedger_eventId_idx` (`eventId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tool_categories`;
CREATE TABLE `regen_tool_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `color` varchar(7) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tool_category_map`;
CREATE TABLE `regen_tool_category_map` (
  `toolId` int NOT NULL,
  `categoryId` int NOT NULL,
  PRIMARY KEY (`toolId`,`categoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tool_clicks`;
CREATE TABLE `regen_tool_clicks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `toolId` int NOT NULL,
  `userId` int DEFAULT NULL,
  `referrer` varchar(255) DEFAULT NULL,
  `clickedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clicks_tool` (`toolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tool_endorsements`;
CREATE TABLE `regen_tool_endorsements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `toolId` int NOT NULL,
  `userId` int NOT NULL,
  `questId` int DEFAULT NULL,
  `comment` text,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_endorsement` (`toolId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tool_mentions`;
CREATE TABLE `regen_tool_mentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `toolId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `detectedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `regen_tools`;
CREATE TABLE `regen_tools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `websiteUrl` varchar(500) NOT NULL,
  `logoUrl` varchar(500) DEFAULT NULL,
  `cardImageUrl` varchar(500) DEFAULT NULL,
  `shortSummary` text,
  `longDescription` text,
  `pricingModel` enum('free','freemium','paid','open_source') DEFAULT 'free',
  `gettingStartedUrl` varchar(500) DEFAULT NULL,
  `contactEmail` varchar(255) DEFAULT NULL,
  `isOpenSource` tinyint(1) DEFAULT '0',
  `isPhysical` tinyint(1) DEFAULT '0',
  `regions` json DEFAULT NULL,
  `integrations` json DEFAULT NULL,
  `problemStatements` json DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `submittedBy` int DEFAULT NULL,
  `approvedBy` int DEFAULT NULL,
  `totalClicks` int DEFAULT '0',
  `seasonSpotlight` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_tools_status` (`status`),
  KEY `idx_tools_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `reviewer_emails`;
CREATE TABLE `reviewer_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `notifyApplications` int NOT NULL DEFAULT '1',
  `notifyInvestors` int NOT NULL DEFAULT '1',
  `notifyInquiries` int NOT NULL DEFAULT '1',
  `inquiryTypes` text,
  `isActive` int NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reviewer_emails_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicationId` int NOT NULL,
  `reviewerId` int NOT NULL,
  `decision` enum('approve','reject','request_changes','pending') NOT NULL DEFAULT 'pending',
  `comments` text NOT NULL,
  `internalNotes` text,
  `alignmentScore` int DEFAULT NULL,
  `readinessScore` int DEFAULT NULL,
  `impactScore` int DEFAULT NULL,
  `teamScore` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roleHolders`;
CREATE TABLE `roleHolders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleSlug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleTitle` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` enum('game','fund') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'game',
  `circle` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `season` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `notifyEmail` tinyint NOT NULL DEFAULT '1',
  `notifyInApp` tinyint NOT NULL DEFAULT '1',
  `aliases` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pendingMemberId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `roleHolders_roleSlug_idx` (`roleSlug`),
  KEY `roleHolders_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `role_assignment_log`;
CREATE TABLE `role_assignment_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleSlug` varchar(64) NOT NULL,
  `action` enum('assigned','removed','invited') NOT NULL,
  `targetUserId` int DEFAULT NULL,
  `targetPendingId` int DEFAULT NULL,
  `targetLabel` varchar(200) DEFAULT NULL,
  `actorUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `role_assignment_log_slug_idx` (`roleSlug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(64) NOT NULL,
  `title` varchar(128) NOT NULL,
  `characterName` varchar(128) DEFAULT NULL,
  `tagline` varchar(500) DEFAULT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `characterImage` varchar(512) DEFAULT NULL,
  `sceneImage` varchar(512) DEFAULT NULL,
  `purpose` text,
  `circle` varchar(128) DEFAULT NULL,
  `powers` json DEFAULT NULL,
  `rights` json DEFAULT NULL,
  `responsibilities` json DEFAULT NULL,
  `domains` text,
  `band` int DEFAULT NULL,
  `tokenAward` varchar(128) DEFAULT NULL,
  `maxTokenAward` varchar(128) DEFAULT NULL,
  `hoursPerWeek` int DEFAULT NULL,
  `deliverables` json DEFAULT NULL,
  `seed` text,
  `harvest` text,
  `seasons` json DEFAULT NULL,
  `assignment` varchar(255) DEFAULT NULL,
  `color` varchar(32) DEFAULT NULL,
  `cardImagePosition` varchar(64) DEFAULT NULL,
  `kind` enum('game','fund') NOT NULL DEFAULT 'game',
  `specialContent` json DEFAULT NULL,
  `aliases` json DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `roles_kind_idx` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `saved_contributions`;
CREATE TABLE `saved_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `projectName` varchar(255) DEFAULT NULL,
  `targetAmount` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `contributorName` varchar(255) DEFAULT NULL,
  `contributorEmail` varchar(320) DEFAULT NULL,
  `immediateContributions` text,
  `futureContributions` text,
  `totalImmediateValue` int DEFAULT '0',
  `totalFutureValue` int DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `scheduled_emails`;
CREATE TABLE `scheduled_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipientEmail` varchar(320) NOT NULL,
  `recipientName` varchar(255) DEFAULT NULL,
  `subject` varchar(500) NOT NULL,
  `body` text NOT NULL,
  `inquiryType` varchar(50) DEFAULT 'general',
  `scheduledFor` timestamp NOT NULL,
  `status` enum('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seasonSnapshots`;
CREATE TABLE `seasonSnapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seasonId` int NOT NULL,
  `seasonName` varchar(100) DEFAULT NULL,
  `variables` json NOT NULL,
  `snapshotAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `season_idx` (`seasonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seasonal_council_members`;
CREATE TABLE `seasonal_council_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `councilId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('top_contributor','core_team','elected') NOT NULL,
  `attendedAt` datetime DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seasonal_councils`;
CREATE TABLE `seasonal_councils` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seasonId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `seatCount` int NOT NULL DEFAULT '7',
  `minimumPercentile` int NOT NULL DEFAULT '80',
  `requiresRitesComplete` tinyint(1) DEFAULT '1',
  `status` enum('forming','active','archived') DEFAULT 'forming',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seasonal_harvests`;
CREATE TABLE `seasonal_harvests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `seasonId` int NOT NULL,
  `questsCompleted` int DEFAULT '0',
  `tokensEarned` decimal(20,6) DEFAULT '0.000000',
  `harvestTokensReceived` decimal(20,6) DEFAULT '0.000000',
  `referralSignups` int DEFAULT '0',
  `referralConversions` int DEFAULT '0',
  `gratitudeReceived` int DEFAULT '0',
  `gratitudeSent` int DEFAULT '0',
  `contributionScoreStart` int DEFAULT '0',
  `contributionScoreEnd` int DEFAULT '0',
  `newTier` varchar(50) DEFAULT NULL,
  `viewedAt` timestamp NULL DEFAULT NULL,
  `sharedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_season_harvest` (`userId`,`seasonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seasonal_intentions`;
CREATE TABLE `seasonal_intentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `playerId` int NOT NULL,
  `season` varchar(20) NOT NULL,
  `year` int NOT NULL,
  `intention` varchar(300) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_season` (`playerId`,`season`,`year`),
  KEY `idx_season` (`season`,`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seeds_claims`;
CREATE TABLE `seeds_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seedsAccount` varchar(12) NOT NULL,
  `email` varchar(320) NOT NULL,
  `originalUsdTotal` double NOT NULL,
  `spentUsdAmount` double NOT NULL DEFAULT '0',
  `claimedUsdAmount` double NOT NULL,
  `regenAmount` double NOT NULL,
  `baseWalletAddress` varchar(42) NOT NULL,
  `isDispute` tinyint(1) NOT NULL DEFAULT '0',
  `disputeReason` text,
  `evidenceUrls` text,
  `status` enum('pending','approved','denied','flagged') NOT NULL DEFAULT 'pending',
  `adminNotes` text,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seedsAccount` (`seedsAccount`),
  KEY `seeds_claims_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `seeds_contributions`;
CREATE TABLE `seeds_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipientAccount` varchar(12) NOT NULL,
  `transactionId` varchar(16) NOT NULL,
  `date` timestamp NOT NULL,
  `usdValueRaw` int NOT NULL,
  `usdValue` double NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `seeds_contributions_account_idx` (`recipientAccount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_blackout_dates`;
CREATE TABLE `ship_blackout_dates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_blackout_start_idx` (`startDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_bookings`;
CREATE TABLE `ship_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `guests` int NOT NULL DEFAULT '1',
  `children` int NOT NULL DEFAULT '0',
  `status` enum('requested','approved','platform_pending','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'requested',
  `platformBookingRef` varchar(255) DEFAULT NULL,
  `dietCommitmentAt` timestamp NULL DEFAULT NULL,
  `waterDoctrineCommitmentAt` timestamp NULL DEFAULT NULL,
  `offeringDonationId` int DEFAULT NULL,
  `referredByUserId` int DEFAULT NULL,
  `isWinnerVoyage` tinyint(1) NOT NULL DEFAULT '0',
  `isGifted` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `orientationCompletedAt` timestamp NULL DEFAULT NULL,
  `orientationKeeperId` int DEFAULT NULL,
  `crewRoles` json DEFAULT NULL,
  `preSailLog` json DEFAULT NULL,
  `publicSlug` varchar(80) DEFAULT NULL,
  `homecomingHidden` tinyint(1) NOT NULL DEFAULT '0',
  `agreementAcceptedAt` timestamp NULL DEFAULT NULL,
  `agreementVersion` varchar(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_bookings_public_slug_uq` (`publicSlug`),
  KEY `ship_bookings_status_idx` (`status`),
  KEY `ship_bookings_start_idx` (`startDate`),
  KEY `ship_bookings_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_concierge_sessions`;
CREATE TABLE `ship_concierge_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `bookingId` int DEFAULT NULL,
  `profileAnswers` json DEFAULT NULL,
  `itinerary` json DEFAULT NULL,
  `messages` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_concierge_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_crew_list_signups`;
CREATE TABLE `ship_crew_list_signups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `userId` int DEFAULT NULL,
  `interests` json DEFAULT NULL,
  `source` varchar(120) DEFAULT NULL,
  `confirmedAt` timestamp NULL DEFAULT NULL,
  `unsubscribeToken` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `lastNotifiedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ship_crewlist_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_crew_profiles`;
CREATE TABLE `ship_crew_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `nominationId` int DEFAULT NULL,
  `displayName` varchar(200) NOT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `bio` text,
  `intent` text,
  `videoUrl` varchar(512) DEFAULT NULL,
  `isPublic` tinyint(1) NOT NULL DEFAULT '0',
  `sponsorGoalCents` int NOT NULL DEFAULT '210000',
  `sponsoredCents` int NOT NULL DEFAULT '0',
  `status` enum('draft','published','sponsored','sailed') NOT NULL DEFAULT 'draft',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_crew_user_uq` (`userId`),
  UNIQUE KEY `ship_crew_nomination_uq` (`nominationId`),
  KEY `ship_crew_status_idx` (`status`),
  KEY `ship_crew_public_idx` (`isPublic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_dataset_offers`;
CREATE TABLE `ship_dataset_offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orgName` varchar(200) NOT NULL,
  `contactName` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `description` text NOT NULL,
  `approxCount` int DEFAULT NULL,
  `dataUrl` varchar(512) DEFAULT NULL,
  `licenseNote` varchar(500) DEFAULT NULL,
  `status` enum('submitted','reviewing','imported','declined') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_dataset_offers_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_fleet_applications`;
CREATE TABLE `ship_fleet_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerName` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `rvYearMakeModel` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `message` text,
  `status` enum('submitted','in_conversation','joined') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_fleet_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_gear_checks`;
CREATE TABLE `ship_gear_checks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `phase` enum('boarding','return') NOT NULL,
  `items` json DEFAULT NULL,
  `completedByUserId` int DEFAULT NULL,
  `witnessedByKeeperId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ship_gear_booking_idx` (`bookingId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_giveaway_drawings`;
CREATE TABLE `ship_giveaway_drawings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `drawnByUserId` int DEFAULT NULL,
  `seed` bigint NOT NULL,
  `totalTickets` int NOT NULL,
  `roll` decimal(20,4) NOT NULL,
  `eligibleCount` int NOT NULL DEFAULT '0',
  `winnerUserId` int DEFAULT NULL,
  `winnerNominationId` int DEFAULT NULL,
  `winnerLabel` varchar(200) DEFAULT NULL,
  `audit` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_giveaway_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_inventory_items`;
CREATE TABLE `ship_inventory_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `category` enum('adventure','galley','water','power','connectivity','tools','magic','comfort','safety') NOT NULL DEFAULT 'comfort',
  `description` text,
  `lore` text,
  `iconUrl` varchar(512) DEFAULT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `storagePlace` varchar(200) DEFAULT NULL,
  `activityTags` json DEFAULT NULL,
  `isVisible` tinyint(1) NOT NULL DEFAULT '1',
  `isGearChecked` tinyint(1) NOT NULL DEFAULT '0',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_inventory_slug_uq` (`slug`),
  KEY `ship_inventory_category_idx` (`category`),
  KEY `ship_inventory_sort_idx` (`sortOrder`),
  KEY `ship_inventory_visible_idx` (`isVisible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_keeper_applications`;
CREATE TABLE `ship_keeper_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `experience` text,
  `availability` text,
  `status` enum('submitted','interviewing','accepted','declined') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_keeper_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_knowledge_chunks`;
CREATE TABLE `ship_knowledge_chunks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `system` enum('chassis','engine','propane','electrical','plumbing','slides','generator','appliances','starlink','water_filtration','tires_brakes','hvac','general') NOT NULL DEFAULT 'general',
  `sourceType` enum('manual','service_bulletin','forum_wisdom','resolved_case') NOT NULL DEFAULT 'manual',
  `sourceRef` varchar(512) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `isApproved` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ship_knowledge_system_idx` (`system`),
  KEY `ship_knowledge_approved_idx` (`isApproved`),
  FULLTEXT KEY `ship_knowledge_content_ft` (`title`,`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_location_flags`;
CREATE TABLE `ship_location_flags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `locationId` int NOT NULL,
  `userId` int DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `resolvedAt` timestamp NULL DEFAULT NULL,
  `resolvedByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_location_flags_location_idx` (`locationId`),
  KEY `ship_location_flags_open_idx` (`resolvedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_locations`;
CREATE TABLE `ship_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `type` enum('land_project','spring','waterfall','lake','geology','forest','food_forest','seed_site','boondock','event_venue','commercial_boondock') NOT NULL,
  `source` varchar(40) DEFAULT NULL,
  `sourceUrl` varchar(512) DEFAULT NULL,
  `sourceLicense` varchar(40) DEFAULT NULL,
  `externalId` varchar(128) DEFAULT NULL,
  `maxRigLengthFt` int DEFAULT NULL,
  `accessNotes` text,
  `waterQualityUrl` varchar(512) DEFAULT NULL,
  `lastVerifiedAt` timestamp NULL DEFAULT NULL,
  `verifiedCount` int NOT NULL DEFAULT '0',
  `region` varchar(64) DEFAULT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `bioregion` varchar(64) NOT NULL DEFAULT 'cascadia',
  `description` text,
  `websiteUrl` varchar(512) DEFAULT NULL,
  `imageUrl` varchar(512) DEFAULT NULL,
  `isVerified` tinyint(1) NOT NULL DEFAULT '0',
  `addedByUserId` int DEFAULT NULL,
  `linkedEventId` int DEFAULT NULL,
  `linkedApplicationId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_locations_slug_uq` (`slug`),
  UNIQUE KEY `ship_locations_source_external_idx` (`source`,`externalId`),
  KEY `ship_locations_type_idx` (`type`),
  KEY `ship_locations_verified_idx` (`isVerified`),
  KEY `ship_locations_bioregion_idx` (`bioregion`),
  KEY `ship_locations_source_idx` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_log_entries`;
CREATE TABLE `ship_log_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `userId` int NOT NULL,
  `dayNumber` int DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `isPublic` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_log_booking_idx` (`bookingId`),
  KEY `ship_log_public_idx` (`isPublic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_maintenance_cases`;
CREATE TABLE `ship_maintenance_cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int DEFAULT NULL,
  `reportedByUserId` int NOT NULL,
  `system` enum('chassis','engine','propane','electrical','plumbing','slides','generator','appliances','starlink','water_filtration','tires_brakes','hvac','general') NOT NULL DEFAULT 'general',
  `title` varchar(255) NOT NULL,
  `description` text,
  `photoUrls` json DEFAULT NULL,
  `conversation` json DEFAULT NULL,
  `status` enum('open','advised','resolved','escalated') NOT NULL DEFAULT 'open',
  `isEscalation` tinyint(1) NOT NULL DEFAULT '0',
  `resolution` text,
  `whatWorked` text,
  `approvedIntoKb` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `resolvedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ship_case_status_idx` (`status`),
  KEY `ship_case_booking_idx` (`bookingId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_nominations`;
CREATE TABLE `ship_nominations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nominatorUserId` int DEFAULT NULL,
  `nomineeName` varchar(200) NOT NULL,
  `nomineeContact` varchar(320) DEFAULT NULL,
  `reason` text NOT NULL,
  `isSelfNomination` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('submitted','shortlisted','selected','approved_for_draw') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nomineeUserId` int DEFAULT NULL,
  `inviteEmailSentAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ship_nominations_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_passport_stamps`;
CREATE TABLE `ship_passport_stamps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `locationId` int NOT NULL,
  `bookingId` int DEFAULT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `stampedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_passport_uq` (`userId`,`locationId`),
  KEY `ship_passport_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_position_pings`;
CREATE TABLE `ship_position_pings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `source` enum('manual','tracker') NOT NULL DEFAULT 'manual',
  `note` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_position_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_pricing_windows`;
CREATE TABLE `ship_pricing_windows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `multiplier` decimal(4,2) NOT NULL DEFAULT '1.00',
  `label` varchar(120) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_pricing_start_idx` (`startDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_quest_actions`;
CREATE TABLE `ship_quest_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `points` int NOT NULL DEFAULT '0',
  `isRequired` tinyint(1) NOT NULL DEFAULT '1',
  `proofType` enum('link','photo','referral_shortlisted','game_quest','forum') NOT NULL DEFAULT 'link',
  `linkedQuestId` varchar(100) DEFAULT NULL,
  `forumPostId` int DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_quest_actions_slug_uq` (`slug`),
  KEY `ship_quest_actions_sort_idx` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_quest_completions`;
CREATE TABLE `ship_quest_completions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `actionId` int NOT NULL,
  `proofUrl` varchar(512) DEFAULT NULL,
  `note` text,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verifiedByUserId` int DEFAULT NULL,
  `verifiedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_quest_completion_uq` (`userId`,`actionId`),
  KEY `ship_quest_completion_user_idx` (`userId`),
  KEY `ship_quest_completion_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_seed_plantings`;
CREATE TABLE `ship_seed_plantings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `bookingId` int DEFAULT NULL,
  `locationId` int DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `species` varchar(200) DEFAULT NULL,
  `photoUrl` varchar(512) DEFAULT NULL,
  `notes` text,
  `isVerified` tinyint(1) NOT NULL DEFAULT '0',
  `plantedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_seed_plantings_user_idx` (`userId`),
  KEY `ship_seed_plantings_verified_idx` (`isVerified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ship_winter_host_applications`;
CREATE TABLE `ship_winter_host_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectName` varchar(200) NOT NULL,
  `contactName` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `powerHookup` tinyint(1) NOT NULL DEFAULT '0',
  `freezeProtectionPlan` text,
  `siteDescription` text,
  `proposedShare` varchar(120) DEFAULT NULL,
  `status` enum('submitted','in_conversation','accepted','declined') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ship_winter_host_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `siteBanners`;
CREATE TABLE `siteBanners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `displayStartDate` timestamp NULL DEFAULT NULL,
  `displayEndDate` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteBanners_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `site_settings`;
CREATE TABLE `site_settings` (
  `key` varchar(128) NOT NULL,
  `value` text NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `song_submission_votes`;
CREATE TABLE `song_submission_votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `songSubmissionId` int NOT NULL,
  `userId` int NOT NULL,
  `seasonId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_season_vote` (`userId`,`seasonId`),
  KEY `idx_song_votes_submission` (`songSubmissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `song_submissions`;
CREATE TABLE `song_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `seasonId` int DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `artist` varchar(200) DEFAULT NULL,
  `audioUrl` varchar(500) NOT NULL,
  `description` text,
  `voteCount` int NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_song_submissions_season` (`seasonId`),
  KEY `idx_song_submissions_user_season` (`userId`,`seasonId`),
  KEY `idx_song_submissions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tier_events`;
CREATE TABLE `tier_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `eventType` enum('co_creator_earned','steward_earned','sage_earned','bonus_claimed') NOT NULL,
  `path` enum('investor','land_project','ally','player') DEFAULT NULL,
  `amountCredited` int DEFAULT NULL,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tier_events_userId_idx` (`userId`),
  KEY `tier_events_eventType_idx` (`eventType`),
  KEY `tier_events_path_idx` (`path`),
  KEY `tier_events_occurredAt_idx` (`occurredAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `toolsLibraryEntries`;
CREATE TABLE `toolsLibraryEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `claimId` int NOT NULL,
  `contributorUserId` int NOT NULL,
  `toolName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `toolDescription` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `toolType` enum('tool_software','curriculum_course','methodology_framework','templates_guides','physical_space','network_community','publications_research','art_media','financial_infrastructure','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `capitalForm` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessLink` text COLLATE utf8mb4_unicode_ci,
  `usageNotes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tools_status` (`status`),
  KEY `idx_tools_contributor` (`contributorUserId`),
  KEY `idx_tools_claim` (`claimId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `translationCache`;
CREATE TABLE `translationCache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contentType` enum('post','reply','quest_suggestion') NOT NULL,
  `contentId` int NOT NULL,
  `sourceLang` varchar(10) NOT NULL,
  `targetLang` varchar(10) NOT NULL,
  `translatedTitle` text,
  `translatedContent` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `upcoming_amas`;
CREATE TABLE `upcoming_amas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectName` varchar(255) NOT NULL,
  `hostName` varchar(255) NOT NULL,
  `date` varchar(32) NOT NULL,
  `time` varchar(64) NOT NULL,
  `timezone` varchar(64) NOT NULL,
  `forumThreadUrl` text,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `userProfiles`;
CREATE TABLE `userProfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `bio` text,
  `location` varchar(255) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `preferredLanguage` varchar(10) DEFAULT 'en',
  `reputation` int NOT NULL DEFAULT '0',
  `postCount` int NOT NULL DEFAULT '0',
  `replyCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `path` enum('investor','land_project','ally','player') DEFAULT NULL,
  `onboardingComplete` tinyint NOT NULL DEFAULT '0',
  `investmentRange` varchar(255) DEFAULT NULL,
  `projectName` varchar(255) DEFAULT NULL,
  `projectUrl` varchar(500) DEFAULT NULL,
  `organizationName` varchar(255) DEFAULT NULL,
  `questInterests` text,
  `displayName` varchar(255) DEFAULT NULL,
  `avatarUrl` varchar(500) DEFAULT NULL,
  `lastActiveAt` timestamp NULL DEFAULT NULL,
  `bannerUrl` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userProfiles_userId_unique` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_bioregions`;
CREATE TABLE `user_bioregions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `bioregionId` int NOT NULL,
  `isPrimary` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_follows`;
CREATE TABLE `user_follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `targetType` enum('user','category','bioregion','tag') NOT NULL,
  `targetId` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_follows_uq` (`userId`,`targetType`,`targetId`),
  KEY `user_follows_target_idx` (`targetType`,`targetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_forum_affinity`;
CREATE TABLE `user_forum_affinity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `dimension` enum('category','user','tag') NOT NULL,
  `targetId` varchar(64) NOT NULL,
  `score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `computedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_forum_affinity_uq` (`userId`,`dimension`,`targetId`),
  KEY `user_forum_affinity_user_idx` (`userId`,`dimension`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_guide_preferences`;
CREATE TABLE `user_guide_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `guideName` varchar(60) NOT NULL,
  `portraitKey` varchar(32) NOT NULL DEFAULT 'guide-archetype-1',
  `tone` varchar(16) NOT NULL DEFAULT 'gentle',
  `voiceEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_guide_prefs_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_notifications`;
CREATE TABLE `user_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('contribution_accepted','contribution_rejected','campaign_milestone','new_contribution','system','quest_complete','gratitude') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `campaignId` int DEFAULT NULL,
  `contributionId` int DEFAULT NULL,
  `read` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `link` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_notifications_user_read_created_idx` (`userId`,`read`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_token_ledger`;
CREATE TABLE `user_token_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `tokenType` enum('rcvoice','rgvoice','rcivics','regen') NOT NULL,
  `amount` int NOT NULL,
  `source` varchar(64) NOT NULL,
  `sourceId` int DEFAULT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tenantId` int DEFAULT NULL,
  `claimedAt` timestamp NULL DEFAULT NULL,
  `hyphaBridgeId` int DEFAULT NULL,
  `sourceRef` varchar(120) DEFAULT NULL,
  `idempotencyKey` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_token_ledger_idempotencyKey_idx` (`idempotencyKey`),
  KEY `user_token_ledger_userId_idx` (`userId`),
  KEY `user_token_ledger_tokenType_idx` (`tokenType`),
  KEY `user_token_ledger_source_idx` (`source`),
  KEY `user_token_ledger_tenantId_idx` (`tenantId`),
  KEY `user_token_ledger_claimedAt_idx` (`claimedAt`),
  KEY `user_token_ledger_sourceRef_source_idx` (`sourceRef`,`source`),
  KEY `user_token_ledger_user_token_idx` (`userId`,`tokenType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin','superadmin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  `handleLastChangedAt` datetime DEFAULT NULL,
  `handle` varchar(40) DEFAULT NULL,
  `bioregions` json DEFAULT NULL,
  `rcVoiceWeight` int NOT NULL DEFAULT '1',
  `rgVoiceWeight` int NOT NULL DEFAULT '1',
  `availableAsStoryteller` tinyint(1) NOT NULL DEFAULT '0',
  `privyDid` varchar(120) DEFAULT NULL,
  `baseWalletAddress` varchar(60) DEFAULT NULL,
  `privyAccessTokenHash` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`),
  UNIQUE KEY `users_handle_unique` (`handle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `video_suggestions`;
CREATE TABLE `video_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `category` enum('how_to_play','how_to_participate','how_to_invest','how_to_apply','how_to_contribute','other') NOT NULL DEFAULT 'other',
  `submitterEmail` varchar(320) DEFAULT NULL,
  `submitterName` varchar(255) DEFAULT NULL,
  `voteCount` int NOT NULL DEFAULT '0',
  `voterEmails` text,
  `status` enum('pending','approved','in_production','completed','rejected') NOT NULL DEFAULT 'pending',
  `completedVideoUrl` varchar(512) DEFAULT NULL,
  `completedBlogSlug` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vouches`;
CREATE TABLE `vouches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucherId` int NOT NULL,
  `vouchedForId` int NOT NULL,
  `vouchedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vouch` (`voucherId`,`vouchedForId`),
  KEY `idx_vouched_for` (`vouchedForId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `webhook_deliveries`;
CREATE TABLE `webhook_deliveries` (
  `deliveryId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`deliveryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reference rows: forumCategories (22).
INSERT INTO `forumCategories` (`id`, `name`, `slug`, `description`, `icon`, `color`, `sortOrder`, `createdAt`, `imageUrl`, `sortMode`) VALUES
  (1, 'General Discussion', 'general', 'Open conversations about regenerative living, systems thinking, and the movement.', 'MessageCircle', '#4a7c59', 1, '2026-03-08 21:17:03.000', NULL, 'activity'),
  (2, 'Land Projects', 'land-projects', 'Share updates, ask questions, and discuss regenerative land projects.', 'Trees', '#7dd87d', 2, '2026-03-08 21:17:03.000', NULL, 'activity'),
  (3, 'Investment & Finance', 'investment-finance', 'Discuss regenerative finance, impact investing, and fund structures.', 'TrendingUp', '#d4a574', 3, '2026-03-08 21:17:04.000', NULL, 'activity'),
  (4, 'Governance & DAO', 'governance-dao', 'Explore governance models, Hypha DAO, and decision-making frameworks.', 'Vote', '#e8b86d', 4, '2026-03-08 21:17:04.000', NULL, 'activity'),
  (5, 'Quests & Gameplay', 'quests-gameplay', 'Discuss quests, seasons, achievements, and the infinite game mechanics.', 'Gamepad2', '#c77dba', 5, '2026-03-08 21:17:04.000', NULL, 'activity'),
  (6, 'Alliance Partners', 'alliance-partners', 'Connect with and discuss alliance partnerships and collaborations.', 'Handshake', '#5b9bd5', 6, '2026-03-08 21:17:04.000', NULL, 'activity'),
  (7, 'Introductions', 'introductions', 'Introduce yourself to the community! Share your background and what brought you here.', 'UserPlus', '#f0a35e', 7, '2026-03-08 21:17:05.000', NULL, 'activity'),
  (8, 'Resources & Learning', 'resources-learning', 'Share articles, books, courses, and other educational resources.', 'BookOpen', '#6b8e7b', 8, '2026-03-08 21:17:05.000', NULL, 'activity'),
  (9, 'Epic Quests', 'epic-quests', 'Collective transformation acts. These quests change landscapes.', NULL, NULL, 99, '2026-03-14 03:07:44.000', NULL, 'activity'),
  (10, 'Alliance Organisations', 'active-organisations', 'Dedicated spaces for accepted alliance organisations.', 'Building2', NULL, 7, '2026-03-14 04:20:39.000', NULL, 'activity'),
  (11, 'Land Project Spaces', 'active-projects', 'Dedicated spaces for accepted land projects in the incubator.', 'TreePine', NULL, 3, '2026-03-14 04:22:03.000', NULL, 'activity'),
  (12, 'Air Conversations', 'air-conversations', 'Open threads for hard conversations, future visions, and ideas that need space to breathe.', 'Wind', '#c084fc', 10, '2026-03-14 06:55:32.000', NULL, 'activity'),
  (13, 'Rites of Passage', 'rites-of-passage', 'Discussion threads for each of the 13 Rites of Passage quests -- share completions, ask questions, and connect with others on the same quest.', 'Flame', '#c77dba', 6, '2026-03-20 07:55:38.000', NULL, 'numerical'),
  (23, 'Welcome Aboard Quests', 'welcome-aboard-quests', 'Discussion threads for the 10 Welcome Aboard quests. Share your completions, reflections, and social posts here.', 'Compass', '#f0a35e', 7, '2026-03-28 00:24:51.000', NULL, 'activity'),
  (24, 'Session Recordings', 'session-recordings', 'All Recordings: Episodes and Sessions found here', NULL, NULL, 0, '2026-03-28 21:18:30.000', NULL, 'activity'),
  (25, 'Bioregions', 'bioregions', 'Where bioregions organising for regeneration meet, share, and find each other.', 'Globe', '#d4a574', 12, '2026-04-07 16:02:35.000', NULL, 'activity'),
  (26, 'Land General', 'land-general', 'Open discussion about regenerative land projects, land stewardship, and the movement.', 'Sprout', '#4a7c59', 25, '2026-04-10 21:30:22.000', NULL, 'activity'),
  (27, 'Alliance General', 'alliance-general', 'Open discussion about alliance partnerships, collaborations, and working together across the movement.', 'Users', '#5b9bd5', 26, '2026-04-10 21:30:22.000', NULL, 'activity'),
  (28, 'Historical Contribution Accounting', 'historical-contribution-accounting', 'Improvement ideas about the claim flow.', 'Sprout', '#7dd87d', 50, '2026-04-11 04:02:31.000', NULL, 'activity'),
  (29, 'Plays', 'plays', 'Discussion threads for community Plays', 'Gamepad2', '#9B59B6', 30, '2026-06-20 05:01:38.000', NULL, 'activity'),
  (30, 'Roles Dialogue', 'roles-dialogue', 'What roles are missing? Propose the roles the game needs and help shape future seasons.', NULL, NULL, 11, '2026-07-03 22:30:04.000', NULL, 'activity'),
  (31, 'All the Other Quests', 'all-other-quests', 'Quests beyond the core path. New quests land here as the community dreams them up.', NULL, NULL, 8, '2026-07-03 22:30:06.000', NULL, 'activity');

SET FOREIGN_KEY_CHECKS = 1;

-- Migration history covered by this baseline.
INSERT INTO _migrations_applied (filename, statementsRun) VALUES
  ('0000_yellow_tombstone.sql', 0),
  ('0001_acoustic_zarek.sql', 0),
  ('0002_chunky_mephisto.sql', 0),
  ('0003_melted_vindicator.sql', 0),
  ('0004_square_guardsmen.sql', 0),
  ('0005_rainy_bromley.sql', 0),
  ('0006_sweet_satana.sql', 0),
  ('0007_kind_random.sql', 0),
  ('0008_friendly_hiroim.sql', 0),
  ('0009_gorgeous_devos.sql', 0),
  ('0010_skinny_black_tom.sql', 0),
  ('0011_friendly_swarm.sql', 0),
  ('0012_busy_spot.sql', 0),
  ('0013_spooky_taskmaster.sql', 0),
  ('0014_groovy_thunderbolts.sql', 0),
  ('0015_fat_bloodscream.sql', 0),
  ('0016_lively_infant_terrible.sql', 0),
  ('0017_lonely_redwing.sql', 0),
  ('0018_mighty_gorilla_man.sql', 0),
  ('0019_sleepy_butterfly.sql', 0),
  ('0020_tough_goliath.sql', 0),
  ('0021_keen_cloak.sql', 0),
  ('0022_shallow_moonstone.sql', 0),
  ('0023_ancient_phantom_reporter.sql', 0),
  ('0024_sturdy_manta.sql', 0),
  ('0025_daffy_blindfold.sql', 0),
  ('0026_noisy_hulk.sql', 0),
  ('0027_cuddly_sentry.sql', 0),
  ('0028_tidy_adam_warlock.sql', 0),
  ('0029_green_snowbird.sql', 0),
  ('0030_wandering_mach_iv.sql', 0),
  ('0031_curious_thaddeus_ross.sql', 0),
  ('0032_young_ben_parker.sql', 0),
  ('0033_eminent_peter_quill.sql', 0),
  ('0034_email_tokens.sql', 0),
  ('0035_user_path_onboarding.sql', 0),
  ('0036_dashing_adam_destine.sql', 0),
  ('0037_player_profile_digest_frequency.sql', 0),
  ('0038_player_contributions.sql', 0),
  ('0039_meeting_frequency_dietary_patterns.sql', 0),
  ('0040_early_darkstar.sql', 0),
  ('0041_generated_image_urls.sql', 0),
  ('0041_spooky_monster_badoon.sql', 0),
  ('0042_amusing_guardian.sql', 0),
  ('0043_custom_game_inquiries.sql', 0),
  ('0043_fantastic_blue_marvel.sql', 0),
  ('0044_user_bioregions.sql', 0),
  ('0044_worthless_bedlam.sql', 0),
  ('0045_profile_location_fields.sql', 0),
  ('0045_watery_sleepwalker.sql', 0),
  ('0046_wise_zarda.sql', 0),
  ('0047_mature_doctor_strange.sql', 0),
  ('0057_emoji_reactions.sql', 0),
  ('0057_rites_of_passage_category.sql', 0),
  ('0058_emoji_reactions.sql', 0),
  ('0059_onboarding_quests_category.sql', 0),
  ('0060_quest_forum_thread_id.sql', 0),
  ('0063_banned_emails.sql', 0),
  ('0064_application_events.sql', 0),
  ('0065_admin_notifications.sql', 0),
  ('0066_entity_notes.sql', 0),
  ('0067_admin_audit_log.sql', 0),
  ('0068_forum_fulltext_search.sql', 0),
  ('0069_messaging.sql', 0),
  ('0070_user_last_active.sql', 0),
  ('0071_rites_of_passage_category.sql', 0),
  ('0072_onboarding_quests_category.sql', 0),
  ('0073_quest_forum_thread_id.sql', 0),
  ('0074_move_welcome_aboard_threads.sql', 0),
  ('0074_performance_indexes.sql', 0),
  ('0075_recordings.sql', 0),
  ('0076_events_and_signups.sql', 0),
  ('0077_event_enhancements.sql', 0),
  ('0078_attendance_and_token_ledger.sql', 0),
  ('0079_forum_link_previews.sql', 0),
  ('0080_event_checkin.sql', 0),
  ('0082_guest_speaker.sql', 0),
  ('0083_admin_seeded_apps.sql', 0),
  ('0084_steward_user_id.sql', 0),
  ('0085_user_notification_prefs.sql', 0),
  ('0086_community_agreements.sql', 0),
  ('0087_seed_existing_agreements.sql', 0),
  ('0088_category_images.sql', 0),
  ('0089_move_land_threads.sql', 0),
  ('0090_move_alliance_threads.sql', 0),
  ('0091_recording_email_pref.sql', 0),
  ('0091_user_handles.sql', 0),
  ('0092_gratitude_log.sql', 0),
  ('0093_feature_suggestions.sql', 0),
  ('0093_season_snapshots.sql', 0),
  ('0094_profile_banner.sql', 0),
  ('0095_referrals.sql', 0),
  ('0096_game_system.sql', 0),
  ('0097_seed_game_variables.sql', 0),
  ('0098_citizenship_tiers_and_game_expansion.sql', 0),
  ('0099_seed_citizenship_trust_harvest.sql', 0),
  ('0100_seed_citizenship_powers.sql', 0),
  ('0101_regen_tools_library.sql', 0),
  ('0102_add_video_pitch_url.sql', 0),
  ('0103_bioregions_category.sql', 0),
  ('0104_song_submissions.sql', 0),
  ('0105_seed_heal_the_land.sql', 0),
  ('0106_add_citizenship_tier_columns.sql', 0),
  ('0107_roles_dialogue_forum_post.sql', 0),
  ('0108_governance_mechanics_variables.sql', 0),
  ('0109_governance_pipeline.sql', 0),
  ('0110_governance_phase2.sql', 0),
  ('0111_regen_guide_user.sql', 0),
  ('0112_privy_auth_fields.sql', 0),
  ('0113_gov_dashboard_prefs.sql', 0),
  ('0114_gov_proposals.sql', 0),
  ('0115_gov_bioregion_health.sql', 0),
  ('0116_gov_passport_quests.sql', 0),
  ('0117_historical_claims.sql', 0),
  ('0118_fix_biofi_url.sql', 0),
  ('0119_cleanup_zapier_test_recordings.sql', 0),
  ('0120_update_fund_banner.sql', 0),
  ('0121_reattribute_forum_posts_to_team.sql', 0),
  ('0122_hypha_bridge_quest_source.sql', 0),
  ('0123_looking_for_party.sql', 0),
  ('0124_completion_video_metadata.sql', 0),
  ('0125_player_capital_scores.sql', 0),
  ('0126_add_health_capital.sql', 0),
  ('0127_capital_scores_cache.sql', 0),
  ('0128_trust_score_fields.sql', 0),
  ('0129_living_tree_variables.sql', 0),
  ('0130_swap_zoom_for_riverside.sql', 0),
  ('0131_token_ledger.sql', 0),
  ('0132_ledger_supersede.sql', 0),
  ('0133_forum_listing_indexes.sql', 0),
  ('0134_path_progression.sql', 0),
  ('0135_path_steward_criteria.sql', 0),
  ('0136_analytics_events.sql', 0),
  ('0137_admin_automations.sql', 0),
  ('0137_plays_tables.sql', 0),
  ('0138_plays_seed_categories.sql', 0),
  ('0139_plays_forum_category.sql', 0),
  ('0140_plays_game_variable.sql', 0),
  ('0141_admin_automation_every_other_day.sql', 0),
  ('0142_movement_coordination.sql', 0),
  ('0143_movement_coordination_auto_pay.sql', 0),
  ('0144_movement_coordination_flywheel.sql', 0),
  ('0145_bounty_engine.sql', 0),
  ('0146_dialogue_governance_stage.sql', 0),
  ('0147_forum_perspectives.sql', 0),
  ('0148_reply_open_question_flag.sql', 0),
  ('0150_recording_chapters_transcript.sql', 0),
  ('0151_bounty_artifacts.sql', 0),
  ('0152_roles_catalog_invite.sql', 0),
  ('0153_bounty_valuation.sql', 0),
  ('0153_core_church.sql', 0),
  ('0154_core_zeffy.sql', 0),
  ('0155_core_steward_rename.sql', 0),
  ('0157_seeds_regen_rate.sql', 0),
  ('0158_hot_indexes.sql', 0),
  ('0159_event_scheduled_reminder.sql', 0),
  ('0160_promotion_loomio_sent.sql', 0),
  ('0161_email_log_resend_id.sql', 0),
  ('0162_drop_loomio_columns.sql', 0),
  ('0163_forum_notifications.sql', 0),
  ('0163_gratitude_cycles.sql', 0),
  ('0163_sensing_open_to_all.sql', 0),
  ('0164_assembly_signals.sql', 0),
  ('0164_push_subscriptions.sql', 0),
  ('0165_assembly_lifecycle.sql', 0),
  ('0166_game_variables_display_backfill.sql', 0),
  ('0167_governance_executions.sql', 0),
  ('0168_forum_feed.sql', 0),
  ('0169_profile_unify.sql', 0),
  ('0170_evolution_autonomy.sql', 0),
  ('0171_quest_sort_controls.sql', 0),
  ('0172_execution_unique_proposal.sql', 0),
  ('0173_evolution_provenance_and_approval.sql', 0),
  ('0173_gratitude_budget_vars.sql', 0),
  ('0174_gratitude_var_descriptions.sql', 0),
  ('0175_regen_ship.sql', 0),
  ('0176_ship_quest_link.sql', 0),
  ('0177_ship_map_v2.sql', 0),
  ('0178_ship_location_flags.sql', 0),
  ('0179_ship_dataset_offers.sql', 0),
  ('0179_ship_quest_v2.sql', 0),
  ('0180_user_guide_preferences.sql', 0),
  ('0181_ship_commercial_boondock.sql', 0),
  ('0182_ship_booking_children_orientation.sql', 0),
  ('0183_ship_inventory_shipwright_gear_crewlist.sql', 0),
  ('0184_ship_captains_book.sql', 0),
  ('0185_ship_homecoming.sql', 0),
  ('0186_ship_knowledge_approve_and_asset_vars.sql', 0),
  ('0187_ship_crewlist_notified.sql', 0),
  ('0188_application_companion_transcript.sql', 0),
  ('0189_ship_galley.sql', 0),
  ('0190_galley_quest_actions.sql', 0),
  ('0191_ship_agreement_acceptance.sql', 0);
