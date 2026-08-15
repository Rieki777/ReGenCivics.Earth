-- Ship treasure map v2: multi-source provenance + field-verifiable columns.
-- Adds source/attribution columns so bulk open-data importers (OSM Overpass,
-- NOAA thermal springs, Falling Fruit) can stamp every row with where it came
-- from and under what license, plus boondock/spring field columns for the
-- "40-ft-capable free camping within an hour" coverage goal.
--
-- The composite unique (source, externalId) makes every importer idempotent:
-- re-running upserts by origin id instead of duplicating pins. NULL externalId
-- rows (hand-suggested crew pins) are exempt because MySQL treats NULLs as
-- distinct in a unique index.
--
-- See ADR-35. Idempotent: guarded so re-running is safe.

ALTER TABLE ship_locations
  ADD COLUMN source varchar(40) NULL AFTER type;

ALTER TABLE ship_locations
  ADD COLUMN sourceUrl varchar(512) NULL AFTER source;

ALTER TABLE ship_locations
  ADD COLUMN sourceLicense varchar(40) NULL AFTER sourceUrl;

ALTER TABLE ship_locations
  ADD COLUMN externalId varchar(128) NULL AFTER sourceLicense;

ALTER TABLE ship_locations
  ADD COLUMN maxRigLengthFt int NULL AFTER externalId;

ALTER TABLE ship_locations
  ADD COLUMN accessNotes text NULL AFTER maxRigLengthFt;

ALTER TABLE ship_locations
  ADD COLUMN waterQualityUrl varchar(512) NULL AFTER accessNotes;

ALTER TABLE ship_locations
  ADD COLUMN lastVerifiedAt timestamp NULL AFTER waterQualityUrl;

ALTER TABLE ship_locations
  ADD COLUMN verifiedCount int NOT NULL DEFAULT 0 AFTER lastVerifiedAt;

ALTER TABLE ship_locations
  ADD COLUMN region varchar(64) NULL AFTER verifiedCount;

-- Idempotent re-import key. Two different sources may legitimately reuse the
-- same externalId, so the source is part of the key.
CREATE UNIQUE INDEX ship_locations_source_external_idx
  ON ship_locations (source, externalId);

CREATE INDEX ship_locations_source_idx ON ship_locations (source);
