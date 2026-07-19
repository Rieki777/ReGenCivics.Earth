-- 0208_ship_inventory.sql
-- The Ship's Inventory: physical manifest of everything aboard the 2006
-- Fleetwood Revolution LE land yacht, transcribed from the RV walkthrough
-- videos and seeded from data/rv_inventory.json.
-- Distinct from ship_inventory_items (the gamified Shipwright gear bag).

CREATE TABLE IF NOT EXISTS `ship_inventory` (
  `id` varchar(80) NOT NULL,
  `name` varchar(200) NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(40) DEFAULT NULL,
  `category` varchar(40) NOT NULL DEFAULT 'Misc',
  `zone` varchar(40) NOT NULL DEFAULT 'Storage-general',
  `location` varchar(255) DEFAULT NULL,
  `itemCondition` varchar(60) DEFAULT NULL,
  `notes` text,
  `sourceVideo` varchar(120) DEFAULT NULL,
  `sourceTimestamp` varchar(12) DEFAULT NULL,
  `confidence` varchar(12) NOT NULL DEFAULT 'medium',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  PRIMARY KEY (`id`),
  KEY `ship_inventory_zone_idx` (`zone`),
  KEY `ship_inventory_cat_idx` (`category`)
);
