-- Demonstration proposals for the Assembly page.
-- One flag on the proposals table marks a row as a seeded teaching example.
-- Every advancement and side-effect point in the governance pipeline checks
-- this flag and refuses to fire for an example: it never moves to last call,
-- never bridges to Hypha, never executes a variable change, never opens a
-- builder issue, and never lands in the "needs you" queue. The row still
-- flows through every read query so the community sees a realistic card at
-- each lifecycle stage. Seeded and removed idempotently by
-- scripts/seed-assembly-examples.ts. Safe to keep or drop at any time.

ALTER TABLE proposals ADD COLUMN isExample TINYINT(1) NOT NULL DEFAULT 0;
CREATE INDEX idx_proposals_is_example ON proposals (isExample, status);
