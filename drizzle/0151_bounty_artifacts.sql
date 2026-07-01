-- Migration 0151: bounty_artifacts (proof-of-work submissions for call tasks)
-- Run with: npx tsx scripts/run-migration.ts drizzle/0151_bounty_artifacts.sql
--
-- Phase 2 of the coordination engine. A call-task doer submits proof-of-work
-- before the maintainer completes and pays. Reuses the quest_completions
-- artifact shape. Keyed to the bounty plus the submitting user.

CREATE TABLE IF NOT EXISTS bounty_artifacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bountyId INT NOT NULL,
  roleId INT NULL,
  userId INT NOT NULL,
  artifactType ENUM('photo','text','link','video') NOT NULL DEFAULT 'text',
  artifactUrl VARCHAR(1000) NULL,
  artifactText TEXT NULL,
  caption VARCHAR(500) NULL,
  videoThumbnailUrl VARCHAR(1000) NULL,
  videoDurationSeconds INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX bounty_artifacts_bountyId_idx (bountyId)
);
