-- Fix 229: Add stewardUserId to applications table
-- Tracks who owns/stewards each project. NULL = unclaimed (admin-seeded, no steward yet).
ALTER TABLE applications ADD COLUMN stewardUserId INT NULL DEFAULT NULL;

-- For any application that was NOT admin-seeded, the submitter is the steward.
-- Run this AFTER 0083_admin_seeded_apps.sql has been applied.
UPDATE applications SET stewardUserId = userId WHERE adminSeeded = 0;
