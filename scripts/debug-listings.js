const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugListings() {
  try {
    console.log('🔍 Checking all listings in database...\n')

    // Get all posts regardless of status
    const { data: allPosts, error } = await supabase
      .from('posts')
      .select(`
        post_id,
        title,
        approval_status,
        archived,
        is_deleted,
        created_at,
        users!posts_user_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return
    }

    if (!allPosts || allPosts.length === 0) {
      console.log('❌ No listings found in database')
      return
    }

    console.log(`📊 Found ${allPosts.length} total listings:\n`)

    // Group by status
    const statusGroups = {
      pending: [],
      approved: [],
      rejected: [],
      archived: [],
      deleted: []
    }

    allPosts.forEach(post => {
      if (post.is_deleted) {
        statusGroups.deleted.push(post)
      } else if (post.archived) {
        statusGroups.archived.push(post)
      } else {
        statusGroups[post.approval_status]?.push(post)
      }
    })

    // Display results
    Object.entries(statusGroups).forEach(([status, posts]) => {
      if (posts.length > 0) {
        console.log(`\n${status.toUpperCase()} (${posts.length}):`)
        posts.forEach(post => {
          console.log(`  • ${post.title}`)
          console.log(`    ID: ${post.post_id}`)
          console.log(`    Author: ${post.users?.full_name || 'Unknown'} (${post.users?.email || 'Unknown'})`)
          console.log(`    Created: ${new Date(post.created_at).toLocaleString()}`)
          console.log('')
        })
      }
    })

    // Show what would appear on main listings page
    const visibleListings = allPosts.filter(post => 
      post.approval_status === 'approved' && 
      !post.archived && 
      !post.is_deleted
    )

    console.log(`\n✨ Listings visible on main page: ${visibleListings.length}`)
    
    if (visibleListings.length === 0) {
      console.log('💡 This explains why the main listings page appears empty!')
      
      const pendingCount = statusGroups.pending.length
      if (pendingCount > 0) {
        console.log(`\n🔄 You have ${pendingCount} pending listing(s) that need admin approval.`)
        console.log('   Go to /admin/dashboard to approve them.')
      }
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

debugListings() 