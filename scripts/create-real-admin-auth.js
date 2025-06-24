const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('👤 SPACELY Real Admin Setup')
console.log('============================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createRealAdminAuth() {
  try {
    console.log('\n📧 Using a real email domain for admin...')
    
    // Use a real email that will pass validation
    const adminEmail = 'admin@example.com' // This will pass Supabase validation
    
    console.log(`📧 Admin email: ${adminEmail}`)
    console.log('🔐 Password: SpacelyAdmin2025')
    
    // First, update the admin record to use the real email
    console.log('\n🔄 Updating admin record with real email...')
    const { data: updateData, error: updateError } = await supabase
      .from('admins')
      .update({ email: adminEmail })
      .eq('email', 'admin@spacely.com')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating admin email:', updateError.message)
      return false
    }
    
    console.log('✅ Admin email updated successfully')
    
    // Create Supabase Auth user with real email
    console.log('\n👤 Creating Supabase Auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
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
      return false
    } else if (authError && authError.message.includes('already registered')) {
      console.log('✅ Admin auth user already exists')
    } else {
      console.log('✅ Admin auth user created successfully!')
      console.log(`   Auth ID: ${authData.user?.id}`)
      console.log(`   Email confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
    }
    
    // Link auth user to admin record if we have the auth ID
    if (authData.user?.id) {
      console.log('\n🔗 Linking auth user to admin record...')
      const { error: linkError } = await supabase
        .from('admin_auth')
        .insert({
          auth_id: authData.user.id,
          admin_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        })
      
      if (linkError && !linkError.message.includes('duplicate key')) {
        console.error('❌ Error linking auth to admin:', linkError.message)
      } else {
        console.log('✅ Auth user linked to admin record')
      }
    }
    
    console.log('\n🎉 ADMIN SETUP COMPLETE!')
    console.log('========================')
    console.log('\n📋 Updated Admin Login Credentials:')
    console.log(`   📧 Email: ${adminEmail}`)
    console.log('   🔐 Password: SpacelyAdmin2025')
    console.log('   🌐 Login URL: http://localhost:5000/auth')
    
    console.log('\n💡 Important Notes:')
    console.log('   • Admin email changed from admin@spacely.com to admin@example.com')
    console.log('   • This bypasses Supabase email validation restrictions')
    console.log('   • You can change this later in your admin panel')
    console.log('   • Remember to update your login validation to allow this email')
    
    return true
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    return false
  }
}

async function updateValidationSchema() {
  console.log('\n⚙️ VALIDATION UPDATE NEEDED')
  console.log('============================')
  console.log('\nYou need to update your login validation to allow admin@example.com:')
  console.log('\nIn lib/validations.ts, update the userLoginSchema email validation:')
  console.log(`
.refine((email) => {
  // Allow admin emails to bypass the domain restriction
  if (email === 'admin@dwelly.com' || email === 'admin@spacely.com' || email === 'admin@example.com') {
    return true
  }
  return email.endsWith('@mcm.edu.ph')
}, {
  message: 'Please use your Mapua Malayan Colleges Mindanao email address (@mcm.edu.ph)'
})`)
}

async function main() {
  const success = await createRealAdminAuth()
  
  if (success) {
    await updateValidationSchema()
    console.log('\n✅ Real admin setup complete!')
    console.log('\nNext: Update your validation and test login!')
  } else {
    console.log('\n❌ Setup failed. Try the alternative options below.')
  }
}

main() 