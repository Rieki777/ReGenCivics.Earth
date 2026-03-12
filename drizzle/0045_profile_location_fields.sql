-- Migration: Add coordinate-based location fields to player_profiles
ALTER TABLE `player_profiles`
  ADD COLUMN `locationLat` double,
  ADD COLUMN `locationLng` double,
  ADD COLUMN `locationPrecision` enum('exact','city','region','hidden') DEFAULT 'region',
  ADD COLUMN `locationLabel` varchar(255),
  ADD COLUMN `locationNomadic` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `locationEarth` tinyint NOT NULL DEFAULT 0;
