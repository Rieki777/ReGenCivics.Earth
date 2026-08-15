-- 0227: The $ReGen builders' pool (ADR-50).
--
-- ReGen Civics distributes a pool of $ReGen each lunar cycle across the free
-- third-party modules that villages are actually running. A module with a
-- price is excluded by construction: its builder is already paid by the
-- villages running it.
--
-- These tables hold STATEMENTS, never transactions. The hub computes what is
-- owed and a human executes the transfers through Hypha from the treasury.
-- Nothing in this codebase signs anything (server/blockchain.ts: "Read-only
-- Base blockchain queries, no wallet, no signing").

CREATE TABLE IF NOT EXISTS `modulePoolStatements` (
  `id` int AUTO_INCREMENT NOT NULL,
  -- Whole lunations since the Meeus reference new moon (shared/lunar.ts), the
  -- SAME numbering every village fork uses for its gratitude cycles. One
  -- statement per cycle, forever.
  `cycleNumber` int NOT NULL,
  `cycleStartsAt` timestamp NOT NULL,
  `cycleEndsAt` timestamp NOT NULL,
  -- open      claimed, nothing computed yet
  -- computing latched by a runner; a throw un-latches back to open
  -- computed  the statement exists and is final
  -- executed  a human made the transfers and said so
  `status` enum('open','computing','computed','executed') NOT NULL DEFAULT 'open',
  `poolAmount` int NOT NULL DEFAULT 0,
  `carryIn` int NOT NULL DEFAULT 0,
  `paid` int NOT NULL DEFAULT 0,
  `accrued` int NOT NULL DEFAULT 0,
  -- Flooring dust and sub-floor shares. Never minted, never rolled.
  -- poolAmount + carryIn = paid + accrued + unallocated, always.
  `unallocated` int NOT NULL DEFAULT 0,
  -- sha256 of shared/modulePool.ts statementSnapshotInput(...). Anybody can
  -- rebuild the inputs, hash them, and check this statement was not edited.
  `snapshotHash` varchar(64),
  -- How every roster village answered on statement night: ok / carried / absent.
  `roster` json,
  `computedAt` timestamp NULL,
  `executedAt` timestamp NULL,
  `executedBy` varchar(120),
  -- Transaction hashes a human pasted back. Recorded, never verified on chain in v1.
  `executionNote` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `modulePoolStatements_id` PRIMARY KEY(`id`),
  CONSTRAINT `module_pool_cycle_once` UNIQUE(`cycleNumber`)
);

CREATE TABLE IF NOT EXISTS `modulePoolShares` (
  `id` int AUTO_INCREMENT NOT NULL,
  `statementId` int NOT NULL,
  `moduleId` varchar(80) NOT NULL,
  -- The credit line, copied from the registry as it read that cycle. Frozen:
  -- a statement is history and must not change when the registry does.
  `builtBy` varchar(200),
  -- The builder's ReGen Civics handle. A lookup key, never a wallet address:
  -- an address in the registry would be asserted by whoever edits a file every
  -- fork is entitled to edit, for a payment somebody else receives.
  `builtByAccount` varchar(40),
  -- Resolved from that account's own profile at statement time, or NULL.
  `userId` int,
  `address` varchar(60),
  `villages` int NOT NULL DEFAULT 0,
  -- The exact pre-flooring share, kept for audit the way gratitude keeps it.
  `rawShare` decimal(18,6) NOT NULL DEFAULT 0,
  `amount` int NOT NULL DEFAULT 0,
  -- no-account and no-address are separate because they have different fixes:
  -- one builder links an address they already have, the other opens an account.
  `state` enum('payable','no-account','no-address','unusable-address','below-floor') NOT NULL,
  -- Which cycle this accrual started waiting in, so the three-cycle lapse can
  -- be computed without walking the whole history.
  `accruedSinceCycle` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `modulePoolShares_id` PRIMARY KEY(`id`),
  CONSTRAINT `module_pool_share_once` UNIQUE(`statementId`,`moduleId`)
);

CREATE INDEX `module_pool_share_state_idx` ON `modulePoolShares` (`state`,`accruedSinceCycle`);

-- The last answer each roster village gave.
--
-- A village that is down on statement night is not a village that turned its
-- modules off, and counting the two the same would cut a builder's share for
-- somebody else's outage. So a village that fails to answer contributes this
-- snapshot ONCE, flagged; the next failure contributes nothing until it
-- answers again. `carriedForCycle` is what makes "once" mean once.
CREATE TABLE IF NOT EXISTS `modulePoolVillageSnapshots` (
  `id` int AUTO_INCREMENT NOT NULL,
  -- The NETWORK_GAMES id from shared/networkRegistry.ts.
  `villageId` varchar(80) NOT NULL,
  `instanceId` varchar(80),
  -- Module ids serving at members or above, from the village's own
  -- /api/platform/info. Already public, already consented, counts only.
  `modules` json,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  -- The cycle this snapshot was last carried into. NULL means never carried.
  `carriedForCycle` int,
  CONSTRAINT `modulePoolVillageSnapshots_id` PRIMARY KEY(`id`),
  CONSTRAINT `module_pool_village_once` UNIQUE(`villageId`)
);
