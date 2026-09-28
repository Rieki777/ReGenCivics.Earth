-- A private status link for people who offered without an account.
--
-- ADDITIVE ONLY, and safe to apply before the deploy that reads it: two new
-- tables, nothing existing changes. Old code never reads them.
--
-- contribution_status_tokens: one row per issued link. The link carries a
-- random 256-bit token in its URL fragment (/offer#<token>); only the token's
-- SHA-256 (hex) is stored, so a database read never yields a working link.
-- Each token reaches one contribution and expires after 180 days
-- (server/lib/offer-status.ts). A contribution may hold several live tokens:
-- the one on the success screen and a fresh one in each accepted or declined
-- email. expiresAt TIMESTAMP NOT NULL mirrors email_tokens.
--
-- contribution_messages: short notes a contributor sends the stewards from
-- that page, sanitized and rate limited (at most 5 per offer per 24 hours),
-- reaching the stewards through the notification spine (contributor_reply).
--
-- MariaDB and MySQL 8+ compatible. Build spec 2026-09-27, section 3.4.

CREATE TABLE IF NOT EXISTS `contribution_status_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contributionId` INT NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `lastUsedAt` TIMESTAMP NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `contribution_status_tokens_hash_uq` (`tokenHash`),
  KEY `contribution_status_tokens_contribution_idx` (`contributionId`)
);

CREATE TABLE IF NOT EXISTS `contribution_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contributionId` INT NOT NULL,
  `body` VARCHAR(1000) NOT NULL,
  `via` ENUM('status_link') NOT NULL DEFAULT 'status_link',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `contribution_messages_contribution_idx` (`contributionId`, `createdAt`)
);
