-- Migration: Create SPACELY admin user
-- Description: Creates the admin user for SPACELY (migrated from DWELLY)
-- Date: 2024

-- Insert the admin user into the users table
-- Using a fixed UUID for consistency
INSERT INTO users (
    user_id,
    full_name,
    id_number,
    role,
    year_level,
    department_id,
    course_id,
    email,
    phone_number,
    is_blocked,
    is_deleted,
    created_at,
    updated_at
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'System Administrator',
    'ADMIN0001',
    'admin'::user_role,
    NULL,
    NULL,
    NULL,
    'admin@spacely.com',
    '+631234567890',
    false,
    false,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    id_number = EXCLUDED.id_number,
    phone_number = EXCLUDED.phone_number,
    updated_at = NOW();

-- Also update any existing admin@dwelly.com to the new SPACELY email
UPDATE users 
SET 
    email = 'admin@spacely.com',
    full_name = 'System Administrator',
    updated_at = NOW()
WHERE email = 'admin@dwelly.com';

-- Ensure the admin has the correct role
UPDATE users 
SET 
    role = 'admin'::user_role,
    updated_at = NOW()
WHERE email = 'admin@spacely.com'; 