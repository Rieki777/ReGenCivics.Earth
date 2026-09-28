-- Funding engine Phase 5: the Network Grant Engine's first slice
-- (FUNDING_ENGINE_PLAN v1.3, sections 9 and 11). Additive.
--
-- funding_pipeline gains the program fields the matcher reads (plan 11.2:
-- "reuse funding_pipeline for programs"). audience says whose money it is:
-- 'platform' for ReGen Civics' own funders (every existing row), 'project' or
-- 'both' for grant programs land projects can apply to. programKey is the
-- research seed's key, the upsert identity for scripts/seed-grant-programs.ts.
-- The seed file is private (docs/private/research/grant-sources-seed.json).
--
-- project_funding_profiles: a land project's funding profile, keyed by its
-- applications.id (a land project is an applications row, ADR-61). Stewards
-- fill it on the project page. The eligibility flags are opt-in,
-- self-reported, used only for matching and never shown publicly; consentAt
-- records the steward's agreement to use the profile for matching (plan 11.4).
--
-- network_grant_matches: each program suggested to a project, the one
-- criterion a near miss lacks, and where the project took it. The project owns
-- its application: it decides to pursue, edits and submits. There is no fee
-- column here or anywhere near an award, on purpose (plan 11.4: never a
-- percentage of grants won), and server/project-funding.test.ts asserts it.
--
-- funding_deadline_pings (0278) gains applicationId, so a program a land
-- project is pursuing gets its own 21-, 7- and 2-day pings, exactly once per
-- project; 0 stands for ReGen Civics itself. A NOT NULL 0 rather than NULL,
-- because MySQL lets NULLs repeat in a unique key and "exactly once" would
-- quietly stop holding. The new key is added before the old one is dropped:
-- the foreign key on pipelineId needs an index that starts with it at all
-- times.

ALTER TABLE `funding_pipeline`
  ADD COLUMN `audience` ENUM('platform','project','both') NOT NULL DEFAULT 'platform' AFTER `track`,
  ADD COLUMN `programKey` VARCHAR(120) NULL DEFAULT NULL AFTER `audience`,
  ADD COLUMN `instrument` VARCHAR(40) NULL DEFAULT NULL,
  ADD COLUMN `applicantTypes` JSON NULL,
  ADD COLUMN `geo` JSON NULL,
  ADD COLUMN `eligibilityRules` JSON NULL,
  ADD COLUMN `programStatus` VARCHAR(20) NULL DEFAULT NULL,
  ADD COLUMN `callOpen` TINYINT(1) NULL DEFAULT NULL,
  ADD COLUMN `amountMin` INT NULL DEFAULT NULL,
  ADD COLUMN `amountMax` INT NULL DEFAULT NULL,
  ADD COLUMN `currency` VARCHAR(3) NULL DEFAULT NULL,
  ADD COLUMN `matchRequiredPct` INT NULL DEFAULT NULL,
  ADD COLUMN `requiresTechnicalAdvisor` TINYINT(1) NULL DEFAULT NULL,
  ADD COLUMN `minPartners` INT NULL DEFAULT NULL,
  ADD COLUMN `statusVerifiedAt` DATE NULL DEFAULT NULL,
  ADD COLUMN `statusSourceUrl` VARCHAR(500) NULL DEFAULT NULL,
  ADD UNIQUE KEY `funding_pipeline_program_key_uq` (`programKey`),
  ADD KEY `funding_pipeline_audience_idx` (`audience`);

CREATE TABLE IF NOT EXISTS `project_funding_profiles` (
  `applicationId` INT PRIMARY KEY,
  `legalWrapper` VARCHAR(40) NOT NULL,
  `faithBased` TINYINT(1) NOT NULL DEFAULT 0,
  `isProducer` TINYINT(1) NOT NULL DEFAULT 0,
  `country` VARCHAR(2) NOT NULL,
  `region` VARCHAR(10) NULL,
  `activities` JSON NULL,
  `matchCapacity` VARCHAR(20) NOT NULL DEFAULT 'none',
  `technicalAdvisor` VARCHAR(20) NOT NULL DEFAULT 'none',
  `partnerCount` INT NOT NULL DEFAULT 0,
  `eligibilityFlags` JSON NULL,
  `consentAt` TIMESTAMP NOT NULL,
  `updatedBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `project_funding_profiles_application_fk`
    FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `network_grant_matches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `applicationId` INT NOT NULL,
  `pipelineId` INT NOT NULL,
  `outcome` VARCHAR(10) NOT NULL,
  `unmetCriterion` VARCHAR(255) NULL,
  `fitScore` INT NOT NULL DEFAULT 0,
  `status` ENUM('suggested','pursuing','drafting','submitted','awarded','declined','passed') NOT NULL DEFAULT 'suggested',
  `amountAwarded` INT NULL,
  `awardedAt` TIMESTAMP NULL DEFAULT NULL,
  `statusChangedBy` INT NULL,
  `computedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `network_grant_matches_pair_uq` (`applicationId`, `pipelineId`),
  KEY `network_grant_matches_pipeline_idx` (`pipelineId`),
  CONSTRAINT `network_grant_matches_application_fk`
    FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE,
  CONSTRAINT `network_grant_matches_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE CASCADE
);

ALTER TABLE `funding_deadline_pings`
  ADD COLUMN `applicationId` INT NOT NULL DEFAULT 0 AFTER `pipelineId`,
  ADD UNIQUE KEY `funding_deadline_pings_scope_uq` (`pipelineId`, `applicationId`, `deadlineAt`, `threshold`),
  DROP INDEX `funding_deadline_pings_once_uq`;
