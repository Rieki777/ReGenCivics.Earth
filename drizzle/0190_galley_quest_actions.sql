-- Two auto-verified Galley quest actions: logging a market haul, and trying the
-- Deeper Reset. They are awarded server-side from Galley activity (see
-- awardGalleyQuest in server/routes/ship.ts), the same auto-verify pattern as
-- add-map-location, and listed on the Maiden Voyage Quest page. A nudge, never a
-- gate. Idempotent on the unique slug.

INSERT INTO `ship_quest_actions` (`slug`, `title`, `description`, `points`, `isRequired`, `proofType`, `sortOrder`)
VALUES
  ('galley-log-haul', 'Log a market haul in the Galley', 'Log what you gathered in the Galley remixer. This verifies automatically the first time you log a haul.', 25, 0, 'link', 20),
  ('galley-deeper-reset', 'Try the Deeper Reset', 'Remix or cook a Deeper Reset dish (fully raw) in the Galley. This verifies automatically the first time you try it.', 25, 0, 'link', 21)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `points` = VALUES(`points`),
  `isRequired` = VALUES(`isRequired`),
  `proofType` = VALUES(`proofType`),
  `sortOrder` = VALUES(`sortOrder`);
