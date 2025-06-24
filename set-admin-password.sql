-- Set Admin Password
-- This query sets a password for the admin user in Supabase Auth
-- You can change 'AdminPass123!' to any password you prefer

-- Step 1: Update the admin user's password in auth.users
-- Note: This requires service role permissions
UPDATE auth.users 
SET 
    encrypted_password = crypt('AdminPass123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'admin@spacely.com';

-- Step 2: Verify the user exists and is confirmed
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users 
WHERE email = 'admin@spacely.com'; 