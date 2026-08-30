-- 0229: the pool takes the founder's name for it, and says whose setting it is.
--
-- MIGRATION NUMBER NOT ALLOCATED BY THE COORDINATOR. 0229 is next free at
-- dcdaba4 (check-migration-numbers agrees). Confirm or RENAME IT BEFORE IT IS
-- APPLIED; renaming after re-runs the file, because the applied-migrations
-- ledger keys on filename.
--
-- WHY A NEW FILE RATHER THAN AN EDIT TO 0228. 0228 is already applied to
-- production (measured: it is the newest row in _migrations_applied), so the
-- runner will never execute it again there. Editing its INSERT would therefore
-- rename the variable on every FRESH database (CI's integration job builds one
-- every run, and so does a fork) while leaving production on the old name.
-- That is a divergence nothing would report. This file brings both to the same
-- place, and 0228 is left exactly as it ran.
--
-- Founder's ruling, verbatim: [Make the pool amount 500 but this pool should be
-- governed on the ReGen Civics side and not the Game so it's a setting the
-- ReGen Civics Game mechanics are covering as the "Custom Game Module Creators
-- Pool" tokens we pay out. Then set it to 333 for us to start testing it.]
--
-- THIS FILE DOES NOT TOUCH `value` OR `defaultValue`, and that is the point of
-- writing the UPDATE list out by name rather than reaching for a whole-row
-- upsert. `value` is 333 on production, set by hand as the first live test, and
-- 500 is the target the founder named rather than a number to jump to in a
-- migration. `defaultValue` stays 0 so a fork inherits an inert pool and has to
-- decide its own amount, which is the same reason 0228 seeded 0.

INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`, unit)
VALUES
  ('pool', 'builders', 'pool.regen_per_cycle', 'Custom Game Module Creators Pool',
   'The $ReGen ReGen Civics pays out each lunar cycle to whoever built the modules villages are running, split by how many members opened each one. A ReGen Civics setting and never a village one: a village reports what its members opened and never how much that is worth, and no number a village serves reaches this. Modules ReGen Civics built earn on the same footing as anybody else and their share goes to the ReGen Civics gratitude pool to be given out, so while ReGen Civics is the only module creator the whole amount lands there. 0 pays nobody and recycles nothing.',
   0, 'integer', 0, 0, 100000, '$ReGen')
ON DUPLICATE KEY UPDATE
  displayName = VALUES(displayName),
  description = VALUES(description),
  category = VALUES(category),
  subcategory = VALUES(subcategory),
  unit = VALUES(unit);
