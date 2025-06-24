const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🛠️  SPACELY Manual Admin Setup')
console.log('==============================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupAdminSystem() {
  try {
    console.log('\n📋 Manual Admin System Setup Instructions')
    console.log('==========================================')
    
    console.log('\n🎯 Since direct SQL execution requires service role key,')
    console.log('please follow these steps in your Supabase dashboard:')
    
    console.log('\n1️⃣  Go to your Supabase project dashboard')
    console.log('2️⃣  Navigate to "SQL Editor"')
    console.log('3️⃣  Copy and paste the following SQL:')
    
    console.log('\n' + '='.repeat(60))
    console.log('COPY THIS SQL TO SUPABASE SQL EDITOR:')
    console.log('='.repeat(60))
    
    const adminTableSQL = `
-- Create admin table
CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    employee_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    department TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admins(admin_id),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin authentication table
CREATE TABLE IF NOT EXISTS admin_auth (
    auth_id UUID PRIMARY KEY,
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you can customize these)
CREATE POLICY "Enable all operations for authenticated users" ON admins FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON admin_audit_log FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON admin_auth FOR ALL USING (true);

-- Insert the initial super admin
INSERT INTO admins (
    admin_id,
    email,
    full_name,
    employee_id,
    role,
    department,
    permissions,
    is_active
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'admin@spacely.com',
    'System Administrator',
    'SPACELY001',
    'super_admin',
    'IT Operations',
    '{"full_access": true, "can_create_admins": true, "can_manage_users": true, "can_approve_listings": true, "can_view_reports": true, "can_manage_system": true}'::jsonb,
    true
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at);
`;
    
    console.log(adminTableSQL)
    console.log('='.repeat(60))
    
    console.log('\n4️⃣  Click "Run" to execute the SQL')
    console.log('5️⃣  Return here and run: node scripts/create-admin-auth.js')
    
    console.log('\n💡 Why we need this approach:')
    console.log('  • Creating tables requires elevated permissions')
    console.log('  • The anon key cannot execute DDL statements')
    console.log('  • This ensures proper security and permissions')
    
    console.log('\n✅ Benefits of the new admin system:')
    console.log('  🔐 Completely separate from regular users')
    console.log('  👥 Role-based access (admin/super_admin)')
    console.log('  📊 Built-in audit logging')
    console.log('  🛡️  Row Level Security policies')
    console.log('  ⚙️  JSON-based permissions system')
    console.log('  🔍 Employee ID tracking')
    console.log('  📈 Performance optimized with indexes')
    
  } catch (error) {
    console.error('❌ Setup error:', error)
  }
}

async function setupAdminUser() {
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Setting up admin user...')

  try {
    // First, check if admin user exists in users table
    const { data: existingUser, error: checkError } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', 'admin@spacely.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing user:', checkError)
      return
    }

    if (existingUser) {
      console.log('Admin user already exists in database')
      
      // Update to super_admin role if not already
      if (existingUser.role !== 'super_admin') {
        const { error: updateError } = await serviceClient
          .from('users')
          .update({ role: 'super_admin' })
          .eq('email', 'admin@spacely.com')

        if (updateError) {
          console.error('Error updating user role:', updateError)
          return
        }

        console.log('✅ Updated existing user to super_admin role')
      } else {
        console.log('✅ User already has super_admin role')
      }
    } else {
      console.log('❌ No admin user found in database.')
      console.log('\nPlease follow these steps:')
      console.log('1. Go to your SPACELY registration page')
      console.log('2. Register with email: admin@spacely.com')
      console.log('3. Use any valid MCM student details for registration')
      console.log('4. After registration, run this script again to upgrade to admin')
      return
    }

    // Check if user exists in Supabase Auth
    const { data: authUsers, error: listError } = await serviceClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing auth users:', listError)
      return
    }

    const authUser = authUsers.users.find(user => user.email === 'admin@spacely.com')
    
    if (authUser) {
      console.log('✅ Admin user exists in Supabase Auth:', authUser.id)
      
      // Update metadata to reflect admin status
      const { error: metadataError } = await serviceClient.auth.admin.updateUserById(
        authUser.id,
        {
          user_metadata: {
            role: 'super_admin',
            name: 'SPACELY Admin'
          }
        }
      )

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError)
      } else {
        console.log('✅ Updated auth user metadata')
      }

      console.log('\n🎉 Admin setup complete!')
      console.log('You can now log in using the Admin toggle with:')
      console.log('Email: admin@spacely.com')
      console.log('Password: [the password you used during registration]')
    } else {
      console.log('❌ Admin user not found in Supabase Auth')
      console.log('Please register the admin@spacely.com user first through the registration form')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

async function main() {
  await setupAdminSystem()
  console.log('\n🎯 Next Steps After Running the SQL:')
  console.log('  1. Run: node scripts/create-admin-auth.js')
  console.log('  2. Update admin authentication in your app')
  console.log('  3. Test the new admin login system')
  console.log('\n✨ Setup instructions complete!')
}

main() 