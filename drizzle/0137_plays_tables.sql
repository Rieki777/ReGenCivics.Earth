CREATE TABLE plays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  creatorProjectName VARCHAR(300),
  creatorUserId INT,
  summary TEXT,
  coverImageUrl VARCHAR(500),
  websiteUrl VARCHAR(500),
  pricingModel ENUM('free', 'open_source', 'paid') DEFAULT 'open_source',
  priceRegenTokens INT DEFAULT NULL,
  externalPaymentUrl VARCHAR(500) DEFAULT NULL,
  externalPriceLabel VARCHAR(100) DEFAULT NULL,
  scale ENUM('small', 'medium', 'large') DEFAULT 'medium',
  communityType VARCHAR(100),
  sectionIdentity TEXT,
  sectionGovernance TEXT,
  sectionEconomics TEXT,
  sectionLegal TEXT,
  sectionRoles TEXT,
  sectionSeasons TEXT,
  sectionLandEcology TEXT,
  sectionAgreements TEXT,
  sectionConflict TEXT,
  sectionHealth TEXT,
  sectionEducation TEXT,
  sectionCulture TEXT,
  sectionExternalRelations TEXT,
  sectionScaling TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submittedBy INT,
  approvedBy INT,
  totalViews INT DEFAULT 0,
  totalAdoptions INT DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE play_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20),
  icon VARCHAR(50)
);

CREATE TABLE play_category_map (
  playId INT NOT NULL,
  categoryId INT NOT NULL,
  PRIMARY KEY (playId, categoryId)
);

CREATE TABLE play_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT NOT NULL,
  comment TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_endorsement (playId, userId)
);

CREATE TABLE play_adoptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT NOT NULL,
  projectName VARCHAR(300),
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE play_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT DEFAULT NULL,
  referrer VARCHAR(500),
  viewedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
