-- Sprint 7: Historical Contribution Claim Flow
-- Tables: historicalClaims, toolsLibraryEntries, proposalParties

CREATE TABLE IF NOT EXISTS historicalClaims (
  id INT AUTO_INCREMENT PRIMARY KEY,

  userId INT NOT NULL,
  claimType ENUM('individual','organization') NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  orgDescription TEXT,

  formsOfCapital JSON NOT NULL,
  duration ENUM('under_1_year','1_3_years','3_5_years','5_10_years','10_plus_years'),
  reach VARCHAR(50),
  tangibleOutputs JSON NOT NULL,
  description TEXT,
  evidenceLinks JSON NOT NULL,
  whatsAlive TEXT,

  suggestedTier VARCHAR(50),
  suggestedTierUsd INT,
  suggestedTierTokens BIGINT,
  contributorOverride ENUM('accept','higher','lower') DEFAULT 'accept',
  overrideReason TEXT,

  routeToToolsLibrary TINYINT(1) DEFAULT 0,
  routeToLocalScale TINYINT(1) DEFAULT 0,
  routeToGovernance TINYINT(1) DEFAULT 0,
  routeToMentoring TINYINT(1) DEFAULT 0,
  routeToFundPathway TINYINT(1) DEFAULT 0,

  status ENUM('draft','submitted','under_review','approved','adjusted','flagged','ratified','published') NOT NULL DEFAULT 'draft',
  currentStep INT NOT NULL DEFAULT 1,

  reviewerId INT,
  reviewedAt DATETIME,
  reviewDecision ENUM('confirmed','adjusted','flagged'),
  reviewNote TEXT,
  adjustedTier VARCHAR(50),
  adjustedTierUsd INT,
  adjustedTierTokens BIGINT,

  finalTier VARCHAR(50),
  finalTierUsd INT,
  finalTierTokens BIGINT,
  ratifiedAt DATETIME,
  proposalPartyId INT,

  improvementSuggestion TEXT,
  improvementPostedToForum TINYINT(1) DEFAULT 0,
  improvementForumPostId INT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submittedAt DATETIME,
  publishedAt DATETIME,

  INDEX idx_claims_status (status),
  INDEX idx_claims_user (userId),
  INDEX idx_claims_type (claimType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS toolsLibraryEntries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claimId INT NOT NULL,
  contributorUserId INT NOT NULL,

  toolName VARCHAR(255) NOT NULL,
  toolDescription TEXT NOT NULL,
  toolType ENUM('tool_software','curriculum_course','methodology_framework','templates_guides','physical_space','network_community','publications_research','art_media','financial_infrastructure','other') NOT NULL,
  capitalForm VARCHAR(50),
  accessLink TEXT,
  usageNotes TEXT,

  status ENUM('pending','published') NOT NULL DEFAULT 'pending',

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tools_status (status),
  INDEX idx_tools_contributor (contributorUserId),
  INDEX idx_tools_claim (claimId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proposalParties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  scheduledAt DATETIME NOT NULL,
  season INT NOT NULL DEFAULT 1,
  videoLink TEXT,
  recordingLink TEXT,
  status ENUM('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
  notes TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
