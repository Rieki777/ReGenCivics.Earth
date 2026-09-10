-- Auto-scheduled event reminders with audience rules by event kind.
--
-- Season 2 (events.type = 'episode' and/or season = 'Season 2'):
--   default audience is land-project applications with status
--   'approved' or 'active' (the Application Reviews "approved" bucket plus
--   projects already in-season). Emails come from the applicant's user
--   account, same as applications.listEmailRecipients.
--
-- Open Access (events.type = 'open', catalog rows titled Open Access):
--   default audience is every active newsletter subscriber, unioned with
--   reminder signups for that event so a person who asked for a reminder
--   is not dropped if they are not on the newsletter.
--
-- Custom / special (events.type = 'special'):
--   admin must pick at least one source (investors, LOIs, newsletter
--   sources, event signups, application statuses). Enabling with an empty
--   custom selection is rejected.
--
-- The existing hourly POST /api/cron/event-reminders job fires due offsets.
-- Unique (eventId, offsetMinutes) makes a repeat run a no-op.

CREATE TABLE IF NOT EXISTS event_auto_reminders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventId INT NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0,
  audienceMode ENUM('season2_approved', 'open_access', 'custom') NOT NULL,
  audienceConfig JSON NULL,
  offsetsJson JSON NOT NULL,
  customSubject VARCHAR(200) NULL,
  customBody TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY event_auto_reminders_eventId (eventId),
  INDEX event_auto_reminders_enabled_idx (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_auto_reminder_sends (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventId INT NOT NULL,
  offsetMinutes INT NOT NULL,
  sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recipientCount INT NOT NULL DEFAULT 0,
  UNIQUE KEY event_auto_reminder_sends_unique (eventId, offsetMinutes),
  INDEX event_auto_reminder_sends_eventId_idx (eventId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
