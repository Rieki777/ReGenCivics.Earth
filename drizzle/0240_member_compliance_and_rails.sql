-- Compliance rails for crowdpooling money.
--
-- Two things, both cheap now and expensive to retrofit, per the project's own
-- legal due diligence (docs/legal/) and Rye's ruling of 2026-09-05: build the
-- rails so each can be switched on as counsel clears it.
--
-- NOTHING HERE ACCEPTS MONEY. Every rail ships OFF. The cooperative is not yet
-- formed and the fund is not a legal entity, so neither can receive anyone's
-- money; these are the tracks, not the train.

-- ── 1. Member compliance state ──────────────────────────────────────────────
--
-- The CURRENT state for a member. Separate from the per-contribution snapshot
-- below, because this changes over time and a contribution must record what was
-- true when it was made, not what is true when someone later asks.

CREATE TABLE IF NOT EXISTS member_compliance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,

  -- Where the member says they are. ISO 3166-1 alpha-2. Self-attested until a
  -- verification provider is wired, which is why the attestation and any later
  -- verification are recorded separately rather than collapsed into one field.
  residencyCountry CHAR(2) NULL,
  residencyAttestedAt TIMESTAMP NULL,
  residencySource ENUM('self_attested','document_verified','provider') NULL,

  -- US persons are gated out of the money rails unless accredited, in which case
  -- they are routed to the fund rather than the cooperative's crowdpooling.
  isUsPerson TINYINT NOT NULL DEFAULT 0,

  -- Accreditation is a point-in-time finding with an expiry, not a permanent
  -- property. `evidenceRef` points at whatever the verifier returned; the
  -- evidence itself is never stored here.
  accreditationStatus ENUM('unknown','not_accredited','self_certified','verified','expired')
    NOT NULL DEFAULT 'unknown',
  accreditationVerifiedAt TIMESTAMP NULL,
  accreditationExpiresAt TIMESTAMP NULL,
  accreditationEvidenceRef VARCHAR(255) NULL,

  -- Set when the member is connected to ReGen Civics, a project, or the team.
  -- An affiliate's money cannot count toward a campaign threshold: a minimum met
  -- by the people who benefit from meeting it is the fact pattern enforcement
  -- looks for.
  isAffiliate TINYINT NOT NULL DEFAULT 0,
  affiliateReason VARCHAR(255) NULL,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY member_compliance_user_uq (userId),
  KEY member_compliance_accreditation_idx (accreditationStatus),
  KEY member_compliance_us_idx (isUsPerson)
);

-- ── 2. What was true at contribution time ───────────────────────────────────
--
-- Snapshotted onto the contribution itself. A member's residency, accreditation
-- and affiliate status all change, and the question asked years later is not
-- "what is this person now" but "what were they when they gave us this money,
-- and what were they shown".

ALTER TABLE campaign_contributions
  ADD COLUMN residencyCountryAtContribution CHAR(2) NULL,
  ADD COLUMN accreditationAtContribution
    ENUM('unknown','not_accredited','self_certified','verified','expired') NULL,
  ADD COLUMN isAffiliateAtContribution TINYINT NOT NULL DEFAULT 0,

  -- The exact disclosure the contributor saw, by version. A disclaimer that
  -- cannot be reconstructed for a given date is a disclaimer that was never made.
  ADD COLUMN disclosureVersion VARCHAR(32) NULL,
  ADD COLUMN disclosureAcceptedAt TIMESTAMP NULL,

  -- The seven-day default on a missed window moves someone's money when they say
  -- nothing, so it is consented to on its own rather than folded into a general
  -- terms tick, and the consent is recorded with the contribution it governs.
  ADD COLUMN missedWindowDefaultConsentedAt TIMESTAMP NULL,

  -- Contributions may arrive in any currency while $RCivics is pegged to the
  -- Swiss franc. Storing only the converted figure makes "why do I hold this
  -- number" unanswerable, so the original, the rate and the rate's provenance
  -- are all kept.
  ADD COLUMN originalCurrency CHAR(3) NULL,
  ADD COLUMN originalAmount DECIMAL(18,2) NULL,
  ADD COLUMN chfAmount DECIMAL(18,2) NULL,
  ADD COLUMN fxRateToChf DECIMAL(18,8) NULL,
  ADD COLUMN fxRateSource VARCHAR(64) NULL,
  ADD COLUMN fxRateAt TIMESTAMP NULL;

-- ── 3. The rails, every one of them off ─────────────────────────────────────
--
-- Rye, 2026-09-05: "let's just make sure we're building the rails and building
-- them in a way that I can turn on/off what rails are legal or not as we explore
-- with counsel."
--
-- Each of these gates a money-touching path. They are enforced at the route, not
-- in the UI, so a hidden button is not the control. Default 0 everywhere: a rail
-- turns on when counsel clears it and somebody flips it deliberately.

INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive)
VALUES
  ('crowdpool', 'rails', 'crowdpool.rails.accept_money', 'Accept money contributions',
   'Master switch for any path that takes money. OFF until the cooperative exists and counsel clears it.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.issue_rcivics', 'Issue $RCivics on contribution',
   'Credit the restricted on-platform balance when a contribution lands.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.issue_rcvoice', 'Issue RCVoice on contribution',
   'Credit governance weight when a contribution lands. Note RCVoice has no contract on Base yet.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.routing', 'Routing across projects',
   'Let a member route their share across campaigns.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.claim_to_base', 'Claim to Base',
   'Allow a restricted balance to be claimed on-chain after close. One-way, so keep it off until close logic is proven.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.refunds', 'Refunds',
   'The refund path. Must be on whenever accept_money is on, because escrow with no tested way out is the worst state.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.us_persons_money', 'US persons may contribute money',
   'OFF by default. US persons are routed to the fund and its LOI flow instead of crowdpooling.',
   0, 'boolean', 0, 1),
  ('crowdpool', 'rails', 'crowdpool.rails.project_stake_swap', 'Project stake swap',
   'Record the minimum 10% non-dilutive stake a project returns. Only after a community decision.',
   0, 'boolean', 0, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- The routing share, which moved from 80 to 90 inside a day. A variable, never a
-- constant in a component. Range 50 to 90 per the ruling.
INSERT INTO game_variables
  (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive)
VALUES
  ('crowdpool', 'economics', 'crowdpool.routing_share_pct', 'Routing share (%)',
   'How much of a money contribution the member routes across projects. The remainder goes to the community treasury. Season-scoped, 50 to 90.',
   90, 'integer', 90, 1),
  ('crowdpool', 'economics', 'crowdpool.project_stake_min_pct', 'Minimum project stake (%)',
   'The least a project returns to ReGen Civics to take part. Non-dilutive.',
   10, 'integer', 10, 1),
  ('crowdpool', 'economics', 'crowdpool.missed_window_response_days', 'Missed-window response window (days)',
   'How long a member has to choose reroute, refund or core-team-chooses before the default applies.',
   7, 'integer', 7, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);
