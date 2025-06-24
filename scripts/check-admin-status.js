const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 SPACELY Admin Status Check')
console.log('=============================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdminStatus() {
  try {
    console.log('\n1️⃣ Checking Admin Table...')
    
    // Check if admin table exists and has the admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('admin_id, email, full_name, role, employee_id, is_active')
      .eq('email', 'admin@spacely.com')
      .maybeSingle()
    
    if (adminError) {
      if (adminError.code === '42P01') {
        console.log('❌ Admin table does not exist')
        console.log('💡 You need to run the SQL migration first')
        return { adminTable: false, adminUser: false, authUser: false }
      } else {
        console.log('⚠️ Admin table error:', adminError.message)
      }
    } else if (adminData) {
      console.log('✅ Admin table exists with super admin!')
      console.log(`   📋 Admin: ${adminData.full_name} (${adminData.role})`)
      console.log(`   📧 Email: ${adminData.email}`)
      console.log(`   🆔 Employee ID: ${adminData.employee_id}`)
    } else {
      console.log('⚠️ Admin table exists but no admin user found')
      return { adminTable: true, adminUser: false, authUser: false }
    }
    
    console.log('\n2️⃣ Checking Supabase Auth User...')
    
    // Try to sign in to check if auth user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@spacely.com',
      password: 'SpacelyAdmin2025'
    })
    
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('❌ Auth user does not exist or password is wrong')
        console.log('💡 Need to create Supabase Auth user')
        return { adminTable: true, adminUser: true, authUser: false }
      } else if (signInError.message.includes('email_address_invalid')) {
        console.log('❌ Email validation blocking admin@spacely.com')
        console.log('💡 Need to fix email validation in Supabase')
        return { adminTable: true, adminUser: true, authUser: false }
      } else {
        console.log('⚠️ Auth error:', signInError.message)
        return { adminTable: true, adminUser: true, authUser: false }
      }
    } else if (signInData.user) {
      console.log('✅ Auth user exists and password works!')
      console.log(`   🆔 Auth ID: ${signInData.user.id}`)
      console.log(`   📧 Email: ${signInData.user.email}`)
      console.log(`   ✅ Confirmed: ${signInData.user.email_confirmed_at ? 'Yes' : 'No'}`)
      
      // Sign out immediately
      await supabase.auth.signOut()
      
      return { adminTable: true, adminUser: true, authUser: true }
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
    return { adminTable: false, adminUser: false, authUser: false }
  }
}

async function provideNextSteps(status) {
  console.log('\n📋 CURRENT STATUS SUMMARY')
  console.log('==========================')
  console.log(`Admin Table: ${status.adminTable ? '✅' : '❌'}`)
  console.log(`Admin User:  ${status.adminUser ? '✅' : '❌'}`)
  console.log(`Auth User:   ${status.authUser ? '✅' : '❌'}`)
  
  console.log('\n🎯 NEXT STEPS NEEDED:')
  
  if (!status.adminTable) {
    console.log('\n1️⃣ CREATE ADMIN TABLES')
    console.log('   Run the SQL migration in Supabase Dashboard:')
    console.log('   → Go to https://supabase.com/dashboard')
    console.log('   → SQL Editor → New Query')
    console.log('   → Copy SQL from: node scripts/auto-admin-migration.js')
    console.log('   → Click Run')
  }
  
  if (status.adminTable && !status.authUser) {
    console.log('\n2️⃣ CREATE AUTH USER')
    console.log('   Create the Supabase Auth user for login:')
    console.log('   → Run: node scripts/create-admin-auth.js')
    console.log('   → Or manually create in Supabase Auth dashboard')
  }
  
  if (status.adminTable && status.authUser) {
    console.log('\n🎉 ADMIN SYSTEM READY!')
    console.log('   You can now log in with:')
    console.log('   📧 Email: admin@spacely.com')
    console.log('   🔐 Password: SpacelyAdmin2025')
    console.log('   🌐 URL: http://localhost:5000/auth')
    
    console.log('\n🔧 Integration Steps:')
    console.log('   1. Update admin middleware to check admins table')
    console.log('   2. Modify admin routes to use new admin permissions')
    console.log('   3. Test login and admin functionality')
  }
}

async function main() {
  const status = await checkAdminStatus()
  await provideNextSteps(status)
  
  console.log('\n✨ Status check complete!')
}

main() 