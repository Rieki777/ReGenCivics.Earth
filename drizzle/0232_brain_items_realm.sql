-- The brain has a ReGen half and a Personal half (ADDENDUM-1 item 1).
--
-- Rye's words from the calibration grades: personal to-dos belong to "a personal
-- secretary section... not the public second brain for the voice of regen civics."
--
-- This is a wall around DOWNSTREAM CORPORA, not around auth: every brain_items
-- row is already owner-gated. Nothing with realm='personal' may ever feed the
-- worldview pack, the voice corpus, the Harvest, or any public-facing surface.
--
-- Distinct from the quality tiers: tier 'private' means a note never syncs
-- anywhere at all, including the future vault repository. realm='personal'
-- items live in the system normally, just walled off from anything that speaks
-- in ReGen Civics' voice.
--
-- Follow-up to 0230 rather than an edit to it: 0230 is already applied to
-- production. Existing rows default to 'regen', which is right — the 749
-- imported items are all ReGen work.

ALTER TABLE brain_items
  ADD COLUMN realm ENUM('regen','personal') NOT NULL DEFAULT 'regen' AFTER kind;

-- The To-do tab filters on (owner, realm, state); the morning message counts
-- the two halves separately.
CREATE INDEX brain_items_owner_realm_state_idx ON brain_items (owner_id, realm, state);
