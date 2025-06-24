-- Fix Admin Auth Link
-- This query updates the admin user in your custom users table 
-- to use the correct UUID from Supabase auth.users

-- Step 1: Update the admin user's UUID to match the auth.users UUID
UPDATE users 
SET user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
WHERE email = 'admin@spacely.com';

-- Step 2: Verify the update worked
SELECT 
    user_id,
    email,
    full_name,
    role,
    id_number
FROM users 
WHERE email = 'admin@spacely.com'; 