-- Funding engine, Phase 0 foundations (FUNDING_ENGINE_PLAN v1.2, 2026-09-27).
--
-- Three tables, all additive.
--
-- metrics: the one source for every number ReGen Civics states about itself.
-- The site claimed "847 active players" while the database held 102
-- accounts, and three pages disagreed on the alliance count, because every
-- number was typed into the page that showed it. Each row here carries a
-- definition, a source and an as-of date. A row with computedFrom set is a
-- live count the server recomputes. Rye's ruling of 2026-09-27: live counts
-- show in admin only until they are meaningful, so every row starts private
-- (isPublic = 0) and unconfirmed. Nothing public reads a row until Rye marks it
-- public and confirms it.
--
-- funding_prompts: versioned system prompts for the application engine. The
-- positioning kernel used to be a TypeScript constant in this public repo,
-- naming funders and internal strategy. It now lives here, admin-editable,
-- with every version kept so a regeneration can be compared against what the
-- kernel said before. No prompt text is seeded by this file, on purpose: the
-- content is private and arrives through scripts/seed-funding-prompts.ts from
-- a gitignored file.
--
-- coop_interest: the "tell us you're interested" form for the member-owned
-- cooperative in design (shared/fund.ts). It replaces the letter-of-intent
-- pledge form: no amounts, no minimums, no accreditation. Interest is its own
-- record and its own act, never a membership and never a contribution (two
-- records, two acts). consentAt is the moment the person agreed to be
-- contacted about the cooperative.

CREATE TABLE IF NOT EXISTS `metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `metricKey` VARCHAR(80) NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `definition` TEXT NULL,
  `valueNumeric` DOUBLE NULL,
  `displayValue` VARCHAR(60) NULL,
  `unit` VARCHAR(24) NOT NULL DEFAULT 'count',
  `computedFrom` VARCHAR(80) NULL,
  `computedAt` TIMESTAMP NULL DEFAULT NULL,
  `asOf` DATE NULL DEFAULT NULL,
  `source` VARCHAR(500) NULL,
  `isPublic` TINYINT(1) NOT NULL DEFAULT 0,
  `confirmedBy` INT NULL,
  `confirmedAt` TIMESTAMP NULL DEFAULT NULL,
  `notes` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `metrics_key_uq` (`metricKey`),
  KEY `metrics_public_idx` (`isPublic`)
);

CREATE TABLE IF NOT EXISTS `funding_prompts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `promptKey` VARCHAR(80) NOT NULL,
  `version` INT NOT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `note` VARCHAR(500) NULL,
  `createdBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `funding_prompts_key_version_uq` (`promptKey`, `version`),
  KEY `funding_prompts_active_idx` (`promptKey`, `isActive`)
);

CREATE TABLE IF NOT EXISTS `coop_interest` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `kind` ENUM('land_project', 'person', 'organization', 'funder') NOT NULL,
  `organization` VARCHAR(200) NULL,
  `location` VARCHAR(200) NULL,
  `capitalForms` JSON NULL,
  `message` TEXT NULL,
  `source` VARCHAR(60) NULL,
  `userId` INT NULL,
  `status` ENUM('new', 'contacted', 'in_conversation', 'archived') NOT NULL DEFAULT 'new',
  `consentAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `coop_interest_email_idx` (`email`),
  KEY `coop_interest_status_idx` (`status`),
  KEY `coop_interest_created_idx` (`createdAt`)
);

-- The metric rows. Definitions only: values come from the live counts
-- (computedFrom) or from Rye in the admin editor. One INSERT per row, per the
-- runner's notes on multi-row inserts.

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('land_projects_applied', 'Land projects that have applied', 'Season One 2022 applicants (shared/regenYear.ts) plus non-draft incubator applications in the applications table.', 'count', 'land_projects_applied', 10);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('incubator_applications', 'Incubator applications on the platform', 'Non-draft rows in the applications table (the platform intake, since 2026).', 'count', 'applications_non_draft', 20);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('member_accounts', 'Accounts on regencivics.earth', 'Rows in the users table.', 'count', 'users_total', 30);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('player_profiles', 'Player profiles', 'Rows in the player_profiles table.', 'count', 'player_profiles_total', 40);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('quests_completed', 'Quests completed', 'Quest completions recorded on the platform.', 'count', 'quests_completed', 50);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('hectares_applied', 'Hectares across applying land projects', 'Sum of projectSizeHectares over non-draft incubator applications.', 'hectares', 'applications_hectares', 60);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('crowdpool_campaigns', 'Crowdpool campaigns (not examples)', 'Campaign rows that are not marked as examples.', 'count', 'campaigns_real', 70);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('coop_interest', 'People and projects interested in the cooperative', 'Rows in coop_interest that are not archived.', 'count', 'coop_interest_open', 80);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('revenue_to_date', 'Revenue to date', 'Money paid to ReGen Civics for services, entered by hand with its source.', 'usd', NULL, 100);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('paying_customers', 'Paying customers', 'Clients who have paid for services, entered by hand.', 'count', NULL, 110);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('alliance_organizations', 'Alliance organizations', 'Organizations that have agreed to be named as alliance partners, entered by hand.', 'count', NULL, 120);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('seeds_lineage_people', 'SEEDS lineage: people', 'People who took part in SEEDS, the earlier movement, entered by hand with its source.', 'count', NULL, 130);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('seeds_lineage_orgs', 'SEEDS lineage: organizations', 'Organizations that took part in SEEDS, entered by hand with its source.', 'count', NULL, 140);

INSERT IGNORE INTO `metrics` (`metricKey`, `label`, `definition`, `unit`, `computedFrom`, `sortOrder`) VALUES ('founder_years', 'Years the founder has worked in regenerative economies', 'Entered by hand.', 'years', NULL, 150);
