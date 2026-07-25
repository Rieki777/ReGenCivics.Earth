-- Fact verification for composed drafts (The Harvest, Phase 5+).
--
-- The voice grader (server/lib/voice-grader.ts) already checks HOW a draft
-- reads. Nothing checked whether it was TRUE. server/lib/content-verify.ts
-- extracts the factual claims from each drafted surface and traces them to the
-- source material the publication was composed from, plus the canon facts in
-- server/lib/content-canon.ts. The classic failure it catches is the
-- RCVoice/RGVoice token swap, which reads perfectly and is simply false. This
-- matters most on investor-facing surfaces, where a confidently wrong claim is
-- a liability rather than a typo.
--
-- verification_status is the MACHINE verdict on truth and is deliberately kept
-- separate from publication_targets.status, which stays the human workflow
-- state (draft, approved, scheduled, published, failed). harvest.approveTarget
-- refuses while a block-level flag is unresolved, and editing a draft resets
-- the row to 'unverified' so edited text is never inherited as checked.
--
-- verification_flags holds an array of {claim, problem, severity} objects where
-- severity is 'block' (contradicts source or canon) or 'warn' (plausible but
-- untraceable, needs a human eye). NULL means never checked.

ALTER TABLE publication_targets
  ADD COLUMN verification_status ENUM('unverified', 'passed', 'flagged') NOT NULL DEFAULT 'unverified',
  ADD COLUMN verification_flags JSON NULL,
  ADD COLUMN verified_at TIMESTAMP NULL;
