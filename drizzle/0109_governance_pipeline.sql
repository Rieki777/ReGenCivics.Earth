CREATE TABLE forumThreadReadiness (
  forumPostId INT NOT NULL PRIMARY KEY,
  ageHours INT NOT NULL DEFAULT 0,
  uniqueVoiceCount INT NOT NULL DEFAULT 0,
  hasDecisionQuestion TINYINT(1) NOT NULL DEFAULT 0,
  trackTagged ENUM('fund','game','both') DEFAULT NULL,
  heatScore INT NOT NULL DEFAULT 0,
  isReadyToPromote TINYINT(1) NOT NULL DEFAULT 0,
  computedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ftr_ready (isReadyToPromote, heatScore)
);

CREATE TABLE forumThreadWatchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  userId INT NOT NULL,
  watchType ENUM('promotion_ready','decision_open','decision_closed') NOT NULL DEFAULT 'promotion_ready',
  notifiedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ftw (forumPostId, userId, watchType)
);

CREATE TABLE forumPromotionRequests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  proposerId INT NOT NULL,
  coSignerId INT DEFAULT NULL,
  decisionTrack ENUM('fund','game','both') NOT NULL,
  decisionQuestion VARCHAR(500) NOT NULL,
  suggestedTemplate VARCHAR(40) NOT NULL DEFAULT 'consent',
  reversibility ENUM('reversible','semi_reversible','one_way_door') NOT NULL DEFAULT 'reversible',
  bioregionScope JSON DEFAULT NULL,
  sunsetAt TIMESTAMP NULL DEFAULT NULL,
  status ENUM('pending','signed','expired','cancelled') NOT NULL DEFAULT 'pending',
  coSignedAt TIMESTAMP NULL DEFAULT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fpr_post (forumPostId),
  INDEX idx_fpr_status (status, expiresAt)
);

CREATE TABLE forumPostDecisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  loomioGroupKey VARCHAR(40) DEFAULT NULL,
  loomioDiscussionId VARCHAR(80) DEFAULT NULL,
  loomioPollKey VARCHAR(80) DEFAULT NULL,
  loomioDecisionUrl VARCHAR(500) DEFAULT NULL,
  track ENUM('fund','game','both') NOT NULL DEFAULT 'game',
  reversibility ENUM('reversible','semi_reversible','one_way_door') NOT NULL DEFAULT 'reversible',
  bioregionScope JSON DEFAULT NULL,
  sunsetAt TIMESTAMP NULL DEFAULT NULL,
  status ENUM('draft','open','closing_soon','closed','ratified','declined','cancelled') NOT NULL DEFAULT 'draft',
  closesAt TIMESTAMP NULL DEFAULT NULL,
  closedAt TIMESTAMP NULL DEFAULT NULL,
  outcomeSummary TEXT DEFAULT NULL,
  outcomeReasoning TEXT DEFAULT NULL,
  stanceCount INT NOT NULL DEFAULT 0,
  weightedStanceSummary JSON DEFAULT NULL,
  hyphaBridgeId INT DEFAULT NULL,
  storytellerId INT DEFAULT NULL,
  storytellerNarrativeId INT DEFAULT NULL,
  proposerId INT NOT NULL,
  coSignerId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fpd_post (forumPostId),
  INDEX idx_fpd_status (status, closesAt),
  INDEX idx_fpd_loomio (loomioPollKey)
);

CREATE TABLE governanceTenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  tenantType ENUM('platform','bioregion','land_project','organization') NOT NULL,
  displayName VARCHAR(200) NOT NULL,
  description TEXT,
  logoUrl VARCHAR(400),
  bannerUrl VARCHAR(400),
  accentColor VARCHAR(20),
  hyphaDhoSlug VARCHAR(80),
  loomioGroupKey VARCHAR(40) DEFAULT NULL,
  parentTenantId INT DEFAULT NULL,
  ownerUserId INT NOT NULL,
  allowedBioregions JSON DEFAULT NULL,
  config JSON DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gt_type (tenantType),
  INDEX idx_gt_parent (parentTenantId)
);

CREATE TABLE governanceTenantMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('member','moderator','steward','admin') NOT NULL DEFAULT 'member',
  joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leftAt TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_gtm (tenantId, userId),
  INDEX idx_gtm_user (userId)
);

CREATE TABLE governanceTokenLedger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  tenantId INT NOT NULL,
  amount DECIMAL(30,6) NOT NULL,
  type ENUM('harvest','gratitude','grant','expense','adjustment','claim') NOT NULL,
  sourceRef VARCHAR(120) DEFAULT NULL,
  description VARCHAR(400) DEFAULT NULL,
  claimedAt TIMESTAMP NULL DEFAULT NULL,
  hyphaBridgeId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gtl_user_tenant (userId, tenantId),
  INDEX idx_gtl_unclaimed (userId, claimedAt)
);

CREATE TABLE governanceAgreements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  loomioDecisionId VARCHAR(80) DEFAULT NULL,
  loomioPollKey VARCHAR(80) DEFAULT NULL,
  forumPostDecisionId INT DEFAULT NULL,
  title VARCHAR(300) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  ratifiedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sunsetAt TIMESTAMP NULL DEFAULT NULL,
  renewalThreadId INT DEFAULT NULL,
  status ENUM('active','sunsetted','superseded','withdrawn') NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ga_tenant (tenantId, status),
  INDEX idx_ga_sunset (sunsetAt)
);

CREATE TABLE hyphaBridges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bridgeKey VARCHAR(16) NOT NULL UNIQUE,
  source ENUM('loomio_decision','crowdpool','contribution_claim','fund_grant','expense','exit','redeem_tokens','other') NOT NULL,
  sourceId VARCHAR(80) NOT NULL,
  targetDhoSlug VARCHAR(80) NOT NULL,
  formKind ENUM('propose_contribution','deploy_funds','pay_for_expenses','membership_exit','buy_hypha_tokens','redeem_tokens','activate_spaces','change_entry_method','change_voting_method','space_settings_transparency','space_to_space_membership') NOT NULL,
  initiatorUserId INT NOT NULL,
  payload JSON NOT NULL,
  status ENUM('created','handoff_sent','on_chain_detected','passed','failed','cancelled') NOT NULL DEFAULT 'created',
  hyphaProposalId VARCHAR(80) DEFAULT NULL,
  hyphaTxHash VARCHAR(80) DEFAULT NULL,
  hyphaPassedAt TIMESTAMP NULL DEFAULT NULL,
  hyphaTokenAmount DECIMAL(30,6) DEFAULT NULL,
  hyphaTokenSymbol VARCHAR(20) DEFAULT NULL,
  hyphaRecipientWallet VARCHAR(60) DEFAULT NULL,
  basescanUrl VARCHAR(200) DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hb_source (source, sourceId),
  INDEX idx_hb_status (status),
  INDEX idx_hb_target (targetDhoSlug),
  INDEX idx_hb_initiator (initiatorUserId)
);

ALTER TABLE users
  ADD COLUMN bioregions JSON DEFAULT NULL,
  ADD COLUMN rcVoiceWeight INT NOT NULL DEFAULT 1,
  ADD COLUMN rgVoiceWeight INT NOT NULL DEFAULT 1,
  ADD COLUMN availableAsStoryteller TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN privyDid VARCHAR(120) DEFAULT NULL,
  ADD COLUMN baseWalletAddress VARCHAR(60) DEFAULT NULL;
