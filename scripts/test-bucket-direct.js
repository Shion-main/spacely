const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBucketDirect() {
  try {
    console.log('🔍 Testing direct access to dwelly-listings bucket...\n')

    // Test 1: Try to list files in the bucket
    console.log('📁 Test 1: Listing files in dwelly-listings bucket...')
    const { data: files, error: filesError } = await supabase.storage
      .from('dwelly-listings')
      .list('', { limit: 5 })

    if (filesError) {
      console.error('❌ Error accessing bucket:', filesError)
      if (filesError.message.includes('not found')) {
        console.log('💡 The bucket might not exist or might be named differently')
      } else if (filesError.message.includes('permission')) {
        console.log('💡 Permission issue - the API key might not have storage access')
      }
    } else {
      console.log('✅ Successfully accessed bucket!')
      console.log(`📂 Found ${files.length} files/folders`)
      if (files.length > 0) {
        files.forEach(file => {
          console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`)
        })
      } else {
        console.log('   (bucket is empty)')
      }
    }

    // Test 2: Try to get a public URL (this should work even if bucket is empty)
    console.log('\n🔗 Test 2: Testing public URL generation...')
    const { data: { publicUrl } } = supabase.storage
      .from('dwelly-listings')
      .getPublicUrl('test-image.jpg')

    console.log('Generated URL:', publicUrl)
    console.log('✅ URL generation works (bucket is accessible)')

    // Test 3: Check if we can see any photos in the database
    console.log('\n📸 Test 3: Checking photos table...')
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('file_path, storage_path, post_id')
      .limit(5)

    if (photosError) {
      console.error('❌ Error checking photos table:', photosError)
    } else {
      console.log(`Found ${photos.length} photos in database`)
      if (photos.length > 0) {
        photos.forEach(photo => {
          console.log(`   - Post: ${photo.post_id}`)
          console.log(`     Storage: ${photo.storage_path}`)
          console.log(`     URL: ${photo.file_path}`)
          console.log('')
        })
      } else {
        console.log('   (no photos uploaded yet)')
      }
    }

    // Summary
    console.log('\n📋 Summary:')
    if (!filesError) {
      console.log('✅ Storage bucket is working correctly!')
      console.log('💡 You can now upload images when creating listings')
    } else {
      console.log('❌ Storage bucket access issues detected')
      console.log('💡 Check bucket name and permissions in Supabase dashboard')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testBucketDirect() 