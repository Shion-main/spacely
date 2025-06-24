const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function forceLinkAdmin() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔗 Force linking admin user...')
  console.log('Using UUID from your screenshot: f47ac10b-58cc-4372-a567-0e02b2c3d479')

  try {
    // Update the users table to use the correct UUID from auth.users
    const { data: updateData, error: updateError } = await client
      .from('users')
      .update({ 
        user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      })
      .eq('email', 'admin@spacely.com')
      .select()

    if (updateError) {
      console.error('❌ Error updating users table:', updateError)
      return
    }

    console.log('✅ Updated users table successfully')
    console.log('Admin user data:', updateData[0])

    // Now try to test authentication
    console.log('\n🔑 Testing authentication with common passwords...')
    
    const commonPasswords = [
      'AdminPass123!',
      'admin123',
      'Admin123!', 
      'spacely123',
      'Spacely123!',
      'password',
      'admin'
    ]

    for (const password of commonPasswords) {
      console.log(`   Trying password: ${password}`)
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@spacely.com',
        password: password
      })

      if (!signInError) {
        console.log(`✅ SUCCESS! Password is: ${password}`)
        console.log(`   User ID: ${signInData.user.id}`)
        
        // Sign out immediately
        await client.auth.signOut()
        
        console.log('\n🎉 Admin login is now working!')
        console.log(`Email: admin@spacely.com`)
        console.log(`Password: ${password}`)
        return
      }
    }

    console.log('\n❌ None of the common passwords worked.')
    console.log('💡 You need to reset the password in Supabase Dashboard:')
    console.log('   1. Go to Authentication → Users')
    console.log('   2. Click on admin@spacely.com')
    console.log('   3. Click "Send password recovery"')
    console.log('   4. Or manually set a new password')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

forceLinkAdmin() 