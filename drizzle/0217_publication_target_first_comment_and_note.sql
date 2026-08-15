-- First comment and weekly note for published surfaces (The Harvest).
--
-- first_comment: where the link goes. A raw URL in the body suppresses reach on
-- LinkedIn and Instagram, so the post carries the idea and the first comment
-- carries the link. It is published text like any other, so content-verify.ts
-- fact-checks it alongside the body and editing it resets verification.
--
-- weekly_note: the honest replacement for analytics. One sentence written after
-- the fact, on the rhythm the harvest-digest cron already runs at: did this
-- land, and why do I think so. No scraping, no vanity metrics, no paste-back of
-- post URLs. A human sentence is worth more than a number nobody trusts.

ALTER TABLE publication_targets
  ADD COLUMN first_comment TEXT NULL,
  ADD COLUMN weekly_note TEXT NULL;
