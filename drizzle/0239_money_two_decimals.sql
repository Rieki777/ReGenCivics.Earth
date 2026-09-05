-- Money carries two decimals.
--
-- Every currency-like column below was `int`, so it could hold whole units only.
-- A contribution of 100,000.50 CHF either lost the fifty centimes or failed to
-- write. Ruled by Rye 2026-09-05, alongside pegging $RCivics one token per Swiss
-- franc, which is what makes the missing centimes a real problem rather than a
-- theoretical one.
--
-- WHY DECIMAL(18,2) AND NOT MINOR UNITS. The other way to add two decimals is to
-- store rappen in an int. That is the shape that broke the sibling repo: of its
-- ledger function's 44 callers, 5 converted and 39 handed it a human number, and
-- all 39 were correct only because the scale was zero. Setting a scale made them
-- all wrong at once, and it shipped a wallet reading a thousand times too large.
-- With DECIMAL the stored number IS the human number, so the 400-odd sites that
-- read these columns keep working with no conversion layer to get wrong.
--
-- THE ONE HAZARD, handled elsewhere: mysql2 returns DECIMAL as a STRING by
-- default, which turns `a + b` into string concatenation without throwing. The
-- pool sets `decimalNumbers: true` (server/db.ts) and server/money.test.ts
-- asserts both the type and the round-trip.
--
-- 18,2 gives sixteen digits before the point, which is far more than any figure
-- this system can hold, and stays inside JS number precision.
--
-- NOT INCLUDED, deliberately:
--   campaign_partner_links.cachedContributorCount  -- a count of people
--   campaign_partner_links.cachedPercent           -- a percentage
--   user_token_ledger.amount and player_profiles balances -- see the note at the
--     bottom of this file. Those carry an on-chain consequence and are a
--     separate decision.

-- campaigns: the goal and the running totals
ALTER TABLE campaigns
  MODIFY COLUMN financialTarget   DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN totalValue        DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN landValue         DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN equipmentValue    DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN rolesValue        DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN resourcesValue    DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedTotal      DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedLand       DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedEquipment  DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedRoles      DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedResources  DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedFinancial  DECIMAL(18,2) NOT NULL DEFAULT 0;

-- campaign_items: what one need is worth, and what has been pledged against it
ALTER TABLE campaign_items
  MODIFY COLUMN estimatedValue DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN pledgedValue   DECIMAL(18,2) NOT NULL DEFAULT 0;

-- campaign_contributions: what one contribution is worth
ALTER TABLE campaign_contributions
  MODIFY COLUMN estimatedValue  DECIMAL(18,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN financialAmount DECIMAL(18,2) NULL;

-- partner funders: their cached raised figure is money; the other two are not
ALTER TABLE campaign_partner_links
  MODIFY COLUMN cachedRaised DECIMAL(18,2) NULL;

-- the older parallel model, kept until it retires
ALTER TABLE crowd_pooling_projects
  MODIFY COLUMN targetAmount  DECIMAL(18,2) NOT NULL,
  MODIFY COLUMN currentAmount DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE crowd_pooling_proposals
  MODIFY COLUMN futureValueContribution DECIMAL(18,2) NOT NULL DEFAULT 0;

-- the Living Tree row a fulfilled contribution creates
ALTER TABLE player_contributions
  MODIFY COLUMN estimatedValue DECIMAL(18,2) NULL;

-- the contribution calculator's saved drafts
ALTER TABLE saved_contributions
  MODIFY COLUMN targetAmount        DECIMAL(18,2) NULL,
  MODIFY COLUMN totalImmediateValue DECIMAL(18,2) NULL DEFAULT 0,
  MODIFY COLUMN totalFutureValue    DECIMAL(18,2) NULL DEFAULT 0;

-- STILL AN INTEGER, ON PURPOSE, AND IT NEEDS A DECISION.
--
-- user_token_ledger.amount and the player_profiles balance columns are the token
-- ledger. $RCivics is one token per franc, so on the face of it they need two
-- decimals too. They are not in this migration because they carry a consequence
-- this one does not: players.requestClaim sends the balance to Hypha as
-- `String(t.balance)` in an on-chain payout. Whether Base and the Hypha bridge
-- accept "100.50" there, or expect base units, is an integration question that
-- has to be answered before the column changes, not after. Changing it blind
-- would put a malformed amount on a one-way bridge.
