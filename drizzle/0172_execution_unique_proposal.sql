-- One execution row per proposal, enforced by the database.
-- The dispatcher's idempotency was SELECT-then-INSERT with only a plain
-- index on proposalId, so two concurrent ratification confirms could both
-- pass the check and double-apply a variable change. The retry path already
-- reuses the existing row, so uniqueness matches the design invariant.
-- No comment on this line ends with a semicolon on purpose

ALTER TABLE governance_executions DROP INDEX idx_execution_proposal;
ALTER TABLE governance_executions ADD UNIQUE INDEX idx_execution_proposal (proposalId);

-- bounds_change: the payload kind that lets the community widen or narrow a
-- variable's own sandbox through governance instead of asking an admin. The
-- engine has told members to "propose a bounds change first" since Rung 1
-- shipped without giving them a door that opens
ALTER TABLE governance_executions MODIFY COLUMN kind ENUM('variable_change', 'bounds_change', 'content', 'feature') NOT NULL;
