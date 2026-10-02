-- A-2: store each Resend webhook once, and let a complaint be its own status.
-- Append only. Existing email_logs status indexes stay put.
-- Run after 0284_email_attempt_status.sql.

ALTER TABLE email_logs
  MODIFY COLUMN status ENUM(
    'sent',
    'delivered',
    'bounced',
    'failed',
    'queued',
    'held',
    'blocked',
    'complained'
  ) NOT NULL DEFAULT 'sent';

CREATE TABLE IF NOT EXISTS email_webhook_events (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  svixId VARCHAR(255) NOT NULL,
  eventType VARCHAR(64) NOT NULL,
  resendEmailId VARCHAR(255) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY email_webhook_events_svix_idx (svixId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
