-- Rollback for 0064_application_events.sql
-- Drops the applicationEvents table (foreign key to applications)
DROP TABLE IF EXISTS applicationEvents;
