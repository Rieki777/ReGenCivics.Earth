-- Rollback for 0066_entity_notes.sql
-- Removes internalNotes columns added to applications, investor_inquiries, and general_inquiries
ALTER TABLE applications DROP COLUMN IF EXISTS internalNotes;
ALTER TABLE investor_inquiries DROP COLUMN IF EXISTS internalNotes;
ALTER TABLE general_inquiries DROP COLUMN IF EXISTS internalNotes;
