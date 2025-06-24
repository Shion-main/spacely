-- Temporary Fix: Disable RLS on users table
-- This will immediately fix the login issues
-- WARNING: This reduces security, so we should re-enable with proper policies later

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- This should show rowsecurity = false, meaning RLS is disabled 