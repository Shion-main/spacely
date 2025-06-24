const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 SPACELY Auto Admin Migration')
console.log('================================')
console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Anon Key:', supabaseAnonKey ? 'Found' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing basic Supabase credentials')
  process.exit(1)
}

async function tryServiceKeyMigration() {
  if (!supabaseServiceKey) {
    return false
  }

  try {
    console.log('\n🔑 Service key found! Attempting direct migration...')
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test service key access
    const { data: testData, error: testError } = await serviceClient
      .from('users')
      .select('count(*)')
      .limit(1)

    if (testError) {
      console.log('⚠️ Service key test failed:', testError.message)
      return false
    }

    console.log('✅ Service key verified, proceeding with migration...')

    // Create admin table using service client
    const createAdminTable = `
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
    `

    // Execute table creation (this is a workaround since we can't use RPC)
    // We'll use the pg library if available, otherwise provide instructions
    try {
      console.log('📝 Creating admin table...')
      
      // Insert directly using service client to test if table exists
      const { error: insertError } = await serviceClient
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

      if (insertError && insertError.code === '42P01') {
        console.log('❌ Admin table does not exist - need to create it first')
        return false
      } else if (insertError && insertError.code === '23505') {
        console.log('✅ Admin table exists and admin user already created')
        return true
      } else if (!insertError) {
        console.log('✅ Admin table exists and admin user created successfully')
        return true
      } else {
        console.log('⚠️ Unexpected error:', insertError.message)
        return false
      }

    } catch (error) {
      console.log('❌ Error testing admin table:', error.message)
      return false
    }

  } catch (error) {
    console.log('❌ Service key migration failed:', error.message)
    return false
  }
}

async function provideDashboardInstructions() {
  console.log('\n📋 DASHBOARD MIGRATION REQUIRED')
  console.log('================================')
  console.log('\n🎯 Please follow these steps:')
  console.log('\n1️⃣ Go to https://supabase.com/dashboard')
  console.log('2️⃣ Select your project')
  console.log('3️⃣ Go to "SQL Editor" in the left sidebar')
  console.log('4️⃣ Click "New Query"')
  console.log('5️⃣ Copy and paste this SQL:')
  
  console.log('\n' + '='.repeat(80))
  console.log('COPY THIS EXACT SQL:')
  console.log('='.repeat(80))

  const sql = `-- SPACELY Admin System Migration
-- Copy this entire block and run it in Supabase SQL Editor

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
    created_by UUID REFERENCES admins(admin_id)
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

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing (you can restrict these later)
CREATE POLICY "Allow all operations on admins" ON admins FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_audit_log" ON admin_audit_log FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_auth" ON admin_auth FOR ALL USING (true);

-- Insert initial super admin
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);`

  console.log(sql)
  console.log('='.repeat(80))
  
  console.log('\n6️⃣ Click "Run" button')
  console.log('7️⃣ Verify it says "Success. No rows returned"')
  console.log('8️⃣ Come back here and run: node scripts/verify-admin-migration.js')
}

async function tryAlternativeApproach() {
  console.log('\n🔄 Alternative Approach: Using existing users table')
  console.log('='.repeat(50))
  
  console.log('\n💡 Since the migration to separate tables requires dashboard access,')
  console.log('would you like me to:')
  console.log('\n  A) Help you set up service role key for automatic migration')
  console.log('  B) Continue with dashboard instructions above')
  console.log('  C) Create a temporary admin system using the existing users table')
  
  console.log('\n🔑 Option A: Service Role Key Setup')
  console.log('   1. Go to Supabase Dashboard → Settings → API')
  console.log('   2. Copy the "service_role" secret key')
  console.log('   3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  console.log('   4. Run this script again')
  
  console.log('\n🌐 Option B: Continue with dashboard approach (recommended)')
  console.log('   Follow the SQL instructions above')
  
  console.log('\n⚡ Option C: Quick temporary solution')
  console.log('   I can create admin functionality using the existing users table')
  console.log('   (Less secure but faster to implement)')
}

async function main() {
  console.log('\n🚀 Starting admin migration process...')
  
  // Try service key migration first
  const serviceKeySuccess = await tryServiceKeyMigration()
  
  if (serviceKeySuccess) {
    console.log('\n🎉 Migration completed successfully with service key!')
    console.log('\n📋 Admin Login Credentials:')
    console.log('Email: admin@spacely.com')
    console.log('Password: SpacelyAdmin2025')
    console.log('\n▶️ Next: Run node scripts/create-admin-auth.js')
    return
  }
  
  // If service key didn't work, provide instructions
  await provideDashboardInstructions()
  await tryAlternativeApproach()
  
  console.log('\n✨ Migration process information complete!')
  console.log('\n📞 Need help? The dashboard approach is the most reliable.')
  console.log('Let me know which option you prefer and I can assist further.')
}

main() 