-- SPACELY Admin Setup
-- Run this in Supabase SQL Editor

-- Insert into users table
INSERT INTO users (
    user_id,
    full_name,
    id_number,
    role,
    email,
    phone_number
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'System Administrator',
    'ADMIN0001',
    'admin',
    'admin@spacely.com',
    '+631234567890'
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    id_number = EXCLUDED.id_number,
    phone_number = EXCLUDED.phone_number,
    updated_at = NOW();

-- Insert into admins table
INSERT INTO admins (
    admin_id,
    email,
    full_name,
    employee_id,
    role,
    department,
    permissions,
    is_active
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'admin@spacely.com',
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

-- Verify the inserts
SELECT 'Users Table:' as table_name;
SELECT user_id, email, full_name, role FROM users WHERE email = 'admin@spacely.com';

SELECT 'Admins Table:' as table_name;
SELECT admin_id, email, full_name, role, employee_id FROM admins WHERE email = 'admin@spacely.com'; 