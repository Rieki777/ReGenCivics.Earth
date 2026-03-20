ALTER TABLE applications ADD COLUMN IF NOT EXISTS internalNotes TEXT;
ALTER TABLE investor_inquiries ADD COLUMN IF NOT EXISTS internalNotes TEXT;
ALTER TABLE general_inquiries ADD COLUMN IF NOT EXISTS internalNotes TEXT;
