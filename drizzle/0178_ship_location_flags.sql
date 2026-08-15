-- Field verification: crews can flag a problem with a treasure-map pin
-- ("gate is locked now", "spring ran dry", "rig no longer fits"). Flags feed
-- the admin queue alongside the verification list. See ADR-35.

CREATE TABLE IF NOT EXISTS ship_location_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locationId INT NOT NULL,
  userId INT NULL,
  reason VARCHAR(500) NOT NULL,
  resolvedAt TIMESTAMP NULL,
  resolvedByUserId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ship_location_flags_location_idx ON ship_location_flags (locationId);
CREATE INDEX ship_location_flags_open_idx ON ship_location_flags (resolvedAt);
