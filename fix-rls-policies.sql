-- Fix RLS Policy Issues - Infinite Recursion
-- This fixes the "infinite recursion detected in policy for relation users" error

-- Step 1: Drop all existing problematic policies on users table
DROP POLICY IF EXISTS "Admin users can access all data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;

-- Step 2: Create simple, non-recursive policies
-- Policy 1: Allow users to read their own data
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Allow users to update their own data
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to insert (for registration)
CREATE POLICY "users_insert_authenticated" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Simple admin access (avoid recursion by not querying users table)
-- We'll handle admin access in the application layer instead of RLS

-- Step 3: Verify RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Test the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Step 5: For debugging - temporarily disable RLS if needed
-- (Uncomment the line below ONLY for testing, then re-enable)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY; 