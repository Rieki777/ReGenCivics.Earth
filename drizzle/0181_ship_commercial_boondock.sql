-- 0181: add the commercial_boondock location type to the ship treasure map.
-- Rest areas, Walmart / Home Depot lots, and other high-traffic paved sites
-- where a rig can pass a quick legal night. Appended to the enum (append-only
-- keeps existing values' ordinals stable).
ALTER TABLE ship_locations
  MODIFY COLUMN type ENUM(
    'land_project', 'spring', 'waterfall', 'lake', 'geology',
    'forest', 'food_forest', 'seed_site', 'boondock', 'event_venue',
    'commercial_boondock'
  ) NOT NULL;
