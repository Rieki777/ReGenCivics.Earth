-- Interoperability Circle rolling time vote.
-- One row per voter, keyed by a random browser id so someone without an
-- account can still raise a hand. Voting again updates the row in place, so a
-- person moves their hand as their week changes and the leading slot moves
-- with the group. Safe to run more than once.

CREATE TABLE IF NOT EXISTS interopTimeVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot VARCHAR(24) NOT NULL,
  voterKey VARCHAR(64) NOT NULL,
  displayName VARCHAR(80) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY interop_vote_voter_idx (voterKey),
  KEY interop_vote_slot_idx (slot)
);
