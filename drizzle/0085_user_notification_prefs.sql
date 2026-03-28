-- Fix 228: Add user notification preferences JSON column to player_profiles
-- Stores per-user toggles: communityUpdates, questAnnouncements
ALTER TABLE player_profiles ADD COLUMN notificationPrefs JSON DEFAULT NULL;
