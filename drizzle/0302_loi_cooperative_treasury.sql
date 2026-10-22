-- Letters of intent come back for the cooperative treasury (ADR-78). The
-- network treasury launches when $20 million in letters of intent are signed,
-- and it will be formed to meet the legal and regulatory needs of the funders,
-- so each letter now records what that choice needs to know: where the signer
-- is, whether they are a US accredited investor (optional, never a gate), and
-- which of the nine forms of capital they would bring beside money.
--
-- ADDITIVE ONLY: three nullable columns, plus one value appended to the end of
-- the investorType enum ('land_project': land projects pool their resources
-- too). Appending an enum value keeps every existing value and its stored
-- index, so old code reads exactly what it read before, and old code never
-- writes the new value. MariaDB and MySQL 8+ compatible.
--
--   country          free text, as the signer typed it
--   accreditedStatus 'yes' | 'no' | 'not_sure' | 'not_us', NULL when skipped
--   capitalForms     JSON array of shared/capitals.ts CapitalType keys
--
-- Apply BEFORE the deploy: drizzle inserts name every declared column, so the
-- new code's insert fails on a table without these columns.
--   npx tsx scripts/run-migration.ts drizzle/0302_loi_cooperative_treasury.sql

ALTER TABLE `letter_of_intent`
  ADD COLUMN `country` VARCHAR(120) NULL DEFAULT NULL,
  ADD COLUMN `accreditedStatus` ENUM('yes','no','not_sure','not_us') NULL DEFAULT NULL,
  ADD COLUMN `capitalForms` TEXT NULL,
  MODIFY COLUMN `investorType` ENUM('individual','family_office','foundation','impact_fund','institutional','other','land_project') NOT NULL;
