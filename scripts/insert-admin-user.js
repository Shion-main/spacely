const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('👤 SPACELY Admin User Insert')
console.log('============================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function insertAdminUser() {
  try {
    console.log('\n🔍 Checking if admin user already exists...')
    
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', 'admin@spacely.com')
      .single()
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!')
      console.log(`   ID: ${existingAdmin.admin_id}`)
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Role: ${existingAdmin.role}`)
      return true
    }
    
    console.log('📝 Inserting admin user...')
    
    const { data: insertData, error: insertError } = await supabase
      .from('admins')
      .insert({
        admin_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        email: 'admin@spacely.com',
        full_name: 'System Administrator',
        employee_id: 'SPACELY001',
        role: 'super_admin',
        department: 'IT Operations',
        permissions: {
          full_access: true,
          can_create_admins: true,
          can_manage_users: true,
          can_approve_listings: true,
          can_view_reports: true,
          can_manage_system: true
        },
        is_active: true
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error inserting admin user:', insertError.message)
      
      if (insertError.message.includes('duplicate key')) {
        console.log('💡 Admin user already exists (duplicate key)')
        return true
      }
      
      if (insertError.message.includes('policy')) {
        console.log('💡 RLS policy issue - admin may still be created')
        console.log('   Try running: node scripts/verify-admin-migration.js')
      }
      
      return false
    }
    
    console.log('✅ Admin user inserted successfully!')
    console.log(`   ID: ${insertData.admin_id}`)
    console.log(`   Email: ${insertData.email}`)
    console.log(`   Role: ${insertData.role}`)
    
    console.log('\n🎉 ADMIN USER READY!')
    console.log('===================')
    console.log('\n📋 Admin Credentials:')
    console.log('   📧 Email: admin@spacely.com')
    console.log('   🔐 Password: SpacelyAdmin2025')
    console.log('   🌐 Login: http://localhost:5000/auth')
    
    console.log('\n📝 Next Steps:')
    console.log('1. Disable email confirmation in Supabase Auth settings')
    console.log('2. Run: node scripts/create-admin-auth.js')
    console.log('3. Update lib/validations.ts to allow admin@spacely.com')
    
    return true
    
  } catch (error) {
    console.error('❌ Failed to insert admin user:', error)
    return false
  }
}

async function main() {
  const success = await insertAdminUser()
  
  if (success) {
    console.log('\n✅ Admin user setup complete!')
  } else {
    console.log('\n❌ Admin user setup failed.')
    console.log('   Try running the SQL in dashboard manually.')
  }
}

main() 