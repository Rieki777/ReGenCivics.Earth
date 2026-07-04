-- 0163: Gratitude lunar cycles + proportional $ReGen distribution
-- Implements GRATITUDE_SYSTEM_SPEC.md / GRATITUDE_TAB_BUILD_SPEC.md.
-- Cycles are lunations (new moon to new moon) computed deterministically
-- in shared/lunar.ts. cycleNumber is the lunation count since the
-- 2000-01-06 reference new moon, so it is stable across environments.

CREATE TABLE IF NOT EXISTS gratitude_cycles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycleNumber INT NOT NULL,
  startsAt TIMESTAMP NOT NULL,
  endsAt TIMESTAMP NOT NULL,
  -- Snapshot of gratitude.regen_distribution.pool_per_cycle at open time
  poolPerCycle INT NOT NULL DEFAULT 10000,
  -- open -> distributing -> closed
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  distributedAt TIMESTAMP NULL,
  totalWeight DOUBLE NULL,
  UNIQUE KEY uniq_cycle_number (cycleNumber),
  INDEX idx_gratitude_cycle_status (status)
);

-- Acknowledgment columns on the existing log. Legacy rows keep NULL cycleId;
-- MySQL composite UNIQUE ignores rows where any key column is NULL, so the
-- one-ack-per-recipient-per-cycle guard only binds new (cycle-tagged) sends.
ALTER TABLE gratitudeLog ADD COLUMN cycleId INT NULL;
ALTER TABLE gratitudeLog ADD COLUMN weight DOUBLE NULL;
ALTER TABLE gratitudeLog ADD INDEX idx_grat_cycle_recipient (cycleId, recipientId);
ALTER TABLE gratitudeLog ADD INDEX idx_grat_cycle_sender (cycleId, senderId);
ALTER TABLE gratitudeLog ADD UNIQUE KEY uniq_ack_per_cycle (senderId, recipientId, cycleId);

-- Per-user per-cycle budget snapshot (tier, multiplier, streak at first send).
CREATE TABLE IF NOT EXISTS gratitude_cycle_budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  cycleId INT NOT NULL,
  tier VARCHAR(16) NOT NULL,
  baseBudget INT NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL,
  streakCycles INT NOT NULL DEFAULT 0,
  streakBonus DECIMAL(4,3) NOT NULL DEFAULT 0,
  effectiveBudget INT NOT NULL,
  uniqueRecipients INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_cycle (userId, cycleId),
  INDEX idx_grat_budget_cycle (cycleId)
);

-- End-of-cycle distribution ledger. uniq_dist makes the batch job idempotent
-- at the DB layer (paired with an idempotencyKey on user_token_ledger).
CREATE TABLE IF NOT EXISTS gratitude_distributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycleId INT NOT NULL,
  userId INT NOT NULL,
  weightReceived DOUBLE NOT NULL,
  poolShare DECIMAL(18,6) NOT NULL,
  creditedAmount INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dist (cycleId, userId),
  INDEX idx_grat_dist_user (userId)
);

-- Notifications: add the gratitude type (and quest_complete, which code
-- already inserts with a cast) plus a direct deep-link column so the bell
-- can navigate without a client-side type map.
ALTER TABLE user_notifications MODIFY COLUMN type ENUM(
  'contribution_accepted',
  'contribution_rejected',
  'campaign_milestone',
  'new_contribution',
  'system',
  'quest_complete',
  'gratitude'
) NOT NULL;
ALTER TABLE user_notifications ADD COLUMN link VARCHAR(500) NULL;
