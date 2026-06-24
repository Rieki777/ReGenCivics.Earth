-- 0142_movement_coordination: Phase 1 of the Movement Coordination Engine
-- per MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md.
--
-- Closes the two foundational gaps the audit found,
--   Gap A: no person-to-role link -> new roleHolders table.
--   Gap B: tasks are hardcoded, not data-driven -> new callTasks table.
-- Plus extends the recordings table to carry the raw / edited cut pair
-- and the LLM understanding outputs that subsequent phases will populate.
--
-- Run via the migration runner, never ad-hoc. Comments here intentionally
-- carry no semicolons because the runner splits naively on that character
-- and that bit us in 0137 and 0141. Period-only prose, please.

CREATE TABLE IF NOT EXISTS roleHolders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleSlug VARCHAR(64) NOT NULL,
  roleTitle VARCHAR(128) NOT NULL,
  kind ENUM('game','fund') NOT NULL DEFAULT 'game',
  circle VARCHAR(128),
  userId INT NULL,
  season VARCHAR(50),
  isActive TINYINT NOT NULL DEFAULT 1,
  notifyEmail TINYINT NOT NULL DEFAULT 1,
  notifyInApp TINYINT NOT NULL DEFAULT 1,
  aliases JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX roleHolders_roleSlug_idx (roleSlug),
  INDEX roleHolders_userId_idx (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS callTasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recordingId INT NOT NULL,
  sourceVideoId VARCHAR(32) NOT NULL,
  roleSlug VARCHAR(64),
  assigneeUserId INT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  sociocraticOverview JSON,
  bountyTokenType VARCHAR(16) NOT NULL DEFAULT 'regen',
  bountyAmount INT NOT NULL DEFAULT 0,
  evidenceQuote TEXT,
  evidenceTimestampSeconds INT,
  status ENUM('proposed','approved','open','claimed','submitted','completed','declined','expired') NOT NULL DEFAULT 'proposed',
  createdByAgent VARCHAR(64) NOT NULL DEFAULT 'coordination-engine',
  approvedBy INT NULL,
  claimedAt TIMESTAMP NULL,
  submittedArtifactUrl VARCHAR(512),
  submittedArtifactText TEXT,
  consentedBy INT NULL,
  completedAt TIMESTAMP NULL,
  rewardLedgerId INT NULL,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX callTasks_assignee_idx (assigneeUserId, status),
  INDEX callTasks_role_idx (roleSlug, status),
  INDEX callTasks_recording_idx (recordingId),
  INDEX callTasks_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE recordings
  ADD COLUMN youtubeVideoId VARCHAR(32) NULL UNIQUE,
  ADD COLUMN recordingKind ENUM('raw','edited') NOT NULL DEFAULT 'raw',
  ADD COLUMN editedYoutubeUrl VARCHAR(512) NULL,
  ADD COLUMN overview TEXT NULL,
  ADD COLUMN decisionsJson JSON NULL,
  ADD COLUMN actionItemsJson JSON NULL;
