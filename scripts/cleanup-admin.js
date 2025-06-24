const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧹 SPACELY Admin Cleanup')
console.log('========================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanupAdmin() {
  try {
    console.log('\n🔍 Checking for admin user in users table...')
    
    // Check if admin user exists in users table
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .or('email.eq.admin@spacely.com,email.eq.admin@dwelly.com')
    
    if (checkError) {
      console.error('❌ Error checking users:', checkError)
      return
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('📋 Found admin users to remove:')
      existingUsers.forEach(user => {
        console.log(`  • ${user.email} (ID: ${user.user_id}, Role: ${user.role})`)
      })
      
      // Remove from users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .or('email.eq.admin@spacely.com,email.eq.admin@dwelly.com')
      
      if (deleteError) {
        console.error('❌ Error removing admin users:', deleteError)
      } else {
        console.log('✅ Admin users removed from users table')
      }
    } else {
      console.log('ℹ️ No admin users found in users table')
    }
    
    console.log('\n💡 Note: Supabase Auth user needs to be manually removed from Supabase dashboard')
    console.log('Go to: Authentication > Users in your Supabase project')
    console.log('Look for: admin@spacely.com and delete it')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function main() {
  await cleanupAdmin()
  console.log('\n✨ Admin cleanup complete!')
}

main() 