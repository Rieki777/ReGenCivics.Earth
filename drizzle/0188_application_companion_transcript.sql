-- 0188: conversation record from the Gardener on the land application.
-- The /apply flow is now chat-first: the Gardener (Conversational Companion)
-- fills the form by talking with the applicant. The transcript is saved with
-- the draft so reviewers can read how the applicant spoke about their project,
-- not just the extracted fields. MEDIUMTEXT because 60 capped turns can pass
-- the 64KB TEXT limit. Nullable; form-only applications leave it NULL.
ALTER TABLE applications
  ADD COLUMN companionTranscript MEDIUMTEXT NULL;
