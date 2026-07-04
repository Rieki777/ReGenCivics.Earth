-- Migration 0164: Assembly signals + synthesis cache (ASSEMBLY_PAGE_SPEC.md sections 4, 5, 9)
-- One adjustable -3..+3 signal per member per proposal (replaces the binary upvote),
-- and the per-proposal AI synthesis cache used from Phase 3 on.

CREATE TABLE IF NOT EXISTS proposal_signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  score TINYINT NOT NULL,
  moveNote VARCHAR(500) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_proposal_signal (proposalId, userId),
  KEY idx_signal_proposal (proposalId)
);

CREATE TABLE IF NOT EXISTS proposal_synthesis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  pros JSON,
  cons JSON,
  steelman TEXT,
  steelmanAddressed JSON,
  summary TEXT,
  sourceReplyCount INT NOT NULL DEFAULT 0,
  changelog JSON,
  lastSyncedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_synthesis_proposal (proposalId)
);

-- Assembly governance variables (spec section 10). Seeded with display metadata
-- so they surface on the Game Mechanics page. The community tunes its own
-- governance by the same mechanism as every other game variable.
-- maxValue is backtick-quoted because MAXVALUE is a MySQL reserved word (partitioning)
INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`) VALUES
('governance', 'assembly', 'governance.signal_advance_points', 'Signal: points to advance', 'Net signal points (sum of -3..+3 signals) a forming proposal needs before it can move to Decide', 12, 'integer', 12, 1, 500),
('governance', 'assembly', 'governance.signal_advance_avg', 'Signal: average floor', 'Minimum average signal score a forming proposal needs before it can move to Decide. The sentiment floor', 1.0, 'decimal', 1.0, 0, 3),
('governance', 'assembly', 'governance.signal_min_tier', 'Signal: minimum tier', 'Minimum citizenship tier to set a signal on a proposal (0=any signed-in member 1=co-creator). Config flip, off at launch', 0, 'integer', 0, 0, 1),
('governance', 'assembly', 'governance.synthesis_refresh_cooldown_min', 'Synthesis refresh cooldown', 'Minutes between AI synthesis refreshes on one proposal', 30, 'integer', 30, 5, 1440)
ON DUPLICATE KEY UPDATE `key` = `key`;
