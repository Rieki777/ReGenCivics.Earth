-- Ship inventory corrections (Rye feedback, 2026-07-18):
--   1. Add a comingYear2 flag for gear that is not aboard yet.
--   2. The drinking-water filter is in-line, not a gravity filter (same image).
--   3. The paddle ball set and electric bike come aboard in year two.
--   4. Add the Love Your Body kit (a loving massage kit), aboard now.

ALTER TABLE ship_inventory_items
  ADD COLUMN comingYear2 boolean NOT NULL DEFAULT false;

-- In-line drinking-water filter (was described as a gravity filter). Keep the image.
UPDATE ship_inventory_items
  SET name = 'In-line drinking-water filter',
      lore = 'Clean water, straight from the tap.',
      description = 'An in-line drinking-water filter on top of her whole-RV filtration.'
  WHERE slug = 'gravity-drinking-water-filter';

-- These come aboard in year two, not the trial year.
UPDATE ship_inventory_items
  SET comingYear2 = true
  WHERE slug IN ('electric-bike', 'paddle-ball-set');

-- The Love Your Body kit: a loving massage kit, aboard now.
INSERT INTO ship_inventory_items
  (name, slug, category, lore, description, quantity, storagePlace, activityTags, isVisible, isGearChecked, comingYear2, sortOrder, createdAt, updatedAt)
VALUES
  ('The Love Your Body kit', 'love-your-body-kit', 'comfort', 'A week aboard is a good time to be tender with the body you live in.',
   'A loving massage kit: natural oils and simple tools for tending yourselves and each other aboard.',
   1, 'Bedroom cabinet', CAST('["rainy day"]' AS JSON), 1, 0, 0, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name), category = VALUES(category), lore = VALUES(lore),
  description = VALUES(description), storagePlace = VALUES(storagePlace),
  activityTags = VALUES(activityTags), comingYear2 = VALUES(comingYear2);
