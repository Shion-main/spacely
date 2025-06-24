-- Corrected Admin Auth Fix
-- This avoids updating the generated confirmed_at column

-- Fix 1: Ensure admin user is properly confirmed (excluding generated columns)
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'admin@spacely.com';

-- Fix 2: Set a password for admin user
UPDATE auth.users 
SET 
    encrypted_password = crypt('SpacelyAdmin2025', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'admin@spacely.com';

-- Fix 3: Create permissive policy for admin users
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admin users can access all data" ON users;
    
    -- Create new admin policy
    CREATE POLICY "Admin users can access all data" ON users
    FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM users WHERE role IN ('admin', 'super_admin')
        )
        OR auth.uid() = user_id
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END $$;

-- Fix 4: Verify the admin user data
SELECT 
    u.user_id,
    u.email,
    u.role,
    au.email as auth_email,
    au.email_confirmed_at,
    au.phone_confirmed_at,
    au.confirmed_at,
    au.encrypted_password IS NOT NULL as has_password,
    au.created_at,
    au.updated_at
FROM users u
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE u.email = 'admin@spacely.com'; 