-- 0228: The builders' pool splits by reach, recycles the platform's share, and
-- can hand a payable line to Hypha (ADR-51, founder rulings R59 / R64 / R72).
--
-- MIGRATION NUMBER NOT ALLOCATED BY THE COORDINATOR. Round 7's Lane PAYOUT
-- brief permits a migration and did not name a number. 0228 is the next free
-- one at fb32af1, and the coordinator should confirm or RENAME IT BEFORE IT IS
-- APPLIED. Renaming after it has been applied re-runs the file, because the
-- applied-migrations ledger keys on filename, and the ADD COLUMNs below would
-- then fail the boot.
--
-- 0227 HAS NEVER BEEN APPLIED TO PRODUCTION (measured 2026-08-29: the last row
-- in _migrations_applied is 0226 and none of the three modulePool* tables
-- exists). The runner applies in order, so 0227 then this, and the ALTERs below
-- find their tables. Nothing here assumes 0227 already ran.
--
-- WHAT CHANGED AND WHY.
--
-- The split was by how many villages had a module SWITCHED ON, and it dropped
-- every module the hub had no builder record for before working out the
-- denominator, so the platform's own modules never entered it. Module Library
-- Contract clause 14 promises payment "proportional to how many members open
-- it", and R64 says the platform's modules earn on the same footing and their
-- share returns to the ReGen Civics gratitude pool to be given out. So the
-- weight is now reach, the platform is in the denominator, and there is a row
-- for every recycled amount so it can be seen rather than asserted.

-- ── The pool amount, so an operator can actually set it ────────────────────
--
-- `pool.regen_per_cycle` has been read by the statement job since 0227 through
-- getGameVariableOr(key, 0) and HAS NEVER HAD A ROW. The admin panel edits
-- game variables by id through applyVariableChange, which is an UPDATE against
-- an existing row and answers "Game variable not found" for anything else, so
-- there has been no way to set this from the admin UI at all. The code comment
-- in shared/gameMechanics.ts said the machinery "starts paying the cycle after
-- somebody sets this in the admin UI", which was not true of any build that has
-- ever shipped. This row is what makes it true.
--
-- Value 0 on purpose: the amount is a money decision and it is Rye's. A row
-- with 0 in it is inert in exactly the same way as a missing row, and unlike a
-- missing row it can be changed by the person whose decision it is.
--
-- Bounds: 0 so the pool can be turned off again without a migration, and
-- 100000 to match gratitude.pool_per_cycle's ceiling. They are also the
-- governance auto-apply hard bounds, so a ratified proposal cannot move the
-- pool outside them either.
INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit)
VALUES
  ('pool', 'builders', 'pool.regen_per_cycle', 'Builders pool per cycle',
   'The $ReGen ReGen Civics puts into the builders pool each lunar cycle, split across every module villages are running in proportion to how many members opened it. Platform-built modules earn on the same footing and their share returns to the ReGen Civics gratitude pool. 0 pays nobody and recycles nothing.',
   0, 'integer', 0, 0, 100000, '$ReGen')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- ── The statement gains the recycled total ─────────────────────────────────
-- poolAmount + carryIn = paid + accrued + recycled + unallocated, always.
ALTER TABLE `modulePoolStatements`
  ADD COLUMN `recycled` int NOT NULL DEFAULT 0 AFTER `accrued`;

-- ── A share line gains reach, provenance, and where its payment went ───────
ALTER TABLE `modulePoolShares`
  -- Summed across counting villages, each capped at 1.0 by the village and
  -- again by the hub. THE WEIGHT. `villages` stays, demoted to a reported
  -- count, because a reader still wants to know how many places ran it.
  ADD COLUMN `reach` decimal(18,6) NOT NULL DEFAULT 0 AFTER `villages`,
  ADD COLUMN `membersReached` int NOT NULL DEFAULT 0 AFTER `reach`,
  -- The platform built it: it earned, and its share recycles rather than
  -- being sent anywhere.
  ADD COLUMN `platformBuilt` tinyint(1) NOT NULL DEFAULT 0 AFTER `builtByAccount`,
  -- A reviewed line in shared/moduleBuilders.ts backs this builder. False means
  -- the only source is a village's own manifest, which names a builder and
  -- never authorises a payment.
  ADD COLUMN `attested` tinyint(1) NOT NULL DEFAULT 0 AFTER `platformBuilt`,
  -- The Hypha Bridge handoff this line was sent through, and what came back.
  -- Null until somebody opens the proposal. `paidTxHash` is written by the
  -- Alchemy webhook when the treasury space executes it, never by hand.
  ADD COLUMN `bridgeKey` varchar(16) AFTER `accruedSinceCycle`,
  ADD COLUMN `bridgeOpenedAt` timestamp NULL AFTER `bridgeKey`,
  ADD COLUMN `paidTxHash` varchar(80) AFTER `bridgeOpenedAt`,
  ADD COLUMN `paidAt` timestamp NULL AFTER `paidTxHash`;

-- `recycled` and `unattested` are new settlement states. Extending the enum
-- rather than storing a word in a varchar keeps the database refusing a state
-- no code knows about, which is what caught the old five-state set being
-- written to by a build that knew six.
ALTER TABLE `modulePoolShares`
  MODIFY COLUMN `state` enum('payable','recycled','unattested','no-account','no-address','unusable-address','below-floor') NOT NULL;

CREATE INDEX `module_pool_share_bridge_idx` ON `modulePoolShares` (`bridgeKey`);

-- ── A carried village has to contribute the REACH it last reported ─────────
-- A list of module ids carries no reach, so a carried village used to
-- contribute a set of names to a split that no longer counts names.
ALTER TABLE `modulePoolVillageSnapshots`
  ADD COLUMN `usageReport` json AFTER `modules`;

-- ── Every recycled amount, as a row somebody can read ──────────────────────
--
-- R59: a village or an author should be able to SEE the platform's share going
-- back in rather than into a pocket, and the transparency is the point rather
-- than a nicety. This table is that receipt, and it is also what makes the
-- recycling idempotent: the pool statement is written before the recycle runs,
-- so every retry path reaches the credit with the statement already in place,
-- and a unique pool cycle number is the only thing stopping a retry from
-- handing the community the same $ReGen twice.
CREATE TABLE IF NOT EXISTS `modulePoolRecycles` (
  `id` int AUTO_INCREMENT NOT NULL,
  -- The builders' pool cycle whose platform share this is.
  `poolCycleNumber` int NOT NULL,
  -- The gratitude cycle it was added to. Not the same lunation: the pool
  -- settles a cycle that has closed and the gratitude cycle it lands in is the
  -- one open at that moment.
  `gratitudeCycleId` int NOT NULL,
  `gratitudeCycleNumber` int NOT NULL,
  `amount` int NOT NULL,
  `appliedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `modulePoolRecycles_id` PRIMARY KEY(`id`),
  CONSTRAINT `module_pool_recycle_once` UNIQUE(`poolCycleNumber`)
);

-- ── The Hypha Bridge learns the source that pays a builder ─────────────────
--
-- Any handoff to an on-chain action goes through the bridge as a new intent
-- (CLAUDE.md, and the bridge README's hard rule). The intent is
-- `module-pool-payout`, form kind `deploy_funds`, and this enum value is what
-- lets the webhook receiver tell a builder payment from a fund grant when
-- Alchemy reports the space executed it.
ALTER TABLE `hyphaBridges`
  MODIFY COLUMN `source` enum('loomio_decision','crowdpool','contribution_claim','fund_grant','expense','exit','redeem_tokens','quest_completion','module_pool','other') NOT NULL;
