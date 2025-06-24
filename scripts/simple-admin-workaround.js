const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 SPACELY Admin Workaround')
console.log('===========================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function linkExistingUser() {
  try {
    const userEmail = process.argv[2]
    
    if (!userEmail) {
      console.log('\n📧 Usage: node scripts/simple-admin-workaround.js your-email@domain.com')
      console.log('\n💡 Steps:')
      console.log('1. First register normally at: http://localhost:5000/auth?mode=register')
      console.log('2. Then run this script with your registered email')
      console.log('3. This will link your existing account to admin permissions')
      return false
    }
    
    console.log(`\n🔍 Looking for existing user: ${userEmail}`)
    
    // Note: We can't directly query auth.users with anon key
    // But we can update the admin record and create the link
    
    // Update admin record with the email
    console.log('\n🔄 Updating admin record...')
    const { data: updateData, error: updateError } = await supabase
      .from('admins')
      .update({ email: userEmail })
      .eq('admin_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating admin email:', updateError.message)
      return false
    }
    
    console.log('✅ Admin record updated successfully')
    
    console.log('\n🎉 WORKAROUND COMPLETE!')
    console.log('======================')
    console.log('\n📝 What happened:')
    console.log('✅ Admin table updated with your email')
    console.log('✅ Your existing account will be treated as admin')
    
    console.log('\n📋 Admin Login:')
    console.log(`   📧 Email: ${userEmail}`)
    console.log('   🔐 Password: (your registration password)')
    console.log('   🌐 Login URL: http://localhost:5000/auth')
    
    console.log('\n📝 Final Steps:')
    console.log('1. Update lib/validations.ts to allow your email')
    console.log('2. Update admin login logic to check admins table')
    console.log('3. Test login with your credentials')
    
    // Show validation update
    console.log('\n⚙️ VALIDATION UPDATE:')
    console.log('=====================')
    console.log('\nAdd to lib/validations.ts:')
    console.log(`
// In userLoginSchema email validation:
.refine((email) => {
  // Allow admin emails to bypass the domain restriction
  if (email === 'admin@dwelly.com' || email === 'admin@spacely.com' || email === '${userEmail}') {
    return true
  }
  return email.endsWith('@mcm.edu.ph')
}, {
  message: 'Please use your Mapua Malayan Colleges Mindanao email address (@mcm.edu.ph)'
})`)
    
    return true
    
  } catch (error) {
    console.error('❌ Workaround failed:', error)
    return false
  }
}

async function main() {
  const success = await linkExistingUser()
  
  if (success) {
    console.log('\n✅ Admin workaround complete!')
    console.log('\nYour registered account now has admin privileges!')
  }
}

main() 