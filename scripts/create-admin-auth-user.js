const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createAdminAuthUser() {
  // Use service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Creating admin user in Supabase Auth...')

  try {
    // First check if admin user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const existingAdmin = existingUsers.users.find(user => user.email === 'admin@spacely.com')
    
    let authData
    if (existingAdmin) {
      console.log('Admin user already exists in Auth:', existingAdmin.id)
      authData = { user: existingAdmin }
    } else {
      // Create the admin user in Supabase Auth
      const { data: newAuthData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@spacely.com',
        password: 'AdminPass123!',
        email_confirm: true, // Skip email verification for admin
        user_metadata: {
          role: 'super_admin',
          name: 'SPACELY Admin'
        }
      })

      if (authError) {
        console.error('Error creating admin user in Auth:', authError)
        // Try alternative approach - maybe user exists but we can't create
        console.log('Attempting to sign in with existing credentials...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@spacely.com',
          password: 'AdminPass123!'
        })
        
        if (signInError) {
          console.error('Admin user does not exist. Please create manually in Supabase dashboard.')
          return
        } else {
          console.log('✅ Admin user found via sign-in')
          authData = signInData
        }
      } else {
        authData = newAuthData
      }
    }

    console.log('✅ Admin user created in Supabase Auth:', authData.user.id)

    // Update the admin user record in the users table with the Auth UUID
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        user_id: authData.user.id // Set the Auth UUID as the primary key
      })
      .eq('email', 'admin@spacely.com')

    if (updateError) {
      console.error('Error updating admin user in database:', updateError)
      return
    }

    console.log('✅ Admin user updated in database with Auth UUID')
    console.log('\nAdmin credentials:')
    console.log('Email: admin@spacely.com')
    console.log('Password: AdminPass123!')
    console.log('\nYou can now log in using the Admin toggle on the auth page.')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createAdminAuthUser() 