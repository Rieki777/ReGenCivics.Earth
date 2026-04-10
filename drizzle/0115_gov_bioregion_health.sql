CREATE TABLE govBioregionHealth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bioregionId INT NOT NULL,
  dimension VARCHAR(80) NOT NULL,
  ringType ENUM('ecological', 'social') NOT NULL DEFAULT 'ecological',
  currentValue DECIMAL(10,2) NOT NULL DEFAULT 0,
  thresholdMin DECIMAL(10,2) NOT NULL DEFAULT 0,
  thresholdMax DECIMAL(10,2) NOT NULL DEFAULT 100,
  unit VARCHAR(40) DEFAULT '%',
  lastUpdatedBy INT DEFAULT NULL,
  computedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_health (bioregionId, dimension),
  INDEX idx_bio (bioregionId)
);
