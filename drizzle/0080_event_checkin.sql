-- #16: Add checkinToken to events for self-service QR check-in
ALTER TABLE `events` ADD COLUMN `checkinToken` VARCHAR(64) DEFAULT NULL;

-- #18: Add cancelledAt to event_signups for per-event unsubscribe
ALTER TABLE `event_signups` ADD COLUMN `cancelledAt` TIMESTAMP DEFAULT NULL;
