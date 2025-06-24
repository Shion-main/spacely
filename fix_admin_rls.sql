-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON admins;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON admin_audit_log;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON admin_auth;
DROP POLICY IF EXISTS "Allow public read for admin login" ON admins;
DROP POLICY IF EXISTS "Allow public update for admin login" ON admins;
DROP POLICY IF EXISTS "Allow public insert for audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Allow admin view for audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Allow public operations for admin auth" ON admin_auth;

-- Temporarily disable RLS to avoid recursion during login
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_auth DISABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE admin_id = user_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simpler policies that don't cause recursion
CREATE POLICY "Allow public select for admin login" ON admins
  FOR SELECT USING (true);

CREATE POLICY "Allow admin update own record" ON admins
  FOR UPDATE USING (auth.uid()::text = admin_id::text)
  WITH CHECK (auth.uid()::text = admin_id::text);

-- Audit log policies
CREATE POLICY "Allow insert for audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for audit logs" ON admin_audit_log
  FOR SELECT USING (true);

-- Admin auth policies
CREATE POLICY "Allow all for admin auth" ON admin_auth
  FOR ALL USING (true); 