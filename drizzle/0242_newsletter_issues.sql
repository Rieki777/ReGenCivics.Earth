-- PR1 Outbound hub: campaign tables for newsletter issues.
-- Send, confirm, and Resend dispatch ship in a later PR. These tables
-- hold drafts, audience snapshots, and (later) send history.
-- Crowd-pooling `campaigns` is a different product. Do not reuse that name.

CREATE TABLE IF NOT EXISTS `newsletter_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject` varchar(300) NOT NULL,
  `body` mediumtext NOT NULL,
  `layout` varchar(32) NOT NULL DEFAULT 'plain',
  `template_key` varchar(100) DEFAULT NULL,
  `audience` json DEFAULT NULL,
  `status` enum('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
  `scheduled_for` timestamp NULL DEFAULT NULL,
  `body_hash` char(64) DEFAULT NULL,
  `idempotency_key` varchar(64) DEFAULT NULL,
  `recipient_count` int NOT NULL DEFAULT 0,
  `sent_count` int NOT NULL DEFAULT 0,
  `failed_count` int NOT NULL DEFAULT 0,
  `created_by` int NOT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_issues_idempotency_unique` (`idempotency_key`),
  KEY `newsletter_issues_status_scheduled_idx` (`status`,`scheduled_for`),
  KEY `newsletter_issues_created_by_idx` (`created_by`,`created_at`)
);

CREATE TABLE IF NOT EXISTS `newsletter_issue_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `issue_id` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `source` varchar(32) DEFAULT NULL,
  `status` enum('pending','sent','failed','skipped_unsub') NOT NULL DEFAULT 'pending',
  `email_log_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_issue_recipients_issue_email_unique` (`issue_id`,`email`),
  KEY `newsletter_issue_recipients_issue_idx` (`issue_id`),
  KEY `newsletter_issue_recipients_email_log_idx` (`email_log_id`)
);

ALTER TABLE `emailTemplates`
  ADD COLUMN `kind` varchar(16) NOT NULL DEFAULT 'application';
