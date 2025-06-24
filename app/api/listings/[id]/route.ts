import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { postUpdateSchema } from '@/lib/validations'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Extended update schema that handles form field mappings
const updateListingSchema = postUpdateSchema.extend({
  full_address: z.string().optional(), // Maps to 'street' field
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).omit({
  street: true, // Remove original street field since we use full_address
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data: listing, error } = await supabase
      .from('posts')
      .select(`
        post_id,
        user_id,
        type_id,
        title,
        description,
        price,
        city,
        barangay,
        street,
        building_name,
        unit_number,
        landlord_name,
        contact_number,
        social_link,
        page_link,
        maps_link,
        latitude,
        longitude,
        approval_status,
        created_at,
        amenities,
        room_types (
          display_name
        ),
        rooms (
          number_of_rooms,
          bathroom_type,
          room_type
        ),
        photos (
          file_path,
          storage_path,
          is_featured,
          photo_order
        )
      `)
      .eq('post_id', id)
      .single()

    if (error) {
      console.error('Database error fetching listing:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Database error fetching listing', details: error.message },
        { status: 500 }
      )
    }

    if (!listing) {
      console.log('No listing found with ID:', id)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Fetch user data separately to bypass RLS issues
    let userData = { full_name: 'Unknown User' }
    if (listing.user_id) {
      const serviceClient = createServiceClient()
      const { data: user, error: userError } = await serviceClient
        .from('users')
        .select('user_id, full_name')
        .eq('user_id', listing.user_id)
        .single()

      if (!userError && user) {
        userData = { full_name: user.full_name }
      }
    }

    // Attach user data to listing
    const enrichedListing = {
      ...listing,
      users: userData
    }

    // Check storage for photos if none found in database
    if (!listing.photos || listing.photos.length === 0) {
      console.log('No photos found in database, checking storage...')
      const { data: files, error: storageError } = await supabase
        .storage
        .from('dwelly-listings')
        .list(`listings/${listing.post_id}`)

      if (storageError) {
        console.error('Error listing files:', storageError)
      } else if (files && files.length > 0) {
        console.log(`Found ${files.length} files in storage:`, files)
        
        // Create photo records in database
        const photoRecords = files.map((file, index) => ({
          post_id: listing.post_id,
          file_path: file.name,
          storage_path: `listings/${listing.post_id}/${file.name}`,
          is_featured: index === 0,
          photo_order: index
        }))

        const { error: insertError } = await supabase
          .from('photos')
          .insert(photoRecords)

        if (insertError) {
          console.error('Error inserting photo records:', insertError)
        } else {
          listing.photos = photoRecords
        }
      } else {
        console.log('No files found in storage')
      }
    }

    // Transform photo URLs on the enriched listing
    if (enrichedListing.photos) {
      enrichedListing.photos = enrichedListing.photos.map((photo: any) => {
        const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!storageUrl) {
          console.log('No SUPABASE_URL found in env')
          return photo
        }

        let finalPath = photo.storage_path || photo.file_path
        if (finalPath.includes('storage/v1/object')) {
          return photo
        }

        finalPath = finalPath.replace(/^\/+/, '')
        if (!finalPath.startsWith('dwelly-listings/')) {
          finalPath = `dwelly-listings/${finalPath}`
        }

        console.log('Transformed photo path:', finalPath)

        return {
          ...photo,
          file_path: `${storageUrl}/storage/v1/object/public/${finalPath}`
        }
      })
    }

    return NextResponse.json(enrichedListing, { status: 200 })

  } catch (error) {
    console.error('Listing details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if listing exists and user owns it
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, post_id, type_id, city, barangay')
      .eq('post_id', id)
      .single()

    if (fetchError || !existingPost) {
      console.error('Post fetch error:', fetchError, 'for post_id:', id);
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own listings' }, { status: 403 })
    }

    console.log('Processing update for post_id:', id, 'user:', user.id);

    const formData = await request.formData()
    
    // Extract form fields
    const data: any = {}
    const images: File[] = []
    const photosToDelete: string[] = []

    for (const [key, value] of formData.entries()) {
      if (key === 'images') {
        images.push(value as File)
      } else if (key === 'photos_to_delete[]') {
        console.log('Photo to delete received:', value as string);
        photosToDelete.push(value as string)
      } else if (key === 'custom_amenities') {
        try {
          data.custom_amenities = JSON.parse(value as string)
        } catch {
          data.custom_amenities = []
        }
      } else if (['type_id', 'price', 'number_of_rooms'].includes(key)) {
        data[key] = parseInt(value as string)
      } else if (['latitude', 'longitude'].includes(key)) {
        data[key] = value ? parseFloat(value as string) : undefined
      } else if (key === 'amenities') {
        data[key] = JSON.parse(value as string)
      } else {
        data[key] = value
      }
    }

    console.log('Extracted custom amenities:', data.custom_amenities)

    // Validate data
    const validatedData = updateListingSchema.parse(data)

    // Generate title from rental type and address if type or location changed
    let generatedTitle = undefined
    if (validatedData.type_id || validatedData.barangay || validatedData.city) {
      const { data: rentalType } = await supabase
        .from('room_types')
        .select('display_name')
        .eq('type_id', validatedData.type_id || existingPost.type_id)
        .single()

      if (rentalType) {
        const barangay = validatedData.barangay || existingPost.barangay
        const city = validatedData.city || existingPost.city
        generatedTitle = `${rentalType.display_name} in ${barangay}, ${city}`
      }
    }

    // Update post
    const postUpdates: any = {}
    if (validatedData.type_id) postUpdates.type_id = validatedData.type_id
    if (validatedData.city) postUpdates.city = validatedData.city
    if (validatedData.barangay) postUpdates.barangay = validatedData.barangay
    if (validatedData.full_address) {
      postUpdates.street = validatedData.full_address
    }
    if (validatedData.building_name !== undefined) postUpdates.building_name = validatedData.building_name || null
    if (validatedData.unit_number !== undefined) postUpdates.unit_number = validatedData.unit_number || null
    if (validatedData.price) postUpdates.price = validatedData.price
    if (validatedData.landlord_name) postUpdates.landlord_name = validatedData.landlord_name
    if (validatedData.contact_number) postUpdates.contact_number = validatedData.contact_number
    if (validatedData.social_link) postUpdates.social_link = validatedData.social_link
    if (validatedData.page_link !== undefined) postUpdates.page_link = validatedData.page_link || null
    if (validatedData.maps_link !== undefined) postUpdates.maps_link = validatedData.maps_link || null
    if (validatedData.latitude !== undefined) postUpdates.latitude = validatedData.latitude
    if (validatedData.longitude !== undefined) postUpdates.longitude = validatedData.longitude
    if (generatedTitle) postUpdates.title = generatedTitle
    
    // Set approval status back to pending for admin review after editing
    postUpdates.approval_status = 'pending'
    postUpdates.updated_at = new Date().toISOString()

    if (Object.keys(postUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update(postUpdates)
        .eq('post_id', id)

      if (updateError) {
        console.error('Post update error:', updateError)
        return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
      }
    }

    // Update room details
    const roomUpdates: any = {}
    if (validatedData.number_of_rooms) roomUpdates.number_of_rooms = validatedData.number_of_rooms
    if (validatedData.bathroom_type) roomUpdates.bathroom_type = validatedData.bathroom_type
    if (validatedData.room_type) roomUpdates.room_type = validatedData.room_type

    if (Object.keys(roomUpdates).length > 0) {
      const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update(roomUpdates)
        .eq('post_id', id)

      if (roomUpdateError) {
        console.error('Room update error:', roomUpdateError)
        return NextResponse.json({ error: 'Failed to update room details' }, { status: 500 })
      }
    }

    // Determine final amenities array precedence: validatedData.amenities first, else custom_amenities (may be empty array)
    if (validatedData.amenities !== undefined) {
      const { error: amenityError } = await supabase
        .from('posts')
        .update({ amenities: validatedData.amenities })
        .eq('post_id', id)

      if (amenityError) {
        console.error('Amenity update error:', amenityError)
      }
    } else if (data.custom_amenities !== undefined) {
      const { error: amenityError } = await supabase
        .from('posts')
        .update({ amenities: data.custom_amenities })
        .eq('post_id', id)

      if (amenityError) {
        console.error('Custom amenity update error:', amenityError)
      }
    }

    // Handle photo deletion using PhotoManager
    if (photosToDelete.length > 0) {
      console.log('Attempting to delete photos:', photosToDelete);
      
      const { photoManager } = await import('../../../../lib/photo-manager');
      const deleteResult = await photoManager.deletePhotos({
        postId: id,
        photoPaths: photosToDelete,
        userId: user.id
      });

      if (!deleteResult.success) {
        console.error('Photo deletion failed:', deleteResult.errors);
        // Don't fail the entire update for photo deletion issues
      } else {
        console.log(`Successfully deleted ${deleteResult.deletedCount} photos`);
      }

      if (deleteResult.errors.length > 0) {
        console.warn('Photo deletion warnings:', deleteResult.errors);
      }
    }

    // Handle new images if any using PhotoManager
    if (images.length > 0) {
      // Get user profile for folder naming
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      const userFolder = profile?.full_name
        ? profile.full_name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : user.id

      const listingFolder = postUpdates.title
        ? postUpdates.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
        : `listing-${id}`

      // Get current photo count to set proper photo_order for new images
      const { photoManager } = await import('../../../../lib/photo-manager');
      const existingPhotosResult = await photoManager.getPhotosForListing(id);
      
      const startingOrder = existingPhotosResult.success 
        ? Math.max(0, ...existingPhotosResult.photos.map(p => p.photo_order || 0)) + 1
        : 0

      // Check if there are existing featured photos
      const hasFeaturedPhoto = existingPhotosResult.success 
        ? existingPhotosResult.photos.some(photo => photo.is_featured)
        : false

      const uploadResult = await photoManager.uploadPhotos(images, {
        postId: id,
        userId: user.id,
        userFolder,
        listingFolder,
        isFirstPhotoFeatured: !hasFeaturedPhoto,
        startingOrder
      });

      if (!uploadResult.success && uploadResult.errors.length > 0) {
        console.error('Photo upload errors:', uploadResult.errors);
      } else if (uploadResult.uploadedPhotos.length > 0) {
        console.log(`Successfully uploaded ${uploadResult.uploadedPhotos.length} photos`);
      }

      if (uploadResult.errors.length > 0) {
        console.warn('Photo upload warnings:', uploadResult.errors);
      }
    }

    // Revalidate relevant paths after successful update
    revalidatePath('/profile')
    revalidatePath('/listings')
    revalidatePath(`/listings/${id}`)

    // Final success response
    return NextResponse.json({ message: 'Listing updated successfully!' }, { status: 200 })

  } catch (error: any) {
    console.error('Listing update error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get deletion reason from request body
    const { reason } = await request.json()

    // Check if listing exists and user owns it
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('post_id', id)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own listings' }, { status: 403 })
    }

    // Perform a "soft delete" by updating the flag and timestamp
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: reason
      })
      .eq('post_id', id)

    if (updateError) {
      console.error('Soft delete error:', updateError)
      return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
    }

    // Revalidate paths to reflect the deletion
    revalidatePath('/profile')
    revalidatePath('/listings')

    return NextResponse.json({ message: 'Listing deleted successfully' })
  } catch (error) {
    console.error('Listing delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 