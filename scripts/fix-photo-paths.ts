import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixPhotoPaths() {
  console.log('Starting photo path fix...')

  // 1. Get all photos
  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select('*')

  if (fetchError) {
    console.error('Error fetching photos:', fetchError)
    return
  }

  console.log(`Found ${photos.length} photos to process`)

  // 2. Process each photo
  for (const photo of photos) {
    // Ensure storage_path is set and doesn't have bucket prefix
    const storagePath = photo.storage_path?.replace(/^dwelly-listings\//, '') || photo.file_path?.replace(/^dwelly-listings\//, '')
    
    if (!storagePath) {
      console.log(`Skipping photo ${photo.photo_id} - no valid path`)
      continue
    }

    // Update both paths to be consistent
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        file_path: storagePath,
        storage_path: storagePath
      })
      .eq('photo_id', photo.photo_id)

    if (updateError) {
      console.error(`Error updating photo ${photo.photo_id}:`, updateError)
    } else {
      console.log(`Updated photo ${photo.photo_id}`)
    }
  }

  console.log('Photo path fix completed')
}

fixPhotoPaths()
  .catch(console.error)
  .finally(() => process.exit()) 