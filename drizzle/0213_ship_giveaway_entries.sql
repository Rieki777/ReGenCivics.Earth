-- Free Voyage Giveaway: the public entry layer.
--
-- A zero-effort base entry for the public sweepstakes: anyone can enter free with
-- just an email. Effort-gated entry with effort-weighted odds reads as
-- consideration under sweepstakes law, so the base entry is email only, and every
-- bonus is optional. Verified public entries feed the SAME weighted draw as quest
-- threshold entrants and approved nominations (server/routes/ship.ts
-- drawFreeVoyageWinner); this table is only the public-entry source for that draw.
--
-- bonusTickets holds the credited bonus entries as {referrals, nomination, quest,
-- ig, yt}. referrals is capped at 40 (the referral credit ceiling); the other
-- fields are 0 or their flat value. A public entry's draw weight is
-- 1 + referrals + nomination + quest + ig + yt (see publicEntryTickets in
-- server/lib/ship-logic.ts). The referral leaderboard counts verified entries by
-- referredBy and is separate from the capped credit.

CREATE TABLE IF NOT EXISTS ship_giveaway_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  userId INT,
  verifiedAt TIMESTAMP NULL DEFAULT NULL,
  verifyToken VARCHAR(64) NOT NULL,
  verifyEmailSentAt TIMESTAMP NULL DEFAULT NULL,
  verifyResentAt TIMESTAMP NULL DEFAULT NULL,
  welcomeEmailSentAt TIMESTAMP NULL DEFAULT NULL,
  funnelTag ENUM('land', 'voyage', 'support', 'curious'),
  referralCode VARCHAR(16) NOT NULL,
  referredBy VARCHAR(16),
  bonusTickets JSON,
  nominationText TEXT,
  nominationId INT,
  src VARCHAR(80),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ship_giveaway_entry_email_uq (email),
  UNIQUE KEY ship_giveaway_entry_code_uq (referralCode),
  UNIQUE KEY ship_giveaway_entry_token_uq (verifyToken),
  KEY ship_giveaway_entry_referredby_idx (referredBy),
  KEY ship_giveaway_entry_verified_idx (verifiedAt),
  KEY ship_giveaway_entry_user_idx (userId)
);

-- The draw records a public-entry winner (winnerEntryId) so a prior public winner
-- can be excluded from later draws, and the threshold-ticket cap chosen at draw
-- time (thresholdCap, NULL = uncapped) so the run is reproducible and the counsel
-- decision is on the audit row.
ALTER TABLE ship_giveaway_drawings ADD COLUMN winnerEntryId INT;
ALTER TABLE ship_giveaway_drawings ADD COLUMN thresholdCap INT;
