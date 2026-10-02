-- Get your Village OS: hosting requests (shared/villageOsOffer.ts, ADR-69).
-- A founder of an accepted Season 2 project asks the ReGen Civics team to
-- host their village at /village-os/host. Numbered 0284: 0283 is the session
-- boards. Additive and safe to run more than once.

-- One row per application. A second request for the same application updates
-- this row (the unique key on applicationId), and a withdrawn request goes
-- back to requested. userId is the account that last filled in the form.
-- villageName to tagline are the founder's own words for the first draft.
-- circleInterest is a raised hand for the founders circles, nothing more.
-- consentDraft and consentHosting record the two consent lines, always 1 on
-- a stored request. status is a HOSTING_REQUEST_STATUSES key, and adminNote
-- is the team's working note. No gift or donation data lives here, and none
-- is joined: hosting never depends on giving.
CREATE TABLE IF NOT EXISTS village_os_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  applicationId INT NOT NULL,
  villageName VARCHAR(120) NOT NULL,
  preferredAddress VARCHAR(63) NULL,
  ownDomain VARCHAR(253) NULL,
  country VARCHAR(80) NULL,
  timeZone VARCHAR(64) NULL,
  language VARCHAR(40) NULL,
  memberWord VARCHAR(40) NULL,
  currencyName VARCHAR(40) NULL,
  tagline VARCHAR(160) NULL,
  circleInterest TINYINT NOT NULL DEFAULT 0,
  consentDraft TINYINT NOT NULL DEFAULT 0,
  consentHosting TINYINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'requested',
  adminNote TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY village_os_requests_app_idx (applicationId),
  KEY village_os_requests_user_idx (userId),
  KEY village_os_requests_status_idx (status)
);
