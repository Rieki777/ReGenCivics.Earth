-- 0137_admin_automations: standing admin automations (scheduled routines).
--
-- The executive-assistant layer runs these for the CEO on a cadence. v1
-- routines are read-only digests (briefing_digest, attention_digest) that
-- prepare an update, nothing mutates on a timer. actionId/actionInput exist
-- so a future reversible, criteria-based registry action can run on a
-- schedule without a schema change.
--
-- The cron runner (POST /api/cron/admin-automations) selects enabled rows
-- whose cadence is due relative to lastRunAt, so the (enabled, lastRunAt)
-- index keeps that sweep cheap.

CREATE TABLE IF NOT EXISTS admin_automations (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  type         ENUM('briefing_digest','attention_digest','registry_action') NOT NULL,
  cadence      ENUM('hourly','daily','weekly') NOT NULL DEFAULT 'daily',
  enabled      TINYINT      NOT NULL DEFAULT 1,
  actionId     VARCHAR(80)  NULL,
  actionInput  JSON         NULL,
  createdBy    INT          NOT NULL,
  lastRunAt    TIMESTAMP    NULL,
  lastResult   TEXT         NULL,
  runCount     INT          NOT NULL DEFAULT 0,
  createdAt    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_automations_due (enabled, lastRunAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
