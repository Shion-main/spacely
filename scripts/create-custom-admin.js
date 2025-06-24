const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('👤 SPACELY Custom Admin Setup')
console.log('==============================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createCustomAdmin() {
  try {
    // Get email from command line argument
    const customEmail = process.argv[2]
    
    if (!customEmail) {
      console.log('\n📧 Usage: node scripts/create-custom-admin.js your-email@gmail.com')
      console.log('\n💡 Use your real email address that you can access')
      console.log('   Examples:')
      console.log('   • your-email@gmail.com')
      console.log('   • your-name@outlook.com') 
      console.log('   • any-real-email@domain.com')
      return false
    }
    
    console.log(`\n📧 Setting up admin with: ${customEmail}`)
    console.log('🔐 Password: SpacelyAdmin2025')
    
    // Update the admin record with the custom email
    console.log('\n🔄 Updating admin record...')
    const { data: updateData, error: updateError } = await supabase
      .from('admins')
      .update({ email: customEmail })
      .eq('admin_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating admin email:', updateError.message)
      return false
    }
    
    console.log('✅ Admin record updated with your email')
    
    // Create Supabase Auth user
    console.log('\n👤 Creating Supabase Auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: customEmail,
      password: 'SpacelyAdmin2025',
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/auth/callback`,
        data: {
          full_name: 'System Administrator',
          admin_role: 'super_admin',
          is_admin: true
        }
      }
    })
    
    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth creation error:', authError.message)
      
      if (authError.message.includes('email_address_invalid')) {
        console.log('\n💡 Still having email validation issues.')
        console.log('Try these solutions:')
        console.log('1. Use a different email provider (Gmail, Outlook, etc.)')
        console.log('2. Disable email confirmation in Supabase Auth settings')
        console.log('3. Check if your email has special characters')
      }
      return false
    } else if (authError && authError.message.includes('already registered')) {
      console.log('✅ Auth user already exists for this email')
    } else {
      console.log('✅ Auth user created successfully!')
      console.log(`   Auth ID: ${authData.user?.id}`)
      console.log(`   Email confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
      
      if (!authData.user?.email_confirmed_at) {
        console.log('📧 Check your email for confirmation link!')
      }
    }
    
    // Link auth user to admin record
    if (authData.user?.id) {
      console.log('\n🔗 Linking auth user to admin record...')
      const { error: linkError } = await supabase
        .from('admin_auth')
        .upsert({
          auth_id: authData.user.id,
          admin_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        })
      
      if (linkError) {
        console.error('❌ Error linking auth to admin:', linkError.message)
      } else {
        console.log('✅ Auth user linked to admin record')
      }
    }
    
    console.log('\n🎉 CUSTOM ADMIN SETUP COMPLETE!')
    console.log('===============================')
    console.log('\n📋 Your Admin Login Credentials:')
    console.log(`   📧 Email: ${customEmail}`)
    console.log('   🔐 Password: SpacelyAdmin2025')
    console.log('   🌐 Login URL: http://localhost:5000/auth')
    
    console.log('\n📝 Next Steps:')
    console.log('1. Update lib/validations.ts to allow your email')
    console.log('2. Check your email for confirmation (if required)')
    console.log('3. Test login at http://localhost:5000/auth')
    
    return true
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    return false
  }
}

async function showValidationUpdate() {
  const customEmail = process.argv[2]
  if (!customEmail) return
  
  console.log('\n⚙️ VALIDATION UPDATE REQUIRED')
  console.log('==============================')
  console.log('\nAdd your email to lib/validations.ts:')
  console.log(`
// In userLoginSchema email validation:
.refine((email) => {
  // Allow admin emails to bypass the domain restriction
  if (email === 'admin@dwelly.com' || email === 'admin@spacely.com' || email === '${customEmail}') {
    return true
  }
  return email.endsWith('@mcm.edu.ph')
}, {
  message: 'Please use your Mapua Malayan Colleges Mindanao email address (@mcm.edu.ph)'
})`)
}

async function main() {
  const success = await createCustomAdmin()
  
  if (success) {
    await showValidationUpdate()
    console.log('\n✅ Custom admin setup complete!')
  }
}

main() 