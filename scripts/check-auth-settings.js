const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAuthSettings() {
  console.log('🔍 Checking Supabase Authentication Settings')
  console.log('==========================================')

  console.log('\n📧 Email Authentication Issue Detected')
  console.log('Error: "Email logins are disabled"')
  
  console.log('\n🔧 To Fix This Issue:')
  console.log('1. Go to your Supabase Dashboard')
  console.log('2. Navigate to Authentication → Settings')
  console.log('3. Under "Auth Providers" section:')
  console.log('   • Make sure "Email" is ENABLED')
  console.log('   • Toggle it ON if it\'s currently OFF')
  
  console.log('\n⚙️  Additional Settings to Check:')
  console.log('4. Under "User Management":')
  console.log('   • Enable user signups: ON (if you want registration)')
  console.log('   • Confirm email: OFF (for easier testing, or ON for production)')
  
  console.log('\n5. Under "Email Templates":')
  console.log('   • Make sure templates are configured')
  console.log('   • Or disable email confirmation temporarily')
  
  console.log('\n🎯 Quick Fix Steps:')
  console.log('   1. Supabase Dashboard → Authentication → Settings')
  console.log('   2. Find "Email" under Auth Providers')
  console.log('   3. Click the toggle to ENABLE it')
  console.log('   4. Save settings')
  console.log('   5. Try registration again')
  
  console.log('\n💡 Alternative: Use Magic Link (if email auth stays disabled)')
  console.log('   • Magic links might still work even if password auth is disabled')
  console.log('   • Check if "Magic Link" is enabled in Auth Providers')

  // Try to get some info about the current setup
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('\n🔗 Connection Test:')
    console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'}`)
    
    // Test if we can access users
    const { data: users, error } = await client.auth.admin.listUsers()
    if (error) {
      console.log(`   ❌ Admin API Error: ${error.message}`)
    } else {
      console.log(`   ✅ Admin API Working (${users.users.length} users found)`)
    }

  } catch (error) {
    console.log(`   ❌ Connection Error: ${error.message}`)
  }
}

checkAuthSettings() 