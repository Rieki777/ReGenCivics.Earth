-- 0197: Fleet qualification via the Flagkeeper companion.
-- Raise-your-flag now opens a conversation with the Flagkeeper (a new form
-- companion persona) who draws out the applicant's story: why regeneration
-- matters to them, their vision for sailing with the fleet, what they want to
-- give, and what they hope to receive. needsText/offersText already exist from
-- 0196. These three columns hold the rest of the story plus the full
-- conversation record for the crew reviewing the lead (same pattern as
-- applications.companionTranscript).

ALTER TABLE `ship_fleet_applications`
  ADD COLUMN `whyRegeneration` text NULL,
  ADD COLUMN `fleetVision` text NULL,
  ADD COLUMN `companionTranscript` text NULL;
