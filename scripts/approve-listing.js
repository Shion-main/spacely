const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function approveListing() {
  try {
    const listingId = process.argv[2] || '07490865-a403-4d60-914c-b6af8eb88305'
    
    console.log(`Approving listing: ${listingId}...`)

    // Update the listing to approved status
    const { data, error } = await supabase
      .from('posts')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('post_id', listingId)
      .select()

    if (error) {
      console.error('Error approving listing:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully approved listing:', data[0].title)
      console.log('🎉 Your listing should now appear on the main page!')
    } else {
      console.log('❌ No listing found with that ID')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

approveListing() 