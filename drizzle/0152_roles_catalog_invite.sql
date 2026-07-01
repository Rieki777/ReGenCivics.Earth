-- Migration 0152: roles catalog + invite (pending members) + assignment audit
-- Run with: npx tsx scripts/run-migration.ts drizzle/0152_roles_catalog_invite.sql
--
-- Phase 3 of the coordination engine. Roles move into the database as the
-- source of truth, seeded from client/src/data/gameRoles.ts. New members join
-- by invite (pending_members), assignable to a role before they accept.
-- role_assignment_log records who assigned or removed a holder, and when.

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(128) NOT NULL,
  characterName VARCHAR(128) NULL,
  tagline VARCHAR(500) NULL,
  emoji VARCHAR(16) NULL,
  characterImage VARCHAR(512) NULL,
  sceneImage VARCHAR(512) NULL,
  purpose TEXT NULL,
  circle VARCHAR(128) NULL,
  powers JSON NULL,
  rights JSON NULL,
  responsibilities JSON NULL,
  domains TEXT NULL,
  band INT NULL,
  tokenAward VARCHAR(128) NULL,
  maxTokenAward VARCHAR(128) NULL,
  hoursPerWeek INT NULL,
  deliverables JSON NULL,
  seed TEXT NULL,
  harvest TEXT NULL,
  seasons JSON NULL,
  assignment VARCHAR(255) NULL,
  color VARCHAR(32) NULL,
  cardImagePosition VARCHAR(64) NULL,
  kind ENUM('game','fund') NOT NULL DEFAULT 'game',
  specialContent JSON NULL,
  aliases JSON NULL,
  active TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX roles_kind_idx (kind)
);

CREATE TABLE IF NOT EXISTS pending_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  inviteToken VARCHAR(64) NOT NULL,
  status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  userId INT NULL,
  invitedBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acceptedAt TIMESTAMP NULL,
  INDEX pending_members_token_idx (inviteToken),
  INDEX pending_members_email_idx (email)
);

CREATE TABLE IF NOT EXISTS role_assignment_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleSlug VARCHAR(64) NOT NULL,
  action ENUM('assigned','removed','invited') NOT NULL,
  targetUserId INT NULL,
  targetPendingId INT NULL,
  targetLabel VARCHAR(200) NULL,
  actorUserId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX role_assignment_log_slug_idx (roleSlug)
);

ALTER TABLE roleHolders
  ADD COLUMN pendingMemberId INT NULL;
