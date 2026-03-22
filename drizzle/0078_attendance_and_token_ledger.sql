-- Migration 0078: Event Attendance + $ReGen Token Ledger
-- Adds tables to track who actually attends events and awards 33 $ReGen tokens per attendance.

-- ── Event Attendance ──────────────────────────────────────────────────────────
-- Tracks confirmed attendance per event. Marked by admin after the call.
-- Unique (eventId, email) prevents duplicate records and double-awards.
CREATE TABLE IF NOT EXISTS event_attendance (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  eventId           INT NOT NULL,
  email             VARCHAR(320) NOT NULL,
  name              VARCHAR(255) DEFAULT NULL,
  markedByAdminId   INT DEFAULT NULL,
  markedAt          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tokensAwarded     INT NOT NULL DEFAULT 33,
  tokenLedgerEntryId INT DEFAULT NULL,
  createdAt         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY eventAttendance_eventId_email_unique (eventId, email),
  KEY eventAttendance_eventId_idx (eventId),
  KEY eventAttendance_email_idx (email)
);

-- ── $ReGen Token Ledger ───────────────────────────────────────────────────────
-- Append-only ledger. Sum entries per email to compute balances.
-- Supports event attendance awards, quest completions, and future contribution tracking.
CREATE TABLE IF NOT EXISTS regen_token_ledger (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(320) NOT NULL,
  userId    INT DEFAULT NULL,
  amount    INT NOT NULL,
  reason    ENUM('event_attendance','quest_completion','community_contribution','referral','admin_grant','adjustment') NOT NULL,
  eventId   INT DEFAULT NULL,
  questId   VARCHAR(100) DEFAULT NULL,
  notes     VARCHAR(500) DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY regenTokenLedger_email_idx (email),
  KEY regenTokenLedger_reason_idx (reason),
  KEY regenTokenLedger_eventId_idx (eventId)
);
