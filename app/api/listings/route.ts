import { NextRequest, NextResponse } from 'next/server'
export const revalidate = 60
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const listingSchema = z.object({
  type_id: z.number().min(1),
  city: z.string().min(1),
  barangay: z.string().min(1),
  street: z.string().optional().or(z.literal('')),
  full_address: z.string().optional().or(z.literal('')),
  building_name: z.string().optional(),
  unit_number: z.string().optional(),
  price: z.number().min(1),
  landlord_name: z.string().min(1),
  contact_number: z.string().min(1),
  social_link: z.string().url(),
  page_link: z.string().url().optional().or(z.literal('')),
  maps_link: z.string().url().optional().or(z.literal('')),
  search_keywords: z.string().optional(),
  // Coordinates from map extraction
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  number_of_rooms: z.number().min(1),
  bathroom_type: z.enum(['common', 'own']),
  room_type: z.enum(['bare', 'semi_furnished', 'furnished']),
  amenities: z.array(z.string()).optional()
})

// Helper function to get or create amenity IDs
// Helper function removed - amenities now stored as array in posts table

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('user_id, role, full_name')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const formData = await request.formData()
    
    // Extract form fields
    const data: any = {}
    const images: File[] = []

    // Convert FormData entries to an array to iterate
    const entries = Array.from(formData.entries())
    
    for (const [key, value] of entries) {
      if (key.startsWith('image_')) {
        images.push(value as File)
      } else if (key === 'amenities') {
        data[key] = JSON.parse(value as string)
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

    // Validate data
    const validatedData = listingSchema.parse(data)

    if (images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }

    // Get rental type name for title generation
    const { data: rentalType } = await supabase
      .from('room_types')
      .select('display_name')
      .eq('type_id', validatedData.type_id)
      .single()

    // Generate title from rental type and address
    const generatedTitle = rentalType 
      ? `${rentalType.display_name} in ${validatedData.barangay}, ${validatedData.city}`
      : `Rental in ${validatedData.barangay}, ${validatedData.city}`

    // Generate basic description
    // Use full_address if available, otherwise fall back to street
    const addressPart = validatedData.full_address && validatedData.full_address.trim() 
      ? validatedData.full_address 
      : (validatedData.street && validatedData.street.trim() ? validatedData.street : null)
    const locationParts = [addressPart, validatedData.barangay, validatedData.city].filter(Boolean)
    const generatedDescription = `Available ${rentalType?.display_name || 'rental space'} located at ${locationParts.join(', ')}. Monthly rent: ₱${validatedData.price}. Contact for more details and viewing schedule.`

    // Try to create the post with better error handling
    let post;
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          type_id: validatedData.type_id,
          title: generatedTitle,
          description: generatedDescription,
          city: validatedData.city,
          barangay: validatedData.barangay,
          street: validatedData.full_address || validatedData.street || '',
          building_name: validatedData.building_name || null,
          unit_number: validatedData.unit_number || null,
          price: validatedData.price,
          landlord_name: validatedData.landlord_name,
          contact_number: validatedData.contact_number,
          social_link: validatedData.social_link,
          page_link: validatedData.page_link || null,
          maps_link: validatedData.maps_link || null,
          search_keywords: validatedData.search_keywords || null,
          latitude: validatedData.latitude || null,
          longitude: validatedData.longitude || null,
          approval_status: 'pending'
        })
        .select()
        .single()

      if (postError) {
        console.error('Post creation error:', postError)
        
        // Check if it's an RLS error
        if (postError.code === '42501') {
          // RLS policy violation - provide specific guidance
          return NextResponse.json({ 
            error: 'Database permission error. Please contact support.',
            details: 'The database security policy needs to be updated to allow listing creation.'
          }, { status: 500 })
        }
        
        return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
      }

      post = postData
    } catch (error) {
      console.error('Unexpected error during post creation:', error)
      return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 })
    }

    // 2. Create room details
    const { error: roomError } = await supabase
      .from('rooms')
      .insert({
        post_id: post.post_id,
        number_of_rooms: validatedData.number_of_rooms,
        bathroom_type: validatedData.bathroom_type,
        room_type: validatedData.room_type
      })

    if (roomError) {
      console.error('Room creation error:', roomError)
      // Clean up post if room creation fails
      await supabase.from('posts').delete().eq('post_id', post.post_id)
      return NextResponse.json({ error: 'Failed to create room details' }, { status: 500 })
    }

    // 3. Update post with amenities array (if any)
    if (validatedData.amenities && validatedData.amenities.length > 0) {
        const { error: amenityError } = await supabase
            .from('posts')
            .update({ amenities: validatedData.amenities })
            .eq('post_id', post.post_id)

        if (amenityError) {
            console.error('Amenity update error:', amenityError)
            // Continue with post creation even if amenity update fails
        } else {
            console.log('Successfully added', validatedData.amenities.length, 'amenities to post', post.post_id)
        }
    }

    // 4. Upload images to Supabase Storage
    const photoInserts = []

    // Create a user-specific folder with sanitized username
    const userFolder = profile.full_name
      ? profile.full_name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : user.id

    // Create a listing folder with title
    const listingFolder = generatedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50) // Limit length

    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const timestamp = Date.now()
      const randomId = Math.floor(Math.random() * 1000000000)
      const fileName = `${timestamp}-${randomId}.${image.name.split('.').pop()}`
      
      // Organize as: users/{user_folder}/{listing_folder}/{files}
      const storagePath = `users/${userFolder}/${listingFolder}/${fileName}`

      try {
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dwelly-listings')
          .upload(storagePath, image)

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          continue // Skip this image but continue with others
        }

        // Get public URL for verification
        const { data: { publicUrl } } = supabase.storage
          .from('dwelly-listings')
          .getPublicUrl(storagePath)

        photoInserts.push({
          post_id: post.post_id,
          file_path: storagePath,
          storage_path: storagePath,
          is_featured: i === 0,
          photo_order: i
        })
      } catch (error) {
        console.error('Image processing error:', error)
        continue
      }
    }

    // 5. Insert photo records
    if (photoInserts.length > 0) {
      const { error: photoError } = await supabase
        .from('photos')
        .insert(photoInserts)

      if (photoError) {
        console.error('Photo record creation error:', photoError)
        // Don't fail the entire operation for photos
      }
    }

    // Revalidate paths after successful creation
    revalidatePath('/profile')
    revalidatePath('/listings')

    return NextResponse.json({
      message: 'Listing created successfully! It is now pending approval.',
      post_id: post.post_id,
      status: 'pending_approval'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Listing creation error:', error)

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const city = searchParams.get('city')
    const type_id = searchParams.get('type_id')
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')
    const search = searchParams.get('search')
    const amenities = searchParams.get('amenities')
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('posts')
      .select(`
        *,
        room_types (display_name),
        rooms (number_of_rooms, bathroom_type),
        photos (file_path, is_featured)
      `)
      .eq('approval_status', 'approved')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Apply filters
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }
    if (type_id) {
      query = query.eq('type_id', parseInt(type_id))
    }
    if (min_price) {
      query = query.gte('price', parseInt(min_price))
    }
    if (max_price) {
      query = query.lte('price', parseInt(max_price))
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,search_keywords.ilike.%${search}%,city.ilike.%${search}%,barangay.ilike.%${search}%`
      )
    }
    if (amenities) {
      // Support filtering by amenities - check if any of the requested amenities are present
      const amenityList = amenities.split(',').map(a => a.trim())
      query = query.overlaps('amenities', amenityList)
    }

    const { data: listings, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Listings fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    // Fetch user data separately to avoid RLS issues
    let enrichedListings = listings || []
    if (listings && listings.length > 0) {
      const userIds = Array.from(new Set(listings.map(listing => listing.user_id)))
      
      // Use service client to bypass RLS for public user data
      const serviceClient = createServiceClient()
      const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const { data: users, error: usersError } = await serviceClient
        .from('users')
        .select('user_id, full_name, phone_number')
        .in('user_id', userIds)

      if (!usersError && users) {
        // Create a map for quick lookup
        const userMap = users.reduce((acc, user) => {
          acc[user.user_id] = user
          return acc
        }, {} as Record<string, any>)

        // Attach user data to each listing
        enrichedListings = listings.map(listing => {
          let photos = listing.photos || []

          // Fallback: if no photos in db, check storage directly
          if ((!photos || photos.length === 0) && storageUrl) {
            /* eslint-disable no-await-in-loop */
            // Synchronously fetch for each listing (listings count per page is small)
          }
          return { ...listing, users: userMap[listing.user_id] || { full_name: 'Unknown User', phone_number: '' }, photos }
        })
      } else {
        // If user fetch fails, add default user data
        enrichedListings = listings.map(listing => ({
          ...listing,
          users: { full_name: 'Unknown User', phone_number: '' }
        }))
      }

      // Transform photo URLs for all listings
      if (storageUrl) {
        // Gather listing IDs missing photos
        const listingsMissingPhotos = enrichedListings.filter(l => !l.photos || l.photos.length === 0)
        if (listingsMissingPhotos.length > 0) {
          const ids = listingsMissingPhotos.map(l => l.post_id)
          const { data: photoRows } = await serviceClient
            .from('photos')
            .select('post_id,file_path,storage_path,is_featured,photo_order')
            .in('post_id', ids)
            .order('photo_order')
          const photoMap: Record<string, any[]> = {}
          if (photoRows) {
            for (const p of photoRows) {
              if (!photoMap[p.post_id]) photoMap[p.post_id] = []
              photoMap[p.post_id].push(p)
            }
          }
          // attach
          for (const listing of listingsMissingPhotos) {
            listing.photos = photoMap[listing.post_id] || []
          }
        }

        // Transform URLs for all listings now
        for (const listing of enrichedListings) {
          if (listing.photos && listing.photos.length > 0) {
            listing.photos = listing.photos.map((photo: any) => {
              if (photo.file_path.startsWith('http')) return photo
              let finalPath = photo.storage_path || photo.file_path
              finalPath = finalPath.replace(/^\/+/, '')
              if (!finalPath.startsWith('dwelly-listings/')) {
                finalPath = `dwelly-listings/${finalPath}`
              }
              return { ...photo, file_path: `${storageUrl}/storage/v1/object/public/${finalPath}` }
            })
          }
        }
      }
    }

    return NextResponse.json({ listings: enrichedListings }, { status: 200 })

  } catch (error) {
    console.error('Listings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 