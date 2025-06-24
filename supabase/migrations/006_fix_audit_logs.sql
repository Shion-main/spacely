-- Add new audit action types
ALTER TYPE audit_action ADD VALUE 'login';
ALTER TYPE audit_action ADD VALUE 'logout';
ALTER TYPE audit_action ADD VALUE 'approve_post';
ALTER TYPE audit_action ADD VALUE 'reject_post';
ALTER TYPE audit_action ADD VALUE 'archive_post';
ALTER TYPE audit_action ADD VALUE 'delete_post';
ALTER TYPE audit_action ADD VALUE 'ban_user';
ALTER TYPE audit_action ADD VALUE 'unban_user';
ALTER TYPE audit_action ADD VALUE 'view_sensitive_data';
ALTER TYPE audit_action ADD VALUE 'flag_post';
ALTER TYPE audit_action ADD VALUE 'unflag_post';
ALTER TYPE audit_action ADD VALUE 'access_reports';

-- Add metadata column to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Make table_name and record_id nullable for actions that don't affect specific records
ALTER TABLE audit_logs 
ALTER COLUMN table_name DROP NOT NULL,
ALTER COLUMN record_id DROP NOT NULL;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Add comment for clarity
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for all admin actions including login, logout, post management, user management, and data access';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional metadata like IP address, user agent, reasons, etc.'; 