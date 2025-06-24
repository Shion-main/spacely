import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables in .env.local')
  console.error('Please ensure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set')
  process.exit(1)
}

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migratePhotos() {
  console.log('Starting photo migration...')

  // 1. Get all photos with their post and user information
  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select(`
      *,
      posts!inner (
        title,
        user_id,
        users!posts_user_id_fkey!inner (
          full_name
        )
      )
    `)

  if (fetchError) {
    console.error('Error fetching photos:', fetchError)
    return
  }

  console.log(`Found ${photos?.length || 0} photos to migrate`)

  // 2. Process each photo
  for (const photo of photos || []) {
    try {
      const post = photo.posts
      if (!post) {
        console.log(`Skipping photo ${photo.photo_id} - no post found`)
        continue
      }

      // Create user folder name
      const userFolder = post.users?.full_name
        ? post.users.full_name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : post.user_id

      // Create listing folder name
      const listingFolder = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 50)

      // Get current file name
      const currentPath = photo.storage_path
      const fileName = currentPath.split('/').pop()
      
      if (!fileName) {
        console.log(`Skipping photo ${photo.photo_id} - invalid path`)
        continue
      }

      // New storage path
      const newStoragePath = `users/${userFolder}/${listingFolder}/${fileName}`

      console.log(`Moving photo ${photo.photo_id}:`)
      console.log(`  From: ${currentPath}`)
      console.log(`  To: ${newStoragePath}`)

      // Copy file to new location
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('dwelly-listings')
        .download(currentPath)

      if (downloadError) {
        console.error(`Error downloading photo ${photo.photo_id}:`, downloadError)
        continue
      }

      // Upload to new location
      const { error: uploadError } = await supabase.storage
        .from('dwelly-listings')
        .upload(newStoragePath, fileData, {
          upsert: true
        })

      if (uploadError) {
        console.error(`Error uploading photo ${photo.photo_id} to new location:`, uploadError)
        continue
      }

      // Update database record
      const { error: updateError } = await supabase
        .from('photos')
        .update({
          file_path: newStoragePath,
          storage_path: newStoragePath
        })
        .eq('photo_id', photo.photo_id)

      if (updateError) {
        console.error(`Error updating photo ${photo.photo_id} record:`, updateError)
        continue
      }

      // Delete old file
      const { error: deleteError } = await supabase.storage
        .from('dwelly-listings')
        .remove([currentPath])

      if (deleteError) {
        console.error(`Error deleting old photo ${photo.photo_id}:`, deleteError)
        // Don't fail if delete fails
      }

      console.log(`Successfully migrated photo ${photo.photo_id}`)
    } catch (error) {
      console.error(`Error processing photo ${photo.photo_id}:`, error)
    }
  }

  console.log('Photo migration completed')
}

migratePhotos()
  .catch(console.error)
  .finally(() => process.exit()) 