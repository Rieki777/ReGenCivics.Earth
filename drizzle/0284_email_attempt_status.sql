-- Wave 0: every send attempt can be recorded, and a reminder offset can stay
-- open until each address actually went out.
-- Existing email_logs status values stay in their current order. New values
-- are appended so stored indexes do not move.
-- Existing event_auto_reminder_sends rows default to complete, so offsets
-- already claimed are not sent again on deploy.

ALTER TABLE email_logs
  MODIFY COLUMN status ENUM(
    'sent',
    'delivered',
    'bounced',
    'failed',
    'queued',
    'held',
    'blocked'
  ) NOT NULL DEFAULT 'sent';

CREATE INDEX email_logs_template_status_sentAt_idx ON email_logs (template, status, sentAt);
CREATE INDEX email_logs_inquiry_idx ON email_logs (template, inquiryType, inquiryId, status);

ALTER TABLE event_auto_reminder_sends
  ADD COLUMN status ENUM('complete', 'partial') NOT NULL DEFAULT 'complete';

CREATE TABLE IF NOT EXISTS event_auto_reminder_deliveries (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventId INT NOT NULL,
  offsetMinutes INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY event_auto_reminder_deliveries_unique (eventId, offsetMinutes, email),
  INDEX event_auto_reminder_deliveries_event_offset_idx (eventId, offsetMinutes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
