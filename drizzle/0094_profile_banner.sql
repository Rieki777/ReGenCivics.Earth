-- Add banner image URL to both profile tables
ALTER TABLE player_profiles ADD COLUMN bannerUrl VARCHAR(512) DEFAULT NULL AFTER avatarUrl;
ALTER TABLE userProfiles ADD COLUMN bannerUrl VARCHAR(500) DEFAULT NULL AFTER avatarUrl;
