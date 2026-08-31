-- 0231_admin_automation_brain_morning: extend the admin_automations.type enum
-- so the second brain's morning message is a standing routine like the digests,
-- with the same enable/disable toggle, the same lastRunAt and the same
-- lastResult surface in the Overview.
--
-- Precedent: 0141 widened the cadence enum on this same table. Additive, no
-- backfill: existing rows keep their type.
--
-- The runner gates brain_morning on wall-clock time rather than on cadence
-- (first hourly tick at or after 08:00 America/Los_Angeles, once per calendar
-- day in that zone), so the cadence column is set to 'daily' for readability
-- and is not what decides when it fires. See server/routes/adminAutomations.ts.
--
-- Seed the row with: npx tsx scripts/seed-brain-morning-automation.ts
ALTER TABLE admin_automations
  MODIFY COLUMN type ENUM('briefing_digest','attention_digest','registry_action','brain_morning') NOT NULL;
