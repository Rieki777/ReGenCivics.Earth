-- ReGen Games System: Complete schema
-- All new tables and column additions for the game layer

-- Seasons (the clock everything runs on)
CREATE TABLE IF NOT EXISTS game_seasons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  status ENUM('upcoming','active','closing','archived') DEFAULT 'upcoming',
  harvestCompleted TINYINT(1) DEFAULT 0,
  compostingCompleted TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Variables (the backbone)
CREATE TABLE IF NOT EXISTS game_variables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50) NOT NULL,
  `key` VARCHAR(100) UNIQUE NOT NULL,
  displayName VARCHAR(200) NOT NULL,
  description TEXT,
  value DECIMAL(20,6) NOT NULL,
  valueType ENUM('integer','decimal','percentage','boolean','multiplier') NOT NULL,
  minValue DECIMAL(20,6),
  maxValue DECIMAL(20,6),
  defaultValue DECIMAL(20,6) NOT NULL,
  isActive TINYINT(1) DEFAULT 1,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_variable_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  variableId INT NOT NULL,
  previousValue DECIMAL(20,6) NOT NULL,
  newValue DECIMAL(20,6) NOT NULL,
  changedBy INT NOT NULL,
  reason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contribution Scoring
CREATE TABLE IF NOT EXISTS contribution_score_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  points INT NOT NULL,
  variableKey VARCHAR(100),
  referenceType ENUM('quest','forum_post','forum_reply','event','contribution','referral','endorsement','badge','gratitude','flag','streak','crowdpool','composting') NOT NULL,
  referenceId INT,
  seasonId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_score_user (userId),
  INDEX idx_score_season (seasonId)
);

-- Gratitude
CREATE TABLE IF NOT EXISTS gratitude_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  receiverId INT NOT NULL,
  amount INT NOT NULL DEFAULT 1,
  message VARCHAR(280) NOT NULL,
  seasonId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grat_sender (senderId),
  INDEX idx_grat_receiver (receiverId)
);

CREATE TABLE IF NOT EXISTS gratitude_budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  seasonId INT NOT NULL,
  totalBudget INT NOT NULL,
  spent INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_season (userId, seasonId)
);

-- Endorsements & Flags
CREATE TABLE IF NOT EXISTS game_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  endorserType ENUM('player','project') NOT NULL,
  endorserId INT NOT NULL,
  endorsedType ENUM('player','project') NOT NULL,
  endorsedId INT NOT NULL,
  note VARCHAR(280),
  status ENUM('active','revoked','endorsed_entity_flagged') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_endorsement (endorserType, endorserId, endorsedType, endorsedId)
);

CREATE TABLE IF NOT EXISTS game_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flaggerType ENUM('player','project') NOT NULL,
  flaggerId INT NOT NULL,
  flaggedType ENUM('player','project') NOT NULL,
  flaggedId INT NOT NULL,
  reason ENUM('misrepresentation','unresponsive','safety_concern','harassment','other') NOT NULL,
  description TEXT,
  status ENUM('pending','investigating','dismissed','actioned') DEFAULT 'pending',
  adminNotes TEXT,
  resolvedAt TIMESTAMP NULL,
  cascadePenaltiesApplied TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_flag (flaggerType, flaggerId, flaggedType, flaggedId)
);

-- Seasonal Systems
CREATE TABLE IF NOT EXISTS seasonal_harvests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  seasonId INT NOT NULL,
  questsCompleted INT DEFAULT 0,
  tokensEarned DECIMAL(20,6) DEFAULT 0,
  harvestTokensReceived DECIMAL(20,6) DEFAULT 0,
  referralSignups INT DEFAULT 0,
  referralConversions INT DEFAULT 0,
  gratitudeReceived INT DEFAULT 0,
  gratitudeSent INT DEFAULT 0,
  contributionScoreStart INT DEFAULT 0,
  contributionScoreEnd INT DEFAULT 0,
  newTier VARCHAR(50),
  viewedAt TIMESTAMP NULL,
  sharedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_season_harvest (userId, seasonId)
);

-- Seasonal Councils
CREATE TABLE IF NOT EXISTS seasonal_councils (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seasonId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  seatCount INT NOT NULL DEFAULT 7,
  minimumPercentile INT NOT NULL DEFAULT 80,
  requiresRitesComplete TINYINT(1) DEFAULT 1,
  status ENUM('forming','active','archived') DEFAULT 'forming',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS council_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  councilId INT NOT NULL,
  userId INT NOT NULL,
  invitedAt TIMESTAMP NULL,
  acceptedAt TIMESTAMP NULL,
  declinedAt TIMESTAMP NULL,
  UNIQUE KEY unique_seat (councilId, userId)
);

CREATE TABLE IF NOT EXISTS council_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  councilId INT NOT NULL,
  authorId INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  options JSON,
  status ENUM('draft','submitted','voting','closed') DEFAULT 'draft',
  votingOpensAt TIMESTAMP NULL,
  votingClosesAt TIMESTAMP NULL,
  outcome TEXT,
  adminNotes TEXT,
  publishedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS council_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  selectedOption VARCHAR(200) NOT NULL,
  votedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (proposalId, userId)
);

-- Quest Unlock Tiers
CREATE TABLE IF NOT EXISTS quest_unlock_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  minimumPercentile INT NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  requiresRitesComplete TINYINT(1) DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quest_tier_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tierId INT NOT NULL,
  questId VARCHAR(100) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tier_quest (tierId, questId)
);

-- Activity Feed
CREATE TABLE IF NOT EXISTS activity_feed_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  eventType VARCHAR(50) NOT NULL,
  actorType ENUM('player','project','system') NOT NULL,
  actorId INT,
  targetType VARCHAR(50),
  targetId INT,
  metadata JSON,
  visibility ENUM('public','admin_only') DEFAULT 'public',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_type (eventType),
  INDEX idx_activity_actor (actorId),
  INDEX idx_activity_date (createdAt)
);

-- Player profile additions
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS contributionScore INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS contributionScoreRaw INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS trustScore DECIMAL(5,3) DEFAULT 1.000;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS trustScoreRaw INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS scoreLastCalculatedAt TIMESTAMP NULL;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS trustLastCalculatedAt TIMESTAMP NULL;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS currentTier VARCHAR(50) DEFAULT 'Seedling';

-- Application project status additions
ALTER TABLE applications ADD COLUMN IF NOT EXISTS projectStatus ENUM('applied','accepted','active','established','anchor') DEFAULT 'applied';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS projectStatusUpdatedAt TIMESTAMP NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS endorsementCount INT DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contributionCount INT DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS fundedCampaignCount INT DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS seasonsActive INT DEFAULT 0;

-- Post reactions weight
ALTER TABLE postReactions ADD COLUMN IF NOT EXISTS reactionWeight DECIMAL(5,2) DEFAULT 1.00;
