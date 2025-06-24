const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setupAdmin() {
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔧 Setting up admin user...')

  try {
    // Check if admin user exists in users table
    const { data: existingUser, error: checkError } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', 'admin@spacely.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError)
      return
    }

    if (existingUser) {
      console.log('✅ Admin user found in database')
      
      // Update to super_admin role
      const { error: updateError } = await serviceClient
        .from('users')
        .update({ role: 'super_admin' })
        .eq('email', 'admin@spacely.com')

      if (updateError) {
        console.error('Error updating user role:', updateError)
        return
      }

      console.log('✅ Updated user role to super_admin')

      // Check auth user and update metadata
      const { data: authUsers, error: listError } = await serviceClient.auth.admin.listUsers()
      
      if (!listError) {
        const authUser = authUsers.users.find(user => user.email === 'admin@spacely.com')
        
        if (authUser) {
          await serviceClient.auth.admin.updateUserById(authUser.id, {
            user_metadata: {
              role: 'super_admin',
              name: 'SPACELY Admin'
            }
          })
          console.log('✅ Updated auth metadata')
        }
      }

      console.log('\n🎉 Admin setup complete!')
      console.log('You can now log in using the Admin toggle')
      
    } else {
      console.log('❌ No admin user found.')
      console.log('\nPlease first:')
      console.log('1. Register at SPACELY with email: admin@spacely.com')
      console.log('2. Use valid MCM details for registration')
      console.log('3. Run this script again after registration')
    }

  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupAdmin() 