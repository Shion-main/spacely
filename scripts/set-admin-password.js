const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setAdminPassword() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔑 Setting admin password...')

  try {
    // Update the admin user's password
    const { data, error } = await client.auth.admin.updateUserById(
      'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Admin UUID from your screenshot
      {
        password: 'AdminPass123!' // You can change this to any password
      }
    )

    if (error) {
      console.error('❌ Error setting password:', error)
      return
    }

    console.log('✅ Admin password set successfully!')
    console.log('\n🔐 Admin Login Credentials:')
    console.log('Email: admin@spacely.com')
    console.log('Password: AdminPass123!')
    console.log('\nYou can now log in using the Admin toggle on the auth page.')

  } catch (error) {
    console.error('❌ Failed to set password:', error)
  }
}

setAdminPassword() 