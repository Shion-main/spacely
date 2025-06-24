const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkCurrentUsers() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  console.log('🔍 Checking current user state after registration attempt...')
  
  try {
    // Check users table for spacely emails
    const { data: users, error: usersError } = await client
      .from('users')
      .select('*')
      .or('email.ilike.%spacely%,email.ilike.%admin%')
    
    console.log('\n📊 Users table (admin/spacely emails):')
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`  • ${user.email} (${user.role}) - ID: ${user.user_id}`)
        console.log(`    Name: ${user.full_name}`)
        console.log(`    Created: ${user.created_at}`)
        console.log('    ---')
      })
    } else {
      console.log('  No admin/spacely users found')
      if (usersError) {
        console.log('  Error:', usersError.message)
      }
    }
    
    // Check auth users
    const { data: authUsers, error: authError } = await client.auth.admin.listUsers()
    
    console.log('\n🔐 Auth users (all):')
    if (authUsers && authUsers.users.length > 0) {
      authUsers.users.forEach(user => {
        const confirmed = user.email_confirmed_at ? 'verified' : 'unverified'
        console.log(`  • ${user.email} (${confirmed}) - ID: ${user.id.slice(0,8)}...`)
        console.log(`    Created: ${user.created_at}`)
        console.log('    ---')
      })
    } else {
      console.log('  No auth users found')
      if (authError) {
        console.log('  Error:', authError.message)
      }
    }

    // Try to find matching users
    console.log('\n🔗 Checking for matching users:')
    if (users && authUsers) {
      for (const user of users) {
        const authUser = authUsers.users.find(au => au.email === user.email)
        if (authUser) {
          if (authUser.id === user.user_id) {
            console.log(`✅ ${user.email} - Properly linked`)
          } else {
            console.log(`❌ ${user.email} - UUID mismatch`)
            console.log(`   users.user_id: ${user.user_id}`)
            console.log(`   auth.users.id: ${authUser.id}`)
          }
        } else {
          console.log(`❌ ${user.email} - Exists in users table but not in auth`)
        }
      }
    }

    console.log('\n💡 Next steps:')
    if (users && users.find(u => u.email.includes('spacely'))) {
      console.log('1. User exists in database - need to link with auth')
      console.log('2. Run upgrade script to make them admin')
    } else {
      console.log('1. Registration may have failed')
      console.log('2. Try registering again or create user manually')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkCurrentUsers() 