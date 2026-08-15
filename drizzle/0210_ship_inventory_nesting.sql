-- 0210_ship_inventory_nesting.sql
-- Merge the 118-item physical RV manifest (data/rv_inventory.json) into the
-- gamified bag (ship_inventory_items) as a NESTED TREE. This retires the
-- standalone ship_inventory table + shipManifest router (see the RETIRED note in
-- drizzle/schema.ts). The /ship overview shows top-level cards (parentId IS NULL);
-- a container card drills into a category-grouped list of its child items, each
-- shown with a real photo pulled from the walkthrough video.
--
-- Columns added to ship_inventory_items:
--   parentId          self-reference (nullable) -> ship_inventory_items(id);
--                     relational integrity is enforced in the procedure layer
--                     (house style: no .references() exists anywhere in schema.ts).
--   isContainer       true for hero cards that hold child items.
--   provenance        where the row came from: 'curated' (the hand-authored bag),
--                     'transcribed' (a manifest item), 'curator_added' (a container node).
--   zone/unit/itemCondition/confidence   carried over from the manifest taxonomy.
--   sourceVideo/sourceTimestamp          walkthrough-video provenance (for frame extraction).
--   frameUrl          real photo pulled from the walkthrough video (detail view;
--                     the overview uses iconUrl).
--   manifestCategory  the manifest taxonomy value, kept verbatim so we do not
--                     remap lossily into the 9-value `category` enum.
-- comingYear2 already exists (0209_ship_inventory_corrections.sql) and is NOT re-added.

ALTER TABLE ship_inventory_items
  ADD COLUMN parentId int DEFAULT NULL,
  ADD COLUMN isContainer boolean NOT NULL DEFAULT false,
  ADD COLUMN provenance enum('curated','transcribed','curator_added') NOT NULL DEFAULT 'curated',
  ADD COLUMN zone varchar(40) DEFAULT NULL,
  ADD COLUMN unit varchar(40) DEFAULT NULL,
  ADD COLUMN itemCondition varchar(60) DEFAULT NULL,
  ADD COLUMN confidence varchar(12) DEFAULT NULL,
  ADD COLUMN sourceVideo varchar(120) DEFAULT NULL,
  ADD COLUMN sourceTimestamp varchar(12) DEFAULT NULL,
  ADD COLUMN frameUrl varchar(512) DEFAULT NULL,
  ADD COLUMN manifestCategory varchar(40) DEFAULT NULL,
  ADD KEY ship_inventory_parent_idx (parentId);
