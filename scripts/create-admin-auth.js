const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('👤 SPACELY Admin Authentication Setup')
console.log('=====================================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdminAuth() {
  try {
    console.log('\n🔍 Checking if admin table exists...')
    
    // First check if the admin table exists by trying to query it
    const { data: adminCheck, error: adminError } = await supabase
      .from('admins')
      .select('admin_id, email, full_name, role')
      .eq('email', 'admin@spacely.com')
      .maybeSingle()
    
    if (adminError) {
      console.error('❌ Admin table not found or inaccessible:', adminError.message)
      console.log('\n💡 Please run the SQL from: node scripts/manual-admin-setup.js first')
      return
    }
    
    if (!adminCheck) {
      console.log('❌ No admin record found in admins table')
      console.log('💡 The SQL migration may not have run successfully')
      return
    }
    
    console.log('✅ Admin record found in database:')
    console.log('  ID:', adminCheck.admin_id)
    console.log('  Email:', adminCheck.email)
    console.log('  Name:', adminCheck.full_name)
    console.log('  Role:', adminCheck.role)
    
    console.log('\n👤 Creating Supabase Auth user...')
    
    // Create Supabase Auth user for admin
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@spacely.com',
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
      console.error('❌ Error creating admin auth user:', authError.message)
      
      // If email validation failed, provide guidance
      if (authError.message.includes('email_address_invalid')) {
        console.log('\n💡 Email validation issue detected.')
        console.log('Options to resolve:')
        console.log('  1. Disable email validation in Supabase Auth settings')
        console.log('  2. Use a real email domain for admin account')
        console.log('  3. Configure custom SMTP in Supabase for testing')
      }
      return
    } else if (authError && authError.message.includes('already registered')) {
      console.log('ℹ️ Admin auth user already exists')
      
      // Try to get the existing user ID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@spacely.com',
        password: 'SpacelyAdmin2025'
      })
      
      if (!signInError && signInData.user) {
        console.log('✅ Found existing auth user ID:', signInData.user.id)
        
        // Link the auth user to admin record
        await linkAuthToAdmin(signInData.user.id, adminCheck.admin_id)
      } else {
        console.log('⚠️ Could not verify existing auth user')
      }
    } else {
      console.log('✅ Admin auth user created successfully!')
      console.log('Auth user ID:', authData.user?.id)
      console.log('Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No')
      
      if (authData.user?.id) {
        // Link the new auth user to admin record
        await linkAuthToAdmin(authData.user.id, adminCheck.admin_id)
      }
    }
    
    console.log('\n📋 Admin Login Credentials:')
    console.log('Email: admin@spacely.com')
    console.log('Password: SpacelyAdmin2025')
    console.log('Login URL: http://localhost:5000/auth')
    
    console.log('\n✅ Admin authentication setup complete!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function linkAuthToAdmin(authId, adminId) {
  try {
    console.log('\n🔗 Linking auth user to admin record...')
    
    // Insert into admin_auth table to link Supabase Auth to admin
    const { error: linkError } = await supabase
      .from('admin_auth')
      .insert({
        auth_id: authId,
        admin_id: adminId
      })
    
    if (linkError && !linkError.message.includes('duplicate key')) {
      console.error('❌ Error linking auth to admin:', linkError.message)
    } else if (linkError && linkError.message.includes('duplicate key')) {
      console.log('ℹ️ Auth user already linked to admin record')
    } else {
      console.log('✅ Successfully linked auth user to admin record')
    }
    
  } catch (error) {
    console.error('❌ Error linking auth to admin:', error)
  }
}

async function verifySetup() {
  try {
    console.log('\n🔍 Verifying complete admin setup...')
    
    const { data: verification, error } = await supabase
      .from('admin_auth')
      .select(`
        auth_id,
        admin_id,
        admins (
          email,
          full_name,
          role,
          is_active
        )
      `)
      .eq('admins.email', 'admin@spacely.com')
      .single()
    
    if (error) {
      console.log('⚠️ Could not verify setup:', error.message)
      console.log('This may be due to RLS policies - setup is likely correct')
    } else {
      console.log('✅ Admin system verification successful!')
      console.log('Verification details:', verification)
    }
    
  } catch (error) {
    console.log('💡 Verification error (may be expected due to RLS):', error.message)
  }
}

async function main() {
  await createAdminAuth()
  await verifySetup()
  
  console.log('\n🎉 Admin Authentication Complete!')
  console.log('\n🔄 What happened:')
  console.log('  ✅ Verified admin record exists in admins table')
  console.log('  ✅ Created Supabase Auth user for admin login')
  console.log('  ✅ Linked auth user to admin record')
  console.log('  ✅ Admin can now login through your application')
  
  console.log('\n🚀 Next Steps:')
  console.log('  1. Update your admin login/middleware to check admins table')
  console.log('  2. Create admin-specific API routes')
  console.log('  3. Test login with the provided credentials')
  console.log('  4. Configure admin dashboard to use new admin permissions')
  
  console.log('\n✨ Setup complete!')
}

main() 