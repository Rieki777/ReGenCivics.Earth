-- Add banner image URL to player profiles
ALTER TABLE player_profiles ADD COLUMN bannerUrl VARCHAR(512) DEFAULT NULL AFTER avatarUrl;
