const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function makeAdmin() {
  try {
    // Get the email from command line arguments
    const email = process.argv[2]
    
    if (!email) {
      console.error('Please provide an email address')
      console.log('Usage: node scripts/make-admin.js user@mcm.edu.ph')
      process.exit(1)
    }

    console.log(`Making ${email} an admin...`)

    // Update the user's role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', email)
      .select()

    if (error) {
      console.error('Error updating user role:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully made user an admin:', data[0])
    } else {
      console.log('❌ No user found with that email address')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

makeAdmin() 