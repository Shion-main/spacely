-- Migration: Create separate admin table
-- Description: Creates a dedicated admin table separate from regular users
-- Date: 2024

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin table
CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    employee_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    department TEXT, -- IT, Operations, etc.
    permissions JSONB DEFAULT '{}', -- Store specific permissions
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admins(admin_id),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create updated_at trigger for admins table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- login, logout, create_listing, approve_listing, etc.
    resource_type TEXT, -- user, listing, report, etc.
    resource_id TEXT, -- ID of the affected resource
    details JSONB, -- Additional action details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
-- Admins can view all admin records
CREATE POLICY "Admins can view all admin records" ON admins
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admin_id::text = auth.uid()::text 
            AND is_active = true
        )
    );

-- Admins can update their own record
CREATE POLICY "Admins can update own record" ON admins
    FOR UPDATE
    USING (admin_id::text = auth.uid()::text)
    WITH CHECK (admin_id::text = auth.uid()::text);

-- Super admins can insert new admins
CREATE POLICY "Super admins can create admins" ON admins
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admin_id::text = auth.uid()::text 
            AND role = 'super_admin' 
            AND is_active = true
        )
    );

-- Super admins can delete admins (but not themselves)
CREATE POLICY "Super admins can delete other admins" ON admins
    FOR DELETE
    USING (
        admin_id::text != auth.uid()::text 
        AND EXISTS (
            SELECT 1 FROM admins 
            WHERE admin_id::text = auth.uid()::text 
            AND role = 'super_admin' 
            AND is_active = true
        )
    );

-- RLS Policies for admin_audit_log table
-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admin_id::text = auth.uid()::text 
            AND is_active = true
        )
    );

-- System can insert audit logs (no user restriction)
CREATE POLICY "System can insert audit logs" ON admin_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Create admin authentication table (links to auth.users)
CREATE TABLE IF NOT EXISTS admin_auth (
    auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin_auth
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

-- RLS Policy for admin_auth
CREATE POLICY "Admin auth records are managed by system" ON admin_auth
    FOR ALL
    USING (auth_id = auth.uid());

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_audit_log (
        admin_id, action, resource_type, resource_id, 
        details, ip_address, user_agent
    ) VALUES (
        p_admin_id, p_action, p_resource_type, p_resource_id,
        p_details, p_ip_address, p_user_agent
    ) RETURNING admin_audit_log.log_id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_active ON admins(is_active);
CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);

-- Insert the initial super admin
INSERT INTO admins (
    admin_id,
    email,
    password_hash,
    full_name,
    employee_id,
    role,
    department,
    permissions,
    is_active
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'admin@spacely.com',
    crypt('SpacelyAdmin2025', gen_salt('bf')),
    'System Administrator',
    'SPACELY001',
    'super_admin',
    'IT Operations',
    '{"full_access": true, "can_create_admins": true, "can_manage_users": true, "can_approve_listings": true, "can_view_reports": true, "can_manage_system": true}'::jsonb,
    true
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Comment on tables and columns
COMMENT ON TABLE admins IS 'Administrator accounts separate from regular users';
COMMENT ON COLUMN admins.permissions IS 'JSONB object storing specific admin permissions';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions';
COMMENT ON TABLE admin_auth IS 'Links Supabase auth users to admin accounts'; 