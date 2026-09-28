-- 0262_ally_steward_sage_wiring.sql
--
-- Ally Steward + Sage measurement wiring (QUEST_PAGE_AND_PATH_PROGRESSION_SPEC).
--
-- 1) regen_civics_swaps — durable log of confirmed resource swaps AND token
--    swaps with ReGen Civics. Ally Steward requires at least one confirmed
--    row of each kind for the member. Empty log = unmet.
--
--    Resource rows: who, what exchanged, when, confirmation.
--    Token rows carry placeholders a future Hypha-on-Base bridge can fill:
--    counterparty ReGen Civics, chain base, venue hypha, tx ref, token,
--    amounts, direction, status, time. NO live RPC / wallet / issuance here.
--
--    Writes are admin/server only (see server/db/regenCivicsSwaps.ts). There
--    is no member "I swapped" button in this package.
--
-- 2) daily_contribution_snapshots — per-user daily score / rank / percentile
--    for Sage. Sage bar: Steward on at least one path AND percentile in the
--    top 20% (percentile >= 80) for >= 80% of season days that have snapshots.
--    No snapshots = unmet.
--
-- Column COMMENTs omit semicolons so statement-splitters that split on ";"
-- do not break mid-string.
--
-- ADDITIVE ONLY. MariaDB / MySQL 8+ compatible.

CREATE TABLE IF NOT EXISTS `regen_civics_swaps` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL COMMENT 'Member who swapped with ReGen Civics',
  `swapKind` ENUM('resource', 'token') NOT NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',

  -- Resource swap: what was exchanged (tools, materials, labor, etc.)
  `resourceDescription` TEXT NULL,

  -- Token swap: Hypha-on-Base bridge placeholders (filled later, no live chain I/O)
  `counterparty` VARCHAR(128) NULL COMMENT 'Always ReGen Civics for token swaps',
  `chain` VARCHAR(32) NULL COMMENT 'e.g. base',
  `venue` VARCHAR(32) NULL COMMENT 'e.g. hypha',
  `txRef` VARCHAR(128) NULL COMMENT 'On-chain or bridge transaction reference',
  `tokenSymbol` VARCHAR(64) NULL,
  `amountIn` DECIMAL(36, 18) NULL,
  `amountOut` DECIMAL(36, 18) NULL,
  `direction` ENUM('in', 'out', 'swap') NULL,

  `confirmedAt` TIMESTAMP NULL,
  `confirmedBy` INT NULL COMMENT 'Admin/server actor who confirmed the swap',
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `regen_civics_swaps_userId_idx` (`userId`),
  INDEX `regen_civics_swaps_kind_status_idx` (`swapKind`, `status`),
  INDEX `regen_civics_swaps_user_kind_status_idx` (`userId`, `swapKind`, `status`),
  INDEX `regen_civics_swaps_confirmedAt_idx` (`confirmedAt`)
);

CREATE TABLE IF NOT EXISTS `daily_contribution_snapshots` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `snapshotDate` DATE NOT NULL COMMENT 'UTC calendar day of the snapshot',
  `score` DOUBLE NOT NULL DEFAULT 0,
  `rank` INT NOT NULL COMMENT '1 = highest score that day',
  `percentile` DOUBLE NOT NULL COMMENT '0 to 100, top 20% is at least 80',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY `daily_contribution_snapshots_user_date_uq` (`userId`, `snapshotDate`),
  INDEX `daily_contribution_snapshots_date_idx` (`snapshotDate`),
  INDEX `daily_contribution_snapshots_user_date_pct_idx` (`userId`, `snapshotDate`, `percentile`)
);
