-- 0199: the Harvest Phase 4 hardened email send audit trail
-- (CREATION_STATION_PLAN.md v2 s5; CLAUDE_CODE_PROMPT_2026-07-16_HARVEST_PHASE4).
--
-- One row per send attempt. body_hash binds the confirm token to the exact
-- text that was previewed; idempotency_key makes a double-click a no-op;
-- ai_body/sent_body persist the ai-vs-shipped pair for audit. No recipient
-- PII: only the count is stored, the list is resolved from the newsletter
-- subscribers table at send time.

-- The weekly digest records its runs alongside bridge/generation/seed.
ALTER TABLE `harvest_runs` MODIFY `kind` enum('bridge','generation','seed','digest') NOT NULL;

CREATE TABLE IF NOT EXISTS `harvest_email_sends` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `item_id` int NOT NULL,
  `body_hash` char(64) NOT NULL,
  `recipient_count` int NOT NULL DEFAULT 0,
  `idempotency_key` varchar(64) NOT NULL,
  `status` enum('sent','failed') NOT NULL DEFAULT 'sent',
  `subject` varchar(300),
  `ai_body` mediumtext,
  `sent_body` mediumtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `harvest_email_sends_idem_unique` (`idempotency_key`),
  KEY `harvest_email_sends_owner_created_idx` (`owner_id`,`created_at`)
);
