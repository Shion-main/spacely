const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('Please make sure you have .env.local file with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Checking database connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('posts').select('count').single()
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️  Posts table does not exist. Please run the schema.sql in your Supabase dashboard.')
      console.log('1. Go to https://app.supabase.com/project/your-project/sql')
      console.log('2. Copy and paste the content of supabase/schema.sql')
      console.log('3. Click RUN to execute the schema')
      return false
    }
    
    if (error) {
      console.error('❌ Database error:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    return false
  }
}

async function checkTables() {
  console.log('\n📊 Checking required tables...')
  
  const tables = [
    'departments',
    'courses', 
    'room_types',
    'users',
    'posts',
    'rooms',
    'post_amenities'
  ]
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`)
      } else {
        console.log(`✅ Table '${table}': OK`)
      }
    } catch (err) {
      console.log(`❌ Table '${table}': ${err.message}`)
    }
  }
}

async function checkSampleData() {
  console.log('\n📋 Checking sample data...')
  
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('post_id, title, approval_status')
      .limit(5)
    
    if (error) {
      console.log('❌ Cannot fetch posts:', error.message)
      return
    }
    
    console.log(`📝 Found ${posts.length} posts:`)
    posts.forEach(post => {
      console.log(`  - ${post.title} (${post.approval_status})`)
    })
    
    const approvedPosts = posts.filter(p => p.approval_status === 'approved')
    console.log(`✅ ${approvedPosts.length} approved posts ready to display`)
    
  } catch (err) {
    console.log('❌ Error checking sample data:', err.message)
  }
}

async function main() {
  console.log('🚀 DWELLY Database Setup Check\n')
  
  const isConnected = await checkDatabase()
  
  if (isConnected) {
    await checkTables()
    await checkSampleData()
    
    console.log('\n🎉 Database check complete!')
    console.log('If everything looks good, your app should now show listings.')
  }
}

main().catch(console.error) 