const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorage() {
  try {
    console.log('🔍 Checking Supabase Storage configuration...\n')
    console.log('🔧 Using Supabase URL:', supabaseUrl)
    console.log('🔑 Using key type:', supabaseServiceKey.includes('service_role') ? 'Service Role' : 'Anon Key')

    // 1. Check if the 'dwelly-listings' bucket exists
    console.log('\n📁 Attempting to list buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      console.log('💡 This might mean:')
      console.log('   - The API key doesn\'t have storage permissions')
      console.log('   - The storage service is not enabled')
      console.log('   - Network connectivity issues')
      
      // Try to test storage with a direct file operation instead
      console.log('\n🔄 Trying alternative approach - testing file access...')
      const { data: testFiles, error: testError } = await supabase.storage
        .from('dwelly-listings')
        .list('', { limit: 1 })
      
      if (testError) {
        console.error('❌ Direct bucket access also failed:', testError)
        if (testError.message.includes('The resource was not found')) {
          console.log('💡 This confirms the "dwelly-listings" bucket doesn\'t exist')
        }
      } else {
        console.log('✅ Direct bucket access works! Bucket exists.')
        console.log(`📂 Files found: ${testFiles.length}`)
      }
      return
    }

    console.log('✅ Successfully listed buckets')
    console.log('📁 Available buckets:', buckets.map(b => `${b.name} (${b.public ? 'public' : 'private'})`))
    
    // Look for various possible bucket names
    const possibleNames = ['dwelly-listings', 'listings', 'dwelly', 'images']
    let foundBucket = null
    
    for (const name of possibleNames) {
      const bucket = buckets.find(b => b.name === name)
      if (bucket) {
        foundBucket = bucket
        console.log(`\n✅ Found bucket: "${name}"`)
        break
      }
    }
    
    if (!foundBucket) {
      console.log('\n❌ No suitable bucket found!')
      console.log('💡 Please create a bucket named "dwelly-listings" in your Supabase dashboard')
      console.log('   Or let me know which bucket you want to use from the list above')
      return
    }

    console.log('   - Public:', foundBucket.public)
    console.log('   - ID:', foundBucket.id)
    console.log('   - Created:', foundBucket.created_at)

    // 2. Check existing files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(foundBucket.name)
      .list('', { limit: 10 })

    if (filesError) {
      console.error('❌ Error listing files:', filesError)
      return
    }

    console.log(`\n📂 Files in listings bucket: ${files.length}`)
    if (files.length > 0) {
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`)
      })
    }

    // 3. Check if we can access public URLs
    if (files.length > 0) {
      const testFile = files[0]
      const { data: { publicUrl } } = supabase.storage
        .from(foundBucket.name)
        .getPublicUrl(testFile.name)
      
      console.log(`\n🔗 Test public URL: ${publicUrl}`)
      
      // Try to fetch the URL to see if it's accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' })
        console.log(`✅ Public URL accessible (status: ${response.status})`)
      } catch (fetchError) {
        console.log(`❌ Public URL not accessible:`, fetchError.message)
      }
    }

    // 4. Check photos table for any stored images
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('file_path, storage_path, post_id')
      .limit(5)

    if (photosError) {
      console.error('❌ Error checking photos table:', photosError)
      return
    }

    console.log(`\n📸 Photos in database: ${photos.length}`)
    if (photos.length > 0) {
      photos.forEach(photo => {
        console.log(`   - Post: ${photo.post_id}`)
        console.log(`     Storage: ${photo.storage_path}`)
        console.log(`     Public: ${photo.file_path}`)
        console.log('')
      })
    }

    // 5. Summary and recommendations
    console.log('\n📋 Summary:')
    if (!foundBucket) {
      console.log('❌ Create a "dwelly-listings" bucket in Supabase Dashboard')
    } else if (!foundBucket.public) {
      console.log('⚠️  Make sure the "dwelly-listings" bucket is set to public')
    } else {
      console.log('✅ Storage configuration looks good')
    }

    if (photos.length === 0) {
      console.log('💡 No photos found - this might explain missing images in listings')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkStorage() 