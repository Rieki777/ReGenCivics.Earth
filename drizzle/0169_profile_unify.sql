-- Profile unification (Phase 2B), scoped to what the live data justifies.
--
-- The plan assumed userProfiles and playerProfiles hold CONFLICTING copies of
-- display data. The live data says otherwise: zero display-field conflicts,
-- zero non-zero forum stats, and 4 userProfiles rows with no playerProfiles
-- row. userProfiles also holds onboarding-only fields (path, investmentRange,
-- projectName, ...) that have no home in playerProfiles, so it cannot be
-- dropped now. This migration therefore does the safe, reversible slice:
-- make playerProfiles the single model the forum reads by giving it the
-- forum-relevant columns it lacks, and back-fill them from userProfiles.
-- Symmetric sync (added in code) keeps the two tables identical going forward,
-- so drift becomes impossible without a risky data move or table drop.
--
-- Additive columns only, no drops, fully reversible.

ALTER TABLE player_profiles ADD COLUMN website VARCHAR(500) NULL;
ALTER TABLE player_profiles ADD COLUMN forumLocation VARCHAR(255) NULL;
ALTER TABLE player_profiles ADD COLUMN preferredLanguage VARCHAR(10) NULL DEFAULT 'en';
ALTER TABLE player_profiles ADD COLUMN reputation INT NOT NULL DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN onboardingComplete TINYINT NOT NULL DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN forumLastActiveAt TIMESTAMP NULL;

-- Audit table for any display-field disagreement found during back-fill.
-- Empty in the current data, present so the reconciliation is inspectable
-- and future back-fills have somewhere to record conflicts.
CREATE TABLE IF NOT EXISTS profile_merge_conflicts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  field VARCHAR(64) NOT NULL,
  playerProfilesValue TEXT NULL,
  userProfilesValue TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Record display-field conflicts (both sides non-empty and different) before
-- touching anything, so a human can review. playerProfiles stays canonical.
INSERT INTO profile_merge_conflicts (userId, field, playerProfilesValue, userProfilesValue)
SELECT up.userId, 'bio', pp.bio, up.bio
FROM userProfiles up INNER JOIN player_profiles pp ON pp.userId = up.userId
WHERE up.bio IS NOT NULL AND up.bio <> '' AND pp.bio IS NOT NULL AND pp.bio <> '' AND up.bio <> pp.bio;

-- Back-fill the forum-relevant fields onto playerProfiles. Copy straight over:
-- these columns are new on playerProfiles, so there is nothing to overwrite.
UPDATE player_profiles pp
INNER JOIN userProfiles up ON up.userId = pp.userId
SET pp.website = up.website,
    pp.forumLocation = up.location,
    pp.preferredLanguage = COALESCE(up.preferredLanguage, 'en'),
    pp.reputation = up.reputation,
    pp.onboardingComplete = up.onboardingComplete,
    pp.forumLastActiveAt = up.lastActiveAt;

-- Back-fill display fields only where playerProfiles is empty and userProfiles
-- has a value (playerProfiles stays canonical where both are set).
UPDATE player_profiles pp
INNER JOIN userProfiles up ON up.userId = pp.userId
SET pp.bio = up.bio
WHERE (pp.bio IS NULL OR pp.bio = '') AND up.bio IS NOT NULL AND up.bio <> '';

UPDATE player_profiles pp
INNER JOIN userProfiles up ON up.userId = pp.userId
SET pp.avatarUrl = up.avatarUrl
WHERE (pp.avatarUrl IS NULL OR pp.avatarUrl = '') AND up.avatarUrl IS NOT NULL AND up.avatarUrl <> '';

UPDATE player_profiles pp
INNER JOIN userProfiles up ON up.userId = pp.userId
SET pp.bannerUrl = up.bannerUrl
WHERE (pp.bannerUrl IS NULL OR pp.bannerUrl = '') AND up.bannerUrl IS NOT NULL AND up.bannerUrl <> '';
