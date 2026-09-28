-- Season Schedule notes (ADR-65): whoever writes a note chooses whether it
-- shows on the page for the whole cohort or stays with the organizers.
-- Private is the default, and an admin can take a public note down.
-- Additive: old code never reads the column.

ALTER TABLE season_feedback ADD COLUMN isPublic TINYINT NOT NULL DEFAULT 0;
