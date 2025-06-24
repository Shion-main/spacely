import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: listings, error } = await supabase
      .from('posts')
      .select(`
        post_id,
        title,
        price,
        city,
        barangay,
        approval_status,
        is_deleted,
        rejection_reason,
        archived,
        created_at,
        room_types (
          display_name
        ),
        photos (
          file_path,
          storage_path,
          is_featured,
          photo_order
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('User listings fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    // Transform photo URLs for consistent display
    const transformedListings = listings?.map(listing => {
      if (listing.photos && listing.photos.length > 0) {
        listing.photos = listing.photos.map((photo: any) => {
          const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (!storageUrl) {
            console.log('No SUPABASE_URL found in env')
            return photo
          }

          // If already a full URL, return as is
          if (photo.file_path && photo.file_path.includes('storage/v1/object/public')) {
            return photo
          }

          // Use storage_path primarily, fallback to file_path
          let finalPath = photo.storage_path || photo.file_path
          if (!finalPath) return photo

          // Clean the path
          finalPath = finalPath.replace(/^\/+/, '')
          
          // Ensure it starts with dwelly-listings/
          if (!finalPath.startsWith('dwelly-listings/')) {
            finalPath = `dwelly-listings/${finalPath}`
          }

          console.log('Profile API - Transformed photo path:', finalPath)

          return {
            ...photo,
            file_path: `${storageUrl}/storage/v1/object/public/${finalPath}`
          }
        })
      }
      return listing
    }) || []

    return NextResponse.json({ listings: transformedListings }, { status: 200 })

  } catch (error) {
    console.error('Profile listings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 