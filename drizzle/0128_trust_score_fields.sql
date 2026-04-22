ALTER TABLE player_profiles ADD COLUMN trustScoreRaw INT NOT NULL DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN trustLastCalculatedAt TIMESTAMP DEFAULT NULL;
