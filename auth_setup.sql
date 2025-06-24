-- SPACELY Admin Auth Setup

-- First, create the admin user in auth.users
-- Note: The password will be set through the Supabase dashboard or API, not here
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,  -- matches our admin ID
    '00000000-0000-0000-0000-000000000000'::uuid,  -- default instance
    'admin@spacely.com',
    crypt('SpacelyAdmin2025', gen_salt('bf')),     -- set initial password
    now(),                                         -- email already confirmed
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"System Administrator"}'::jsonb,
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

-- Then create/update the admin in our users table
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

-- Create/update the admin record in admins table
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

-- Link the auth user to admin record in admin_auth table
INSERT INTO admin_auth (
    auth_id,
    admin_id
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
) ON CONFLICT (auth_id) DO NOTHING;

-- Verify the setup
SELECT 'Auth User:' as check_name, COUNT(*) as count FROM auth.users WHERE email = 'admin@spacely.com';
SELECT 'App User:' as check_name, COUNT(*) as count FROM users WHERE email = 'admin@spacely.com';
SELECT 'Admin Record:' as check_name, COUNT(*) as count FROM admins WHERE email = 'admin@spacely.com';
SELECT 'Auth Link:' as check_name, COUNT(*) as count FROM admin_auth WHERE auth_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; 