-- 0145_bounty_engine.sql
-- Bounty Engine: replaces the callTasks table with a unified bounty system
-- supporting two-sided code-contribution bounties and call tasks through
-- a single hardened payout path.
--
-- Run via: npx tsx scripts/run-migration.ts drizzle/0145_bounty_engine.sql

-- ── 1. Core bounty lifecycle table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bounties` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sourceType` ENUM('call_task','contribution') NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `tokenType` varchar(16) NOT NULL DEFAULT 'regen',
  `tier` ENUM('trivial','small','medium','large') NULL,
  `workStatus` ENUM('proposed','accepted','open','claimed','in_review','completed','declined','expired') NOT NULL DEFAULT 'proposed',
  `approvedBy` int NULL,
  `declinedReason` text NULL,
  `completionChecklist` json NULL,
  `expiresAt` timestamp NULL,
  -- contribution adapter fields (null for call_task)
  `kind` ENUM('fix','feature') NULL,
  `sourceForumPostId` int NULL,
  `githubRepo` varchar(255) NULL,
  `githubIssueNumber` int NULL,
  `mergedPrNumbers` json NULL,
  -- call_task adapter fields (null for contribution)
  `recordingId` int NULL,
  `roleSlug` varchar(64) NULL,
  `evidenceQuote` text NULL,
  `evidenceTs` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `bounties_status_type_idx` (`workStatus`, `sourceType`),
  INDEX `bounties_github_idx` (`githubRepo`(191), `githubIssueNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Bounty roles: the only owner of payment state ──────────────────────
CREATE TABLE IF NOT EXISTS `bounty_roles` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bountyId` int NOT NULL,
  `role` ENUM('doer','proposer','shipper','reviewer','booster') NOT NULL,
  `userId` int NULL,
  `amount` int NOT NULL DEFAULT 0,
  `payStatus` ENUM('unfilled','filled','payable','held','paid','reversed','void') NOT NULL DEFAULT 'unfilled',
  `ledgerId` int NULL,
  `filledByLog` json NULL,
  `paidAt` timestamp NULL,
  `claimableAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `bounty_roles_bountyId_idx` (`bountyId`),
  INDEX `bounty_roles_user_pay_idx` (`userId`, `payStatus`),
  FOREIGN KEY (`bountyId`) REFERENCES `bounties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Immutable audit log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bounty_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bountyId` int NOT NULL,
  `roleId` int NULL,
  `actorUserId` int NULL,
  `event` varchar(48) NOT NULL,
  `detail` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `bounty_events_bountyId_createdAt_idx` (`bountyId`, `createdAt`),
  FOREIGN KEY (`bountyId`) REFERENCES `bounties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Webhook delivery dedup ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
  `deliveryId` varchar(64) NOT NULL PRIMARY KEY,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Bounty permissions: who is empowered ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `bounty_permissions` (
  `userId` int NOT NULL PRIMARY KEY,
  `canAccept` tinyint NOT NULL DEFAULT 0,
  `canReverse` tinyint NOT NULL DEFAULT 0,
  `grantedBy` int NULL,
  `grantedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Add GitHub identity fields to player_profiles ─────────────────────────
ALTER TABLE `player_profiles`
  ADD COLUMN IF NOT EXISTS `githubHandle` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `githubId` int NULL,
  ADD COLUMN IF NOT EXISTS `githubLinkedAt` timestamp NULL;

-- ── 7. Add idempotency key to user_token_ledger ──────────────────────────────
ALTER TABLE `user_token_ledger`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` varchar(128) NULL,
  ADD UNIQUE INDEX IF NOT EXISTS `user_token_ledger_idempotencyKey_idx` (`idempotencyKey`);

-- ── 8. Drop the legacy callTasks table ───────────────────────────────────────
DROP TABLE IF EXISTS `callTasks`;
