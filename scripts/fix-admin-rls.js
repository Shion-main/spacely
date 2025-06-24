const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixAdminRLS() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔍 Checking RLS policies and admin user issues...')

  try {
    // First, let's check if we can access the admin user with service client
    console.log('\n1️⃣ Testing service client access to admin user:')
    const { data: adminUser, error: adminError } = await client
      .from('users')
      .select('*')
      .eq('email', 'admin@spacely.com')
      .single()

    if (adminError) {
      console.log('❌ Service client cannot access admin user:', adminError.message)
    } else {
      console.log('✅ Service client can access admin user')
      console.log(`   UUID: ${adminUser.user_id}`)
      console.log(`   Role: ${adminUser.role}`)
    }

    // Test direct auth
    console.log('\n2️⃣ Testing direct Supabase auth access:')
    try {
      const { data: authTest, error: authTestError } = await client.auth.admin.getUserById(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      )
      
      if (authTestError) {
        console.log('❌ Cannot access auth user:', authTestError.message)
      } else {
        console.log('✅ Can access auth user')
        console.log(`   Email: ${authTest.user.email}`)
        console.log(`   Confirmed: ${authTest.user.email_confirmed_at ? 'Yes' : 'No'}`)
      }
    } catch (error) {
      console.log('❌ Auth access error:', error.message)
    }

    console.log('\n🔧 SQL Fixes to run in Supabase SQL Editor:')
    console.log('=' .repeat(60))
    
    const sqlFixes = `
-- Fix 1: Ensure admin user is properly confirmed
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'admin@spacely.com';

-- Fix 2: Set a password for admin user
UPDATE auth.users 
SET 
    encrypted_password = crypt('AdminPass123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'admin@spacely.com';

-- Fix 3: Check and fix RLS policies for users table
-- Temporarily disable RLS to test (CAREFUL: Re-enable after testing)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Fix 4: Create permissive policy for admin users
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
END $$;

-- Fix 5: Verify the admin user data
SELECT 
    u.user_id,
    u.email,
    u.role,
    au.email as auth_email,
    au.email_confirmed_at,
    au.encrypted_password IS NOT NULL as has_password
FROM users u
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE u.email = 'admin@spacely.com';
`;

    console.log(sqlFixes)
    console.log('=' .repeat(60))
    
    console.log('\n📋 Instructions:')
    console.log('1. Copy the SQL above')
    console.log('2. Go to Supabase Dashboard → SQL Editor')
    console.log('3. Paste and run the SQL')
    console.log('4. Try logging in again with:')
    console.log('   Email: admin@spacely.com')
    console.log('   Password: AdminPass123!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixAdminRLS() 