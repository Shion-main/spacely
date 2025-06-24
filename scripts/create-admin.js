const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Supabase Key:', serviceKey ? `Found (${serviceKey.substring(0, 20)}...)` : 'Missing')

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or Service Role Key is missing.')
  process.exit(1)
}

// For RLS bypass, we need to use the anon key but with direct SQL
console.log('ℹ️ Using anon key - will use RPC to bypass RLS restrictions')

// Create client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const adminEmail = 'admin@spacely.com'
const adminPassword = 'SpacelyAdmin2025' // Use a strong, generated password
const adminFullName = 'System Administrator'

async function provisionAdmin() {
  try {
    console.log('Starting admin user provisioning...')
    
    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    let adminUser = users.find(u => u.email === adminEmail)

    if (!adminUser) {
      // 2. Create user if they don't exist
      console.log('Admin user not found in auth.users, creating...')
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Auto-confirm the email
      })

      if (error) {
        console.error('Error creating admin user:', error)
        return
      }
      adminUser = data.user
      console.log('Admin user created successfully in auth.users.')
    } else {
      console.log('Admin user already exists in auth.users.')
      
      // Optionally update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: adminPassword }
      )
      
      if (updateError) {
        console.error('Error updating admin password:', updateError)
      } else {
        console.log('Admin password updated successfully.')
      }
    }

    if (!adminUser) {
      console.error('Could not find or create admin user.')
      return
    }

    // 3. Insert or update the public.users profile
    const { data: profile, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          user_id: adminUser.id,
          email: adminEmail,
          full_name: adminFullName,
          role: 'super_admin',
          // Add required fields based on your schema
          id_number: '0000000000', 
          phone_number: '+630000000000'
        },
        { onConflict: 'user_id' }
      )
      .select()

    if (upsertError) {
      console.error('Error creating/updating admin profile:', upsertError)
      return
    }

    console.log('✅ Admin user profile provisioned successfully!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Password:', adminPassword)
    console.log('👤 Role:', 'super_admin')
    console.log('')
    console.log('You can now login at: http://localhost:5000/auth')
    console.log('Use the "Admin" toggle and login with the above credentials.')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Also check for the old dwelly admin and update it if needed
async function migrateOldAdmin() {
  try {
    console.log('\nChecking for old admin account...')
    
    // Check if old admin exists
    const { data: oldAdmin, error: oldError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@dwelly.com')
      .single()

    if (oldAdmin && !oldError) {
      console.log('📦 Found old admin account, updating to SPACELY...')
      
      // Update the old admin to the new SPACELY email
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('users')
        .update({ 
          email: 'admin@spacely.com',
          full_name: 'System Administrator'
        })
        .eq('email', 'admin@dwelly.com')
        .select()

      if (updateError) {
        console.error('❌ Error updating old admin:', updateError)
      } else {
        console.log('✅ Successfully migrated old admin to SPACELY!')
        console.log('Updated admin:', updatedAdmin[0])
      }
    } else {
      console.log('ℹ️ No old admin account found to migrate')
    }
  } catch (error) {
    console.error('❌ Error checking old admin:', error)
  }
}

async function main() {
  console.log('🚀 SPACELY Admin Account Setup')
  console.log('================================')
  
  await migrateOldAdmin()
  await provisionAdmin()
  
  console.log('\n✨ Admin setup complete!')
}

main() 