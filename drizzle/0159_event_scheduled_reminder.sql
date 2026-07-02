-- Durable admin-scheduled event reminders. The admin "send at a custom time"
-- path used an in-memory setTimeout (up to 7 days), which every Railway deploy
-- silently dropped. Persist the scheduled send on the event so the existing
-- /api/cron/event-reminders job can pick it up when due.
ALTER TABLE events ADD COLUMN reminderScheduledFor TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN reminderCustomSubject VARCHAR(200) NULL;
ALTER TABLE events ADD COLUMN reminderCustomBody TEXT NULL;
CREATE INDEX events_reminder_scheduled_idx ON events (reminderScheduledFor);
