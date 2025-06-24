-- SPACELY Admin Role Update
-- Run this in Supabase Dashboard → SQL Editor

-- Update the admin@spacely.com user to have admin role
UPDATE users 
SET role = 'admin'
WHERE email = 'admin@spacely.com';

-- Verify the update
SELECT 
    user_id,
    email,
    full_name,
    role,
    is_blocked,
    is_deleted,
    created_at
FROM users 
WHERE email = 'admin@spacely.com';

-- Check if update was successful
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@spacely.com' AND role = 'admin') THEN
        RAISE NOTICE '✅ SUCCESS: admin@spacely.com now has admin role!';
    ELSE
        RAISE NOTICE '❌ FAILED: Could not find admin@spacely.com or role was not updated';
    END IF;
END $$; 