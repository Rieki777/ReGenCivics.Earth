-- ReGen Games Expansion: Citizenship tiers, proposals, councils, economy features
-- Run after 0096 + 0097 migrations

-- ─── New fields on existing tables ────────────────────────────────────────

-- playerProfiles: citizenship tier + contribution scoring
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS citizenshipTier ENUM('explorer','co_creator','steward','sage') DEFAULT 'explorer',
  ADD COLUMN IF NOT EXISTS citizenshipTierUpdatedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS graceStartedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS contributionScore DOUBLE DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contributionScoreRaw INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currentTier VARCHAR(50) DEFAULT 'Seedling',
  ADD COLUMN IF NOT EXISTS trustScore DOUBLE DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS scoreLastCalculatedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS seasonsCompleted INT DEFAULT 0;

-- applications: land project status progression
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS projectStatus ENUM('applied','accepted','active','established','anchor') DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS projectStatusUpdatedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS endorsementCount INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contributionCount INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fundedCampaignCount INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seasonsActive INT DEFAULT 0;

-- postReactions: forum reputation weighting
ALTER TABLE postReactions
  ADD COLUMN IF NOT EXISTS reactionWeight DOUBLE DEFAULT 1.0;

-- organisations: regenerative reputation
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS regenerativeScore DOUBLE NULL,
  ADD COLUMN IF NOT EXISTS regenerativeTier ENUM('regular','reputable','sustainable','regenerative','thriving') NULL,
  ADD COLUMN IF NOT EXISTS communityRatingsCount INT DEFAULT 0;

-- game_endorsements: endorser tier snapshot
ALTER TABLE game_endorsements
  ADD COLUMN IF NOT EXISTS endorserTierAtTime VARCHAR(20) NULL;

-- referrals: referral code + earned tracking
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS referralCode VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS rewardsEarned DOUBLE DEFAULT 0;

-- ─── New tables ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizenship_tier_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  fromTier ENUM('explorer','co_creator','steward','sage') NOT NULL,
  toTier ENUM('explorer','co_creator','steward','sage') NOT NULL,
  reason ENUM('automatic','admin_override','nomination','grace_period_expired') NOT NULL,
  promotedBy INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cth_user (userId)
);

CREATE TABLE IF NOT EXISTS seasonal_councils (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seasonId INT NOT NULL,
  status ENUM('upcoming','active','completed') DEFAULT 'upcoming',
  meetingDate DATETIME NULL,
  notes TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasonal_council_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  councilId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('top_contributor','core_team','elected') NOT NULL,
  attendedAt DATETIME NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lunar_cycles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  startDate DATETIME NOT NULL,
  endDate DATETIME NOT NULL,
  seasonId INT NULL,
  name VARCHAR(100) NULL,
  status ENUM('upcoming','active','completed') DEFAULT 'upcoming',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_job_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jobType VARCHAR(50) NOT NULL,
  startedAt DATETIME NOT NULL,
  completedAt DATETIME NULL,
  status ENUM('running','success','partial_failure','failed') DEFAULT 'running',
  promotions INT DEFAULT 0,
  demotions INT DEFAULT 0,
  playersProcessed INT DEFAULT 0,
  errors JSON NULL,
  triggeredBy VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category ENUM('fund_allocation','game_variable','new_quest','food_economy','platform_feature','community','bff_initiative','partnership','community_agreement','other') NOT NULL,
  status ENUM('idea','draft','signaling','threshold_reached','in_governance','passed','implemented','declined') DEFAULT 'idea',
  templateType VARCHAR(50) NULL,
  forumThreadId INT NULL,
  signalVoteCount INT DEFAULT 0,
  bioregionId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proposals_author (authorId),
  INDEX idx_proposals_status (status)
);

CREATE TABLE IF NOT EXISTS proposal_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_proposal_vote (proposalId, userId)
);

CREATE TABLE IF NOT EXISTS proposal_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  authorId INT NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organisation_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  raterId INT NOT NULL,
  organisationId INT NOT NULL,
  soilScore TINYINT,
  biodiversityScore TINYINT,
  waterScore TINYINT,
  chemicalFreeScore TINYINT,
  communityScore TINYINT,
  workerWellbeingScore TINYINT,
  overallScore DOUBLE,
  note TEXT NULL,
  seasonId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_food_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producerName VARCHAR(200) NOT NULL,
  contactEmail VARCHAR(200) NOT NULL,
  contactName VARCHAR(200) NOT NULL,
  bioregionId INT NULL,
  locationLat DOUBLE NULL,
  locationLng DOUBLE NULL,
  description TEXT,
  productsOffered JSON,
  regenerativePractices TEXT,
  websiteUrl VARCHAR(500) NULL,
  localScaleProfileUrl VARCHAR(500) NULL,
  status ENUM('submitted','under_review','approved','active','declined') DEFAULT 'submitted',
  communityRatingsCount INT DEFAULT 0,
  regenerativeScore DOUBLE NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS economic_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status ENUM('open','in_review','accepted','declined') DEFAULT 'open',
  voteCount INT DEFAULT 0,
  forumThreadId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_econ_suggestions_author (authorId)
);

CREATE TABLE IF NOT EXISTS economic_suggestion_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestionId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_suggestion_vote (suggestionId, userId)
);

CREATE TABLE IF NOT EXISTS activity_feed_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  eventType VARCHAR(50) NOT NULL,
  actorType VARCHAR(20) NOT NULL,
  actorId INT NULL,
  targetType VARCHAR(20) NULL,
  targetId INT NULL,
  metadata JSON NULL,
  visibility ENUM('public','community','admin') DEFAULT 'community',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_feed_type (eventType),
  INDEX idx_activity_feed_created (createdAt)
);

CREATE TABLE IF NOT EXISTS quest_unlock_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  minimumPercentile INT NOT NULL,
  requiresRitesComplete BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quest_tier_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tierId INT NOT NULL,
  questId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasonal_harvests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  seasonId INT NOT NULL,
  questsCompleted INT DEFAULT 0,
  tokensEarned DOUBLE DEFAULT 0,
  referralSignups INT DEFAULT 0,
  newTier VARCHAR(50) NULL,
  scoreAtEnd DOUBLE DEFAULT 0,
  percentileAtEnd INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_harvest_user (userId),
  INDEX idx_harvest_season (seasonId)
);
