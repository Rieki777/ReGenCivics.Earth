-- Rollback for 0067_admin_audit_log.sql
-- Drops the adminAuditLog table (all audit history will be permanently lost)
-- WARNING: This action is irreversible. Backup the table before dropping.
DROP TABLE IF EXISTS adminAuditLog;
