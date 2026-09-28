-- Funding engine, Phase 1: the application kit (FUNDING_ENGINE_PLAN v1.3,
-- sections 4.3, 4.4 and 9). All additive.
--
-- funding_pipeline gains the columns the kit and the deadline pings need:
-- track (what kind of money) and stage (where we are, validated per track by
-- shared/fundingStages.ts; appStatus stays the coarse funnel and is derived
-- from the stage), cycle (W27, Batch 37), deadlineAt and loiDeadlineAt as real
-- instants beside the free-text deadline, where the deadline came from and
-- when it was checked, and reapplyAt for accelerators. Nothing can trigger on
-- free text, so scripts/backfill-funding-deadlines.ts parses the old column
-- and reports every row it cannot read. Approximate dates are never written.
--
-- app_questions: each program cycle's questions with their portal limits, and
-- the tailored draft for each. The questions are seeded by
-- scripts/seed-app-questions.ts from the gitignored
-- docs/private/app_questions_seed.json, never from a committed migration.
--
-- answer_bank: canonical reusable answers in four lengths, draft until Rye
-- approves them. projectId 0 is ReGen Civics itself; a land project's own
-- answers carry its applications.id (plan section 11), so the table serves
-- the network from day one.
--
-- answer_versions: every saved body, for an answer-bank entry or a question
-- draft (exactly one of answerId and questionId is set; enforced in
-- server/funding/kit.ts, because MySQL refuses a CHECK on a column used by a
-- cascading foreign key). This is how the answers as submitted survive later
-- edits.
--
-- funding_stage_history: every stage move, for the funnel.

ALTER TABLE `funding_pipeline`
  ADD COLUMN `track` ENUM('grant','accelerator','investor','public_goods','fiscal_sponsor','credits','network') NULL DEFAULT NULL AFTER `priority`,
  ADD COLUMN `stage` VARCHAR(40) NULL DEFAULT NULL AFTER `appStatus`,
  ADD COLUMN `cycle` VARCHAR(40) NULL DEFAULT NULL AFTER `stage`,
  ADD COLUMN `deadlineAt` TIMESTAMP NULL DEFAULT NULL AFTER `deadline`,
  ADD COLUMN `loiDeadlineAt` TIMESTAMP NULL DEFAULT NULL AFTER `deadlineAt`,
  ADD COLUMN `deadlineSource` VARCHAR(500) NULL DEFAULT NULL AFTER `loiDeadlineAt`,
  ADD COLUMN `deadlineVerifiedAt` DATE NULL DEFAULT NULL AFTER `deadlineSource`,
  ADD COLUMN `reapplyAt` DATE NULL DEFAULT NULL AFTER `deadlineVerifiedAt`,
  ADD KEY `funding_pipeline_deadline_at_idx` (`deadlineAt`),
  ADD KEY `funding_pipeline_track_idx` (`track`);

CREATE TABLE IF NOT EXISTS `app_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pipelineId` INT NOT NULL,
  `programKey` VARCHAR(60) NOT NULL,
  `cycle` VARCHAR(40) NOT NULL,
  `questionOrder` INT NOT NULL,
  `section` VARCHAR(160) NULL,
  `questionText` TEXT NOT NULL,
  `fieldType` VARCHAR(40) NOT NULL DEFAULT 'long_text',
  `isRequired` TINYINT(1) NULL DEFAULT NULL,
  `charLimit` INT NULL,
  `wordLimit` INT NULL,
  `answerId` INT NULL,
  `answerDraft` TEXT NULL,
  `draftUpdatedAt` TIMESTAMP NULL DEFAULT NULL,
  `draftUpdatedBy` INT NULL,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `sourceUrl` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `app_questions_program_order_uq` (`programKey`, `questionOrder`),
  KEY `app_questions_pipeline_cycle_idx` (`pipelineId`, `cycle`),
  KEY `app_questions_answer_idx` (`answerId`),
  CONSTRAINT `app_questions_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `answer_bank` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL DEFAULT 0,
  `slug` VARCHAR(120) NOT NULL,
  `canonicalQuestion` VARCHAR(500) NOT NULL,
  `tags` JSON NULL,
  `bodyShort` VARCHAR(255) NULL,
  `body150` VARCHAR(1000) NULL,
  `body500` TEXT NULL,
  `bodyLong` TEXT NULL,
  `sourceRefs` JSON NULL,
  `status` ENUM('draft','approved','stale') NOT NULL DEFAULT 'draft',
  `approvedAt` TIMESTAMP NULL DEFAULT NULL,
  `approvedBy` INT NULL,
  `verifiedAt` TIMESTAMP NULL DEFAULT NULL,
  `usedCount` INT NOT NULL DEFAULT 0,
  `wonCount` INT NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `answer_bank_project_slug_uq` (`projectId`, `slug`),
  KEY `answer_bank_status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `answer_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `answerId` INT NULL,
  `questionId` INT NULL,
  `field` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `version` INT NOT NULL,
  `body` TEXT NOT NULL,
  `source` ENUM('rye','llm','cowork','import','seed') NOT NULL DEFAULT 'rye',
  `note` VARCHAR(500) NULL,
  `createdBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `answer_versions_answer_uq` (`answerId`, `field`, `version`),
  UNIQUE KEY `answer_versions_question_uq` (`questionId`, `version`),
  CONSTRAINT `answer_versions_answer_fk`
    FOREIGN KEY (`answerId`) REFERENCES `answer_bank`(`id`) ON DELETE CASCADE,
  CONSTRAINT `answer_versions_question_fk`
    FOREIGN KEY (`questionId`) REFERENCES `app_questions`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `funding_stage_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pipelineId` INT NOT NULL,
  `track` VARCHAR(20) NULL,
  `fromStage` VARCHAR(40) NULL,
  `toStage` VARCHAR(40) NULL,
  `actor` VARCHAR(20) NOT NULL DEFAULT 'rye',
  `actorUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `funding_stage_history_pipeline_idx` (`pipelineId`, `createdAt`),
  CONSTRAINT `funding_stage_history_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE CASCADE
);
