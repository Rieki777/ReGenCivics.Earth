-- Regen Civilization Tools Library

CREATE TABLE IF NOT EXISTS regen_tool_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7),
  icon VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regen_tools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  websiteUrl VARCHAR(500) NOT NULL,
  logoUrl VARCHAR(500),
  cardImageUrl VARCHAR(500),
  shortSummary TEXT,
  longDescription TEXT,
  pricingModel ENUM('free','freemium','paid','open_source') DEFAULT 'free',
  gettingStartedUrl VARCHAR(500),
  contactEmail VARCHAR(255),
  isOpenSource BOOLEAN DEFAULT FALSE,
  isPhysical BOOLEAN DEFAULT FALSE,
  regions JSON,
  integrations JSON,
  problemStatements JSON,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  submittedBy INT,
  approvedBy INT,
  totalClicks INT DEFAULT 0,
  seasonSpotlight INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tools_status (status),
  INDEX idx_tools_slug (slug)
);

CREATE TABLE IF NOT EXISTS regen_tool_category_map (
  toolId INT NOT NULL,
  categoryId INT NOT NULL,
  PRIMARY KEY (toolId, categoryId)
);

CREATE TABLE IF NOT EXISTS regen_tool_clicks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  toolId INT NOT NULL,
  userId INT,
  referrer VARCHAR(255),
  clickedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clicks_tool (toolId)
);

CREATE TABLE IF NOT EXISTS regen_tool_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  toolId INT NOT NULL,
  userId INT NOT NULL,
  questId INT,
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_endorsement (toolId, userId)
);

CREATE TABLE IF NOT EXISTS regen_tool_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  toolId INT NOT NULL,
  postId INT,
  detectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed categories
INSERT INTO regen_tool_categories (name, slug, color, icon) VALUES
('Governance', 'governance', '#8b5cf6', 'Vote'),
('Finance', 'finance', '#f59e0b', 'Coins'),
('Community', 'community', '#7dd87d', 'Users'),
('Food Systems', 'food-systems', '#22c55e', 'Leaf'),
('Legal', 'legal', '#64748b', 'Scale'),
('Education', 'education', '#3b82f6', 'GraduationCap'),
('Communication', 'communication', '#06b6d4', 'MessageCircle'),
('Land Management', 'land-management', '#a3734c', 'MapPin'),
('Currency', 'currency', '#eab308', 'DollarSign'),
('Coordination', 'coordination', '#ec4899', 'Network'),
('Identity', 'identity', '#14b8a6', 'Shield'),
('Impact Measurement', 'impact-measurement', '#f97316', 'Target'),
('Construction', 'construction', '#78716c', 'Building'),
('Energy', 'energy', '#facc15', 'Zap'),
('Agriculture', 'agriculture', '#84cc16', 'Sprout')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed 5 starter tools
INSERT INTO regen_tools (name, slug, websiteUrl, shortSummary, pricingModel, isOpenSource, isPhysical, regions, problemStatements, status) VALUES
('Gitcoin', 'gitcoin', 'https://gitcoin.co', 'Fund public goods and open-source projects through quadratic funding rounds. Communities pool resources and algorithms amplify small contributions.', 'free', TRUE, FALSE, '["Global"]', '["We need to fund community projects fairly","We want democratic funding allocation","We need quadratic funding for public goods"]', 'approved'),
('Hypha', 'hypha', 'https://hypha.earth', 'DAO-based organizational infrastructure for purpose-driven communities. Create proposals, manage roles, handle compensation, and make decisions together.', 'freemium', TRUE, FALSE, '["Global"]', '["We need a way for our community to make decisions together","We want transparent governance","We need DAO tooling for our organization"]', 'approved'),
('Localscale', 'localscale', 'https://localscale.org', 'Build local economic systems with community currencies, marketplace tools, and mutual credit networks. Designed for bioregional food economies.', 'freemium', FALSE, FALSE, '["Global"]', '["We want to create a local currency for our food system","We need community marketplace infrastructure","We want mutual credit for our bioregion"]', 'approved'),
('Hylo', 'hylo', 'https://hylo.com', 'Community coordination platform connecting people, projects, and groups. Share resources, organize events, coordinate actions across communities.', 'free', TRUE, FALSE, '["Global"]', '["We need a community platform for our network","We want to connect groups across bioregions","We need resource sharing coordination"]', 'approved'),
('BioFi (BFF)', 'biofi', 'https://www.biofi.earth/', 'Design and implement Bioregional Financing Facilities that connect financial resources to regenerators. Place-based finance for planetary regeneration.', 'free', FALSE, FALSE, '["Global"]', '["We need bioregional finance infrastructure","We want to connect funders to regenerative projects","We need place-based financing models"]', 'approved')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Map tools to categories
INSERT IGNORE INTO regen_tool_category_map (toolId, categoryId)
SELECT t.id, c.id FROM regen_tools t, regen_tool_categories c
WHERE (t.slug = 'gitcoin' AND c.slug IN ('finance', 'coordination'))
   OR (t.slug = 'hypha' AND c.slug IN ('governance', 'coordination'))
   OR (t.slug = 'localscale' AND c.slug IN ('currency', 'food-systems'))
   OR (t.slug = 'hylo' AND c.slug IN ('community', 'communication'))
   OR (t.slug = 'biofi' AND c.slug IN ('finance', 'land-management'));
