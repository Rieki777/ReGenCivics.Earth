-- Migration 0167: governance_executions (ASSEMBLY_PAGE_SPEC.md sections 7, 9)
-- Append-only record of the Evolution Engine's work: every ratified payload
-- that executed (or failed to). Rows only ever transition status/detail/
-- executedAt, never disappear.

CREATE TABLE IF NOT EXISTS governance_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  kind ENUM('variable_change','content','feature') NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','applied','shipping','shipped','paused','failed','rolled_back') NOT NULL DEFAULT 'pending',
  detail JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executedAt TIMESTAMP NULL,
  KEY idx_execution_proposal (proposalId)
);

-- Correction to 0166 for environments that ran it before the fix landed:
-- percentage variables stored as points (5, 10) had been given 0..1 bounds.
UPDATE game_variables SET `maxValue` = 100 WHERE valueType = 'percentage' AND value > 1 AND `maxValue` = 1;
