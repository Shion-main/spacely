const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugAdminAuth() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔍 Debugging Admin Authentication')
  console.log('=================================')

  try {
    // Check users table
    console.log('\n1️⃣ Checking custom users table:')
    const { data: usersData, error: usersError } = await client
      .from('users')
      .select('*')
      .eq('email', 'admin@spacely.com')
      .single()

    if (usersError) {
      console.log('❌ Error or no admin user found in users table:', usersError.message)
    } else {
      console.log('✅ Admin user found in users table:')
      console.log(`   • UUID: ${usersData.user_id}`)
      console.log(`   • Email: ${usersData.email}`)
      console.log(`   • Role: ${usersData.role}`)
      console.log(`   • Name: ${usersData.full_name}`)
    }

    // Check auth.users table
    console.log('\n2️⃣ Checking auth.users table:')
    const { data: authUsers, error: authError } = await client.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error accessing auth.users:', authError.message)
    } else {
      const adminAuthUser = authUsers.users.find(user => user.email === 'admin@spacely.com')
      
      if (adminAuthUser) {
        console.log('✅ Admin user found in auth.users:')
        console.log(`   • UUID: ${adminAuthUser.id}`)
        console.log(`   • Email: ${adminAuthUser.email}`)
        console.log(`   • Confirmed: ${adminAuthUser.email_confirmed_at ? 'Yes' : 'No'}`)
        console.log(`   • Created: ${adminAuthUser.created_at}`)
        
        // Check if UUIDs match
        if (usersData && adminAuthUser.id === usersData.user_id) {
          console.log('✅ UUIDs match - users are properly linked!')
        } else {
          console.log('❌ UUIDs do NOT match - users are not linked!')
          if (usersData) {
            console.log(`   • users.user_id: ${usersData.user_id}`)
            console.log(`   • auth.users.id: ${adminAuthUser.id}`)
          }
        }
      } else {
        console.log('❌ Admin user NOT found in auth.users')
      }
    }

    // Try to authenticate
    console.log('\n3️⃣ Testing authentication:')
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'admin@spacely.com',
      password: 'AdminPass123!'
    })

    if (signInError) {
      console.log('❌ Authentication failed:', signInError.message)
      console.log('   Code:', signInError.code)
    } else {
      console.log('✅ Authentication successful!')
      console.log(`   • User ID: ${signInData.user.id}`)
      
      // Sign out immediately to clean up
      await client.auth.signOut()
    }

    console.log('\n🔧 Next Steps:')
    if (!authUsers.users.find(user => user.email === 'admin@spacely.com')) {
      console.log('   • Admin user needs to be created in auth.users')
      console.log('   • Use Supabase Dashboard → Authentication → Users → Add user')
      console.log('   • Or use the registration form on your website')
    } else if (usersData && authUsers.users.find(user => user.email === 'admin@spacely.com')) {
      const adminAuthUser = authUsers.users.find(user => user.email === 'admin@spacely.com')
      if (adminAuthUser.id !== usersData.user_id) {
        console.log('   • Run SQL to link the users:')
        console.log(`   UPDATE users SET user_id = '${adminAuthUser.id}' WHERE email = 'admin@spacely.com';`)
      } else {
        console.log('   • Check if password is set correctly')
        console.log('   • Try resetting password in Supabase Dashboard')
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

debugAdminAuth() 