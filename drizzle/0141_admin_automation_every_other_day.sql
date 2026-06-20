-- 0141_admin_automation_every_other_day: extend the admin_automations.cadence
-- enum so a standing automation can fire every 48h, not just hourly / daily /
-- weekly. The runner (server/routes/adminAutomations.ts) gates on the
-- (lastRunAt, cadence) pair, so the new value is the whole story and no
-- backfill is needed.
ALTER TABLE admin_automations
  MODIFY COLUMN cadence ENUM('hourly','daily','every_other_day','weekly') NOT NULL DEFAULT 'daily';
