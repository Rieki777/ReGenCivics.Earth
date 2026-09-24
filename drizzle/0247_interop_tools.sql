-- The Interoperability Circle's tools directory.
--
-- One row per person who signs up, keyed by email so joining again updates
-- their entry instead of adding a second one. This is the register of what the
-- movement is actually running: the repo the tool lives in, and the agent that
-- works on it.
--
-- Deliberately separate from event_signups. That table is one row per person
-- per session, so a repo stored there would be copied onto every weekly row
-- and would disagree with itself the moment someone changed it. The directory
-- is a property of the person, not of a meeting.
--
-- repoUrl and agent are both optional: signing up is optional to begin with,
-- and someone without a repo yet is still part of the circle.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS interopTools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(120) NULL,
  repoUrl VARCHAR(500) NULL,
  agent VARCHAR(120) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY interop_tools_email_idx (email),
  KEY interop_tools_updated_idx (updatedAt)
);
