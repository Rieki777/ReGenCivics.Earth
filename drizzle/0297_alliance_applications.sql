-- Alliance partner applications (ADR-72). ADDITIVE ONLY: two new tables.
-- Old code never reads them. MariaDB and MySQL 8+ compatible.
--
-- An alliance partner applies at /apply/alliance, is reviewed in Admin >
-- Alliance, and on approval joins the Interoperability Circle. Its own table,
-- beside `applications`, because every land project column there is land
-- specific (many NOT NULL) and `applications` allows one application per user;
-- one person can hold both kinds (Rye, 2026-10-13).
--
-- userId is NULL for an application an admin converted from an alliance
-- inquiry (general_inquiries) whose writer has no account yet; contactEmail
-- then carries it, and the first signed-in visit with that email claims it.
-- sourceInquiryId is unique so an inquiry converts once.
--
-- Safe to apply before the deploy: old code reads neither table.
-- Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0297_alliance_applications.sql

CREATE TABLE IF NOT EXISTS `alliance_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NULL DEFAULT NULL,
  `contactEmail` VARCHAR(320) NOT NULL,
  `contactName` VARCHAR(255) NULL DEFAULT NULL,
  `organizationName` VARCHAR(255) NOT NULL DEFAULT '',
  `organizationUrl` VARCHAR(512) NULL DEFAULT NULL,
  `roles` TEXT NULL,
  `otherSupport` VARCHAR(255) NULL DEFAULT NULL,
  `scope` ENUM('local','global') NOT NULL DEFAULT 'local',
  `location` VARCHAR(255) NULL DEFAULT NULL,
  `country` VARCHAR(100) NULL DEFAULT NULL,
  `latitude` DOUBLE NULL DEFAULT NULL,
  `longitude` DOUBLE NULL DEFAULT NULL,
  `supportDescription` TEXT NULL,
  `partnershipDescription` TEXT NULL,
  `toolRepoUrl` VARCHAR(500) NULL DEFAULT NULL,
  `status` ENUM('draft','submitted','under_review','approved','active','inactive','rejected','changes_requested') NOT NULL DEFAULT 'draft',
  `reviewNote` TEXT NULL,
  `sourceInquiryId` INT NULL DEFAULT NULL,
  `organisationId` INT NULL DEFAULT NULL,
  `submittedAt` TIMESTAMP NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `alliance_applications_user_idx` (`userId`),
  KEY `alliance_applications_status_idx` (`status`),
  KEY `alliance_applications_email_idx` (`contactEmail`),
  UNIQUE KEY `alliance_applications_inquiry_idx` (`sourceInquiryId`)
);

CREATE TABLE IF NOT EXISTS `alliance_application_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `allianceApplicationId` INT NOT NULL,
  `eventType` ENUM('status_change','email_sent','note_added','admin_action') NOT NULL,
  `description` TEXT NOT NULL,
  `adminUserId` INT NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `alliance_application_events_app_idx` (`allianceApplicationId`)
);
