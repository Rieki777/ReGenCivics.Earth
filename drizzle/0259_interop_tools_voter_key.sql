-- Let a raised hand carry a tool, before anyone has given an email.
--
-- The register was keyed on email, so the only way into it was the sign-up
-- form. But raising a hand is anonymous and comes first: that is the moment
-- someone is actually thinking about their tool, and the moment to ask. A row
-- can now be owned by the browser's voterKey, by an email, or by both once
-- somebody signs up after voting.
--
-- Both keys stay unique, and MySQL allows many NULLs in a unique index, so
-- rows with only one of the two do not collide. The join procedure reconciles
-- the pair rather than letting a person appear twice: it looks for an email
-- row, then a voterKey row, and only inserts when neither exists.
--
-- Safe on an empty table, which this is at the time of writing.

ALTER TABLE `interopTools`
  MODIFY COLUMN `email` VARCHAR(320) NULL;

ALTER TABLE `interopTools`
  ADD COLUMN `voterKey` VARCHAR(64) NULL;

ALTER TABLE `interopTools`
  ADD UNIQUE KEY `interop_tools_voter_idx` (`voterKey`);
