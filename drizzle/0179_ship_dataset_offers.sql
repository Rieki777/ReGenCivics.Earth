-- The dataset door: a project or network offers a dataset of places for the
-- treasure map. Accepted offers flow through the source-stamped importer and
-- are credited on the pins. Public, rate-limited, sanitized (BUILD-PLAYBOOK).

CREATE TABLE IF NOT EXISTS ship_dataset_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orgName VARCHAR(200) NOT NULL,
  contactName VARCHAR(200) NOT NULL,
  email VARCHAR(320) NOT NULL,
  description TEXT NOT NULL,
  approxCount INT NULL,
  dataUrl VARCHAR(512) NULL,
  licenseNote VARCHAR(500) NULL,
  status ENUM('submitted', 'reviewing', 'imported', 'declined') NOT NULL DEFAULT 'submitted',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ship_dataset_offers_status_idx ON ship_dataset_offers (status);
