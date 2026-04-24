-- 0131_token_ledger.sql
--
-- 2026-04-24 — 4-token private ledger for the profile token boxes.
--
-- Adds private balance columns to player_profiles for all four tokens
-- (RCVoice, RGVoice, RCivics, ReGen). Public balances for RGVoice and
-- ReGen already live in rvoiceBalance / rgenBalance; this migration
-- adds the missing public columns for RCVoice + RCivics and the
-- matching private columns for all four.
--
-- Also adds an audit table user_token_ledger that records each credit
-- or debit with a source tag (seeds_claim, gratitude_received,
-- quest_completion, claimed_to_base, manual) so we can trace where
-- every private token came from and, eventually, decrement the private
-- ledger when a user claims their tokens on Hypha.

-- Column name note: existing code uses rvoiceBalance for RGVoice and
-- rgenBalance for ReGen. Keep those as the "public" source-of-truth
-- and add matching private columns + two new columns per fund token.
ALTER TABLE player_profiles
  ADD COLUMN rcvoicePublic INT NOT NULL DEFAULT 0,
  ADD COLUMN rcvoicePrivate INT NOT NULL DEFAULT 0,
  ADD COLUMN rgvoicePrivate INT NOT NULL DEFAULT 0,
  ADD COLUMN rcivicsPublic INT NOT NULL DEFAULT 0,
  ADD COLUMN rcivicsPrivate INT NOT NULL DEFAULT 0,
  ADD COLUMN regenPrivate INT NOT NULL DEFAULT 0;

-- Ledger entries. One row per credit or debit so users can see history.
CREATE TABLE IF NOT EXISTS user_token_ledger (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  tokenType ENUM('rcvoice', 'rgvoice', 'rcivics', 'regen') NOT NULL,
  amount INT NOT NULL,                          -- signed: positive = credit, negative = debit
  source VARCHAR(64) NOT NULL,                  -- e.g. 'seeds_claim', 'gratitude_received', 'quest_completion', 'claimed_to_base', 'manual'
  sourceId INT DEFAULT NULL,                    -- FK-ish: seedsClaims.id, gratitudeMessages.id, quests.id, etc.
  description TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX user_token_ledger_userId_idx (userId),
  INDEX user_token_ledger_tokenType_idx (tokenType),
  INDEX user_token_ledger_source_idx (source)
);
