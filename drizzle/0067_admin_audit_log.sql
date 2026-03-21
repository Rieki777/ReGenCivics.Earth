CREATE TABLE IF NOT EXISTS adminAuditLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adminUserId INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entityType VARCHAR(50),
  entityId INT,
  description TEXT,
  metadata JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX adminAuditLog_adminUserId_idx (adminUserId),
  INDEX adminAuditLog_action_idx (action),
  INDEX adminAuditLog_entityType_entityId_idx (entityType, entityId),
  INDEX adminAuditLog_createdAt_idx (createdAt)
);
