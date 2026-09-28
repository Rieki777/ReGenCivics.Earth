-- Interoperability sheets, and the standard the group builds out of them.
--
-- One intake, not two. Somebody describing their tool on /interop-sessions is
-- submitting it to the tools library and answering the interoperability
-- questions in the same pass, so every tool in the library has been through
-- this and the library can show which tools are part of the shared system.
--
-- The sheet therefore hangs off regen_tools rather than duplicating it:
-- regen_tools stays the one canonical tool with its own page, categories,
-- endorsements and moderation, and interop_sheets adds the facets that decide
-- whether two projects can actually meet. One sheet per tool.
--
-- Circle submissions are anonymous by design (the vote is too), so the sheet
-- carries its own submitter columns rather than relying on regen_tools
-- .submittedBy, which is a user id. The tool row lands as 'pending' for the
-- public library while the sheet shows immediately on the Circle page: the
-- group can see what is coming before an admin has looked at it, and the
-- library stays curated.

CREATE TABLE IF NOT EXISTS interopSheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- The canonical tool in regen_tools. One sheet per tool.
  toolId INT NOT NULL,
  -- Denormalised so the Circle page can render without joining a pending row,
  -- and so a sheet survives a tool being renamed underneath it.
  toolName VARCHAR(255) NOT NULL,
  -- The controlled-vocabulary halves the overlap engine reads. JSON arrays of
  -- strings; open vocabularies, so an unlisted term is still a valid answer.
  protocols JSON NULL,
  dataFormats JSON NULL,
  identityModels JSON NULL,
  surfaces JSON NULL,
  -- The prose half: what it does, and how it expects to interoperate.
  summary TEXT NULL,
  integrationNotes TEXT NULL,
  -- An optional attached overview, in R2. Kept as key + display name so the
  -- file can be re-signed or moved without rewriting rows.
  docKey VARCHAR(500) NULL,
  docName VARCHAR(255) NULL,
  docContentType VARCHAR(120) NULL,
  docBytes INT NULL,
  -- Who filed it. Either may be null: a hand raised anonymously has only a
  -- voterKey, and somebody who signed up has an email.
  voterKey VARCHAR(64) NULL,
  email VARCHAR(320) NULL,
  contactName VARCHAR(120) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY interop_sheets_tool_idx (toolId),
  KEY interop_sheets_voter_idx (voterKey),
  KEY interop_sheets_updated_idx (updatedAt)
);

-- Proposals for the shared standard.
--
-- A term several projects already name is common ground, computed from the
-- sheets and needing no table. This is the other half: something somebody
-- thinks the group SHOULD adopt, which the sheets do not yet show. Status
-- moves proposed -> adopted (or declined) when the Circle decides, so the
-- page can show what is agreed versus what is still an argument.
CREATE TABLE IF NOT EXISTS interopProposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- Which facet it concerns: protocols, dataFormats, identityModels, surfaces.
  axis VARCHAR(32) NOT NULL,
  term VARCHAR(120) NOT NULL,
  -- Matching key, so a proposal and a sheet term are recognised as the same
  -- thing whatever the spelling.
  termKey VARCHAR(120) NOT NULL,
  rationale TEXT NULL,
  status ENUM('proposed', 'adopted', 'declined') NOT NULL DEFAULT 'proposed',
  voterKey VARCHAR(64) NULL,
  email VARCHAR(320) NULL,
  contactName VARCHAR(120) NULL,
  decidedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY interop_proposals_axis_term_idx (axis, termKey),
  KEY interop_proposals_status_idx (status)
);
