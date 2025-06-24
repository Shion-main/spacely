const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkDatabaseStructure() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('📊 Your Database Structure')
  console.log('==========================')

  console.log('\n🏠 Your Custom SPACELY users table (public.users):')
  console.log('   • This is your application-specific user data')
  console.log('   • Contains: role, full_name, id_number, department, etc.')
  
  const { data: users, error: usersError } = await client
    .from('users')
    .select('user_id, email, full_name, role, id_number')
    .limit(5)

  if (!usersError && users.length > 0) {
    users.forEach(user => {
      console.log(`   • ${user.email} (${user.role}) - Student ID: ${user.id_number}`)
    })
  } else {
    console.log('   • No users found or error:', usersError?.message)
  }

  console.log('\n🔐 Supabase auth.users table:')
  console.log('   • This is Supabase\'s built-in authentication system')
  console.log('   • Contains: email, password hashes, email verification, etc.')
  
  const { data: authUsers, error: authError } = await client.auth.admin.listUsers()
  
  if (!authError && authUsers.users.length > 0) {
    authUsers.users.slice(0, 5).forEach(user => {
      const verified = user.email_confirmed_at ? 'verified' : 'unverified'
      console.log(`   • ${user.email} (${verified}) - Auth ID: ${user.id.slice(0,8)}...`)
    })
  } else {
    console.log('   • No auth users found or error:', authError?.message)
  }

  console.log('\n🔗 How they connect:')
  console.log('   • auth.users.id → users.user_id (same UUID)')
  console.log('   • When a user registers:')
  console.log('     1. Account created in auth.users (authentication)')
  console.log('     2. Profile created in users table (application data)')
  console.log('     3. Both linked by the same UUID')

  console.log('\n❓ The Issue:')
  console.log('   • admin@spacely.com exists in users table with super_admin role')
  console.log('   • But may not exist in auth.users (can\'t authenticate)')
  console.log('   • Need to either:')
  console.log('     A) Register admin@spacely.com through normal signup')
  console.log('     B) Create the auth record manually')
}

checkDatabaseStructure().catch(console.error) 