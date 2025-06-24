const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

// Import PhotoManager (we'll need to transpile this or adjust for Node.js)
async function runCleanup() {
  try {
    console.log('🧹 Starting photo cleanup operations...\n')

    // Note: In a real implementation, you'd need to handle ES modules in Node.js
    // For now, this shows the pattern of how to use the PhotoManager

    console.log('1. Checking for orphaned files in storage...')
    
    // Example of what PhotoManager.cleanupOrphanedFiles() would do:
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get all database photo paths
    const { data: allDbPhotos, error: dbError } = await serviceClient
      .from('photos')
      .select('storage_path, post_id')

    if (dbError) {
      console.error('❌ Error fetching database photos:', dbError)
      return
    }

    console.log(`📊 Found ${allDbPhotos?.length || 0} photos in database`)

    // Get storage files
    const { data: userFolders, error: listError } = await serviceClient.storage
      .from('dwelly-listings')
      .list('users')

    if (listError) {
      console.error('❌ Error listing storage folders:', listError)
      return
    }

    console.log(`📁 Found ${userFolders?.length || 0} user folders in storage`)

    let totalStorageFiles = 0
    const dbPaths = new Set(allDbPhotos?.map(p => p.storage_path) || [])
    const orphanedFiles = []

    // Check each user folder for orphaned files
    for (const userFolder of userFolders || []) {
      if (!userFolder.name) continue

      const { data: listingFolders } = await serviceClient.storage
        .from('dwelly-listings')
        .list(`users/${userFolder.name}`)

      for (const listingFolder of listingFolders || []) {
        if (!listingFolder.name) continue

        const { data: files } = await serviceClient.storage
          .from('dwelly-listings')
          .list(`users/${userFolder.name}/${listingFolder.name}`)

        for (const file of files || []) {
          if (!file.name) continue
          totalStorageFiles++

          const fullPath = `users/${userFolder.name}/${listingFolder.name}/${file.name}`
          
          if (!dbPaths.has(fullPath)) {
            orphanedFiles.push(fullPath)
          }
        }
      }
    }

    console.log(`📊 Total storage files: ${totalStorageFiles}`)
    console.log(`🔍 Orphaned files found: ${orphanedFiles.length}`)

    if (orphanedFiles.length > 0) {
      console.log('\n🗑️  Orphaned files:')
      orphanedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`)
      })

      // In a real cleanup, you would delete these files
      console.log('\n⚠️  To clean up orphaned files, uncomment the deletion code below:')
      console.log('   // const { error } = await serviceClient.storage.from("dwelly-listings").remove(orphanedFiles)')
    }

    // Check for database records without storage files
    console.log('\n2. Checking for database records without storage files...')
    
    const storagePathsSet = new Set()
    // We would populate this by checking actual storage files
    
    const orphanedRecords = allDbPhotos?.filter(photo => 
      photo.storage_path && !storagePathsSet.has(photo.storage_path)
    ) || []

    console.log(`🔍 Database records without storage files: ${orphanedRecords.length}`)

    if (orphanedRecords.length > 0) {
      console.log('   These records point to non-existent files:')
      orphanedRecords.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. Post ${record.post_id}: ${record.storage_path}`)
      })
      if (orphanedRecords.length > 5) {
        console.log(`   ... and ${orphanedRecords.length - 5} more`)
      }
    }

    console.log('\n✅ Cleanup analysis complete!')
    console.log('\nTo run automated cleanup:')
    console.log('1. Use PhotoManager.cleanupOrphanedFiles() to remove orphaned storage files')
    console.log('2. Use PhotoManager.syncOrphanedFiles(postId) to create missing database records')
    console.log('3. Manually clean up database records for deleted storage files')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

runCleanup() 