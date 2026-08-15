-- Rye approved the Shipwright knowledge base (2026-07-12), so the model-specific
-- Fleetwood/Spartan notes seeded as forum_wisdom are now servable. Their content
-- still tells the crew to treat specifics as unverified until the Keeper confirms.
UPDATE `ship_knowledge_chunks` SET `isApproved` = 1 WHERE `isApproved` = 0;

-- State of the Ship: the asset-value inputs, as admin-editable game variables so
-- Rye can update them live at /game-mechanics with no deploy (SHIP_V5_FLYWHEEL section 3).
INSERT INTO `game_variables` (`category`, `subcategory`, `key`, `displayName`, `description`, `value`, `valueType`, `minValue`, `maxValue`, `defaultValue`, `isActive`)
VALUES
  ('ship', 'ownership', 'ship.asset_value_usd', 'Ship asset value (USD)', 'The insured value of the ship, the denominator for the community-ownership percentage on the State of the Ship dashboard. Starting estimate for the 2006 Fleetwood Revolution LE. Update to the real insured figure.', 75000, 'integer', 0, 1000000, 75000, 1),
  ('ship', 'ownership', 'ship.community_owned_usd', 'Community-owned so far (USD)', 'How much of the ship the movement owns so far. Ten percent of voyage revenue buys her back into community ownership. Update this number as buybacks happen.', 0, 'integer', 0, 1000000, 0, 1),
  ('ship', 'impact', 'ship.trees_planted', 'Trees planted for carbon', 'Trees planted to more than offset the fleet voyages. Update as plantings are confirmed.', 0, 'integer', 0, 10000000, 0, 1)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`);
