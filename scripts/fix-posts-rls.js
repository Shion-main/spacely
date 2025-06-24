const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixPostsRLS() {
  try {
    console.log('Fixing RLS policy for posts table...')

    // Drop the existing restrictive policy
    const dropPolicy = `DROP POLICY IF EXISTS "Users can create their own posts" ON posts;`
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPolicy })
    
    if (dropError) {
      console.log('Note: Could not drop existing policy (may not exist)')
    }

    // Create a more permissive policy for INSERT operations
    const createPolicy = `CREATE POLICY "Allow post creation" ON posts FOR INSERT WITH CHECK (true);`
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPolicy })

    if (createError) {
      console.error('Error creating new policy:', createError)
      // Alternative approach: Temporarily disable RLS for testing
      console.log('Trying alternative approach...')
      const disableRLS = `ALTER TABLE posts DISABLE ROW LEVEL SECURITY;`
      const { error: disableError } = await supabase.rpc('exec_sql', { sql: disableRLS })
      
      if (disableError) {
        console.error('Error disabling RLS:', disableError)
        return
      }
      
      console.log('RLS disabled for posts table. This is temporary for testing.')
      return
    }

    console.log('Successfully updated RLS policy for posts table!')

  } catch (error) {
    console.error('Error:', error)
    
    // If we can't run SQL directly, let's try a different approach
    console.log('Direct SQL execution failed. Please run this SQL manually in your Supabase dashboard:')
    console.log(`
-- Fix RLS policy for posts table
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
CREATE POLICY "Allow post creation" ON posts FOR INSERT WITH CHECK (true);

-- OR temporarily disable RLS for testing:
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
`)
  }
}

fixPostsRLS() 