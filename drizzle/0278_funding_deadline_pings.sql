-- Funding engine Phase 2: deadline pings (FUNDING_ENGINE_PLAN v1.3, section 9,
-- "Done when: every row with a deadline_at gets its 21-, 7- and 2-day pings
-- exactly once, and no deadline is missed"). Additive.
--
-- admin_automations.type gains 'funding_deadlines', a standing routine like the
-- digests and the morning message, with the same toggle and the same lastResult
-- in the Overview. The runner treats it as due on every hourly tick; the job is
-- idempotent, so running it each hour costs a query and sends nothing new.
-- Precedent: 0231 widened this enum for brain_morning.
--
-- funding_deadline_pings records every ping sent. The unique key on
-- (pipelineId, deadlineAt, threshold) is what makes "exactly once" hold: a
-- runner claims a ping by inserting its row before sending, so two overlapping
-- cron ticks cannot both send it, and a failed send deletes its claim so the
-- next tick retries. A moved deadline is a new deadlineAt, so its pings start
-- over.
--
-- Seed the automation row with: npx tsx scripts/seed-funding-deadlines-automation.ts

ALTER TABLE admin_automations
  MODIFY COLUMN type ENUM('briefing_digest','attention_digest','registry_action','brain_morning','funding_deadlines') NOT NULL;

CREATE TABLE IF NOT EXISTS `funding_deadline_pings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pipelineId` INT NOT NULL,
  `deadlineAt` TIMESTAMP NOT NULL,
  `threshold` INT NOT NULL,
  `sentAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `funding_deadline_pings_once_uq` (`pipelineId`, `deadlineAt`, `threshold`),
  CONSTRAINT `funding_deadline_pings_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE CASCADE
);
