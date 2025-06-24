-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow registration" ON users;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (
      SELECT 1 FROM admins 
      WHERE admin_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
  ) WITH CHECK (
    auth.uid()::text = user_id::text
  );

-- Critical: Allow new user registration
CREATE POLICY "Allow registration" ON users
  FOR INSERT WITH CHECK (
    -- Allow insert when user_id matches the authenticated user
    -- OR when there is no authenticated user (during registration)
    auth.uid()::text = user_id::text 
    OR auth.uid() IS NULL
  );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to create their own posts" ON posts;
DROP POLICY IF EXISTS "Allow users to update their own posts" ON posts;
DROP POLICY IF EXISTS "Allow users to delete their own posts" ON posts;
DROP POLICY IF EXISTS "Allow public to view approved posts" ON posts;
DROP POLICY IF EXISTS "Allow admins to manage all posts" ON posts;

-- Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts table
CREATE POLICY "Allow users to create their own posts" ON posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IS NULL -- Allow server-side operations
  );

CREATE POLICY "Allow users to update their own posts" ON posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own posts" ON posts
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Allow public to view approved posts" ON posts
  FOR SELECT
  USING (
    approval_status = 'approved' OR -- Anyone can view approved posts
    auth.uid() = user_id OR -- Users can view their own posts
    EXISTS ( -- Admins can view all posts
      SELECT 1 
      FROM users 
      WHERE users.user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add specific policy for admin operations
CREATE POLICY "Allow admins to manage all posts" ON posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.user_id = auth.uid() 
      AND users.role = 'admin'
    )
  ); 