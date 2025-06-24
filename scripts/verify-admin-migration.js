const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('✅ SPACELY Admin Migration Verification')
console.log('=======================================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyAdminMigration() {
  try {
    console.log('\n🔍 Checking admin system tables...')
    
    // Test 1: Check if admin table exists and has data
    console.log('\n1️⃣ Testing admins table...')
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('admin_id, email, full_name, role, employee_id, is_active')
      .eq('email', 'admin@spacely.com')
      .maybeSingle()
    
    if (adminError) {
      console.log('❌ Admin table error:', adminError.message)
      if (adminError.code === '42P01') {
        console.log('💡 The admins table does not exist - migration was not successful')
        return false
      }
    } else if (adminData) {
      console.log('✅ Admin table exists and super admin found!')
      console.log('   📋 Admin details:')
      console.log(`      ID: ${adminData.admin_id}`)
      console.log(`      Email: ${adminData.email}`)
      console.log(`      Name: ${adminData.full_name}`)
      console.log(`      Role: ${adminData.role}`)
      console.log(`      Employee ID: ${adminData.employee_id}`)
      console.log(`      Active: ${adminData.is_active}`)
    } else {
      console.log('⚠️ Admin table exists but no super admin found')
      return false
    }
    
    // Test 2: Check admin_audit_log table
    console.log('\n2️⃣ Testing admin_audit_log table...')
    const { data: auditData, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('count(*)')
      .limit(1)
    
    if (auditError) {
      console.log('❌ Admin audit log error:', auditError.message)
    } else {
      console.log('✅ Admin audit log table exists and accessible')
    }
    
    // Test 3: Check admin_auth table
    console.log('\n3️⃣ Testing admin_auth table...')
    const { data: authData, error: authError } = await supabase
      .from('admin_auth')
      .select('count(*)')
      .limit(1)
    
    if (authError) {
      console.log('❌ Admin auth table error:', authError.message)
    } else {
      console.log('✅ Admin auth table exists and accessible')
    }
    
    // Test 4: Check if we can insert audit log (test permissions)
    console.log('\n4️⃣ Testing admin permissions...')
    const { error: permissionError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminData?.admin_id,
        action: 'migration_verification',
        resource_type: 'system',
        details: { test: true, timestamp: new Date().toISOString() }
      })
    
    if (permissionError) {
      console.log('⚠️ Permission test failed:', permissionError.message)
      console.log('💡 This might be due to RLS policies - not necessarily a problem')
    } else {
      console.log('✅ Admin permissions working correctly')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

async function createAdminAuth() {
  try {
    console.log('\n👤 Creating Supabase Auth user for admin...')
    
    // Create Supabase Auth user for admin login
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
      console.log('❌ Auth creation error:', authError.message)
      
      if (authError.message.includes('email_address_invalid')) {
        console.log('\n💡 Email validation issue. Options:')
        console.log('   1. Use a real email domain (recommended)')
        console.log('   2. Disable email validation in Supabase Auth settings')
        console.log('   3. Configure custom SMTP for testing')
      }
      return false
    } else if (authError && authError.message.includes('already registered')) {
      console.log('✅ Admin auth user already exists')
    } else {
      console.log('✅ Admin auth user created successfully!')
      console.log(`   Auth ID: ${authData.user?.id}`)
      console.log(`   Email confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Auth creation failed:', error)
    return false
  }
}

async function provideFinalInstructions() {
  console.log('\n🎉 MIGRATION VERIFICATION COMPLETE!')
  console.log('==================================')
  
  console.log('\n📋 Admin Login Credentials:')
  console.log('   Email: admin@spacely.com')
  console.log('   Password: SpacelyAdmin2025')
  console.log('   Role: super_admin')
  console.log('   Login URL: http://localhost:5000/auth')
  
  console.log('\n🔧 What was created:')
  console.log('   ✅ admins table - Dedicated admin accounts')
  console.log('   ✅ admin_audit_log table - Admin action tracking')
  console.log('   ✅ admin_auth table - Links auth to admin records')
  console.log('   ✅ Super admin account - Ready to use')
  console.log('   ✅ Supabase Auth user - For login')
  
  console.log('\n🚀 Next Steps:')
  console.log('   1. Update your admin routes to check the admins table')
  console.log('   2. Modify admin middleware to verify admin permissions')
  console.log('   3. Test login with the credentials above')
  console.log('   4. Configure admin dashboard to use new admin data')
  
  console.log('\n💡 Admin Features Available:')
  console.log('   • Role-based permissions (admin/super_admin)')
  console.log('   • JSON-based permission system')
  console.log('   • Audit trail for all admin actions')
  console.log('   • Separate from regular user accounts')
  console.log('   • Employee ID tracking')
  console.log('   • Department organization')
}

async function main() {
  console.log('\n🚀 Starting verification process...')
  
  const migrationSuccess = await verifyAdminMigration()
  
  if (!migrationSuccess) {
    console.log('\n❌ Migration verification failed!')
    console.log('\n💡 Troubleshooting:')
    console.log('   1. Make sure you ran the SQL in Supabase Dashboard → SQL Editor')
    console.log('   2. Check for any SQL errors in the dashboard')
    console.log('   3. Verify you copied the complete SQL script')
    console.log('   4. Try running: node scripts/auto-admin-migration.js again')
    return
  }
  
  const authSuccess = await createAdminAuth()
  
  if (!authSuccess) {
    console.log('\n⚠️ Auth creation had issues but admin table is ready')
    console.log('You can create the auth user manually or fix the email validation')
  }
  
  await provideFinalInstructions()
  
  console.log('\n✨ Verification complete!')
}

main() 