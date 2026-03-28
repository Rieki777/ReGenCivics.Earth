-- Fix 226: Add adminSeeded flag to applications table
-- Marks season 1 admin-seeded applications so they don't appear in My Submissions
ALTER TABLE applications ADD COLUMN adminSeeded TINYINT(1) NOT NULL DEFAULT 0;
UPDATE applications SET adminSeeded = 1 WHERE submittedAt IS NULL OR submittedAt < '2026-03-01';
