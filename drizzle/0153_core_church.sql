-- Migration 0153: Church of the Regenerative Earth (CORE) tables
-- Run with: npx tsx scripts/run-migration.ts drizzle/0153_core_church.sql
--   (or: npx tsx scripts/run-migration.ts --all)
--
-- Stands up the data model for core.regencivics.earth (ADR-18):
--   church_role_holders  data-driven priest/priestess payment rights
--   church_donations     Stripe donations + tithes (append-only once succeeded)
--   church_payouts       ledger of payments made by the church (intent + reconciliation)
--   elder_chat_messages  Ask Anastasia transcript log (moderation, rate limit, tuning)
--   elder_corpus_chunks  retrieval corpus over anastasia_canon.md (embeddings + FULLTEXT)
--
-- SEEDING NOTE: the two initial priest/priestess holders (accept + make payment
-- rights) are seeded by Rye AFTER deploy, using real user IDs from the DB. They
-- are a governance act, not source code. Do NOT hardcode names or user IDs here
-- or anywhere in source. See the handoff in CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md.
--
-- NOTE: the role title below (priest/priestess) was later renamed to the
-- single title "Steward" by migration 0155_core_steward_rename.sql (ADR-20).
-- This file is left as originally written. Run 0155 after this one.

CREATE TABLE IF NOT EXISTS church_role_holders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  role ENUM('priest','priestess') NOT NULL,
  canAcceptPayments TINYINT NOT NULL DEFAULT 0,
  canMakePayments TINYINT NOT NULL DEFAULT 0,
  grantedBy INT NULL,
  grantedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revokedAt TIMESTAMP NULL,
  INDEX church_role_holders_userId_idx (userId),
  INDEX church_role_holders_active_idx (userId, revokedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS church_donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripeSessionId VARCHAR(255) NULL,
  stripePaymentIntent VARCHAR(255) NULL,
  stripeSubscriptionId VARCHAR(255) NULL,
  donorUserId INT NULL,
  donorEmail VARCHAR(320) NULL,
  amountCents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'usd',
  giftInterval ENUM('one_time','monthly') NOT NULL DEFAULT 'one_time',
  status ENUM('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY church_donations_session_uq (stripeSessionId),
  INDEX church_donations_donor_idx (donorUserId),
  INDEX church_donations_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS church_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiatedByUserId INT NOT NULL,
  amountCents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'usd',
  purpose VARCHAR(500) NOT NULL,
  destinationRef VARCHAR(500) NULL,
  status ENUM('recorded','reconciled','void') NOT NULL DEFAULT 'recorded',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX church_payouts_initiator_idx (initiatedByUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS elder_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sessionId VARCHAR(64) NOT NULL,
  elder VARCHAR(64) NOT NULL DEFAULT 'anastasia',
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  retrievedChunkIds JSON NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX elder_chat_session_idx (sessionId, createdAt),
  INDEX elder_chat_elder_idx (elder, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS elder_corpus_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  elder VARCHAR(64) NOT NULL DEFAULT 'anastasia',
  book VARCHAR(255) NULL,
  section VARCHAR(512) NULL,
  chunkIndex INT NOT NULL,
  content TEXT NOT NULL,
  contentTokens INT NULL,
  embedding JSON NULL,
  embeddingModel VARCHAR(64) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX elder_corpus_elder_idx (elder, chunkIndex),
  FULLTEXT KEY elder_corpus_content_ft (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
