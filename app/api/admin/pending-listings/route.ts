import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'

// Helper function to get the public URL for a storage path
function getStorageUrl(storagePath: string): string {
  console.log('Original storage path:', storagePath)
  
  if (!storagePath) {
    console.log('No storage path provided, using placeholder')
    return '/images/placeholder-property.svg'
  }
  
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!storageUrl) {
    console.log('No SUPABASE_URL found in env')
    return storagePath
  }

  console.log('Supabase URL:', storageUrl)

  // Handle both full storage paths and relative paths
  let finalPath = storagePath
  if (storagePath.includes('storage/v1/object')) {
    // Already a full URL, just return it
    return storagePath
  }

  // Remove any leading slashes
  finalPath = finalPath.replace(/^\/+/, '')
  console.log('Cleaned path:', finalPath)

  // Handle bucket name
  const bucketName = 'dwelly-listings'
  if (!finalPath.startsWith(bucketName)) {
    finalPath = `${bucketName}/${finalPath}`
  }
  console.log('Path with bucket:', finalPath)

  const finalUrl = `${storageUrl}/storage/v1/object/public/${finalPath}`
  console.log('Final URL:', finalUrl)
  
  return finalUrl
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseUserClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Use service client to fetch pending listings
    const supabase = createServiceClient()

    // Get pending listings with all necessary information
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        post_id,
        title,
        description,
        price,
        city,
        barangay,
        street,
        approval_status,
        created_at,
        users!posts_user_id_fkey (
          full_name,
          phone_number,
          email,
          role
        ),
        room_types (
          type_name,
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
        ),
        post_amenities (
          amenities (
            name,
            type
          )
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('Error fetching pending listings:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch pending listings' },
        { status: 500 }
      )
    }

    if (!posts) {
      return NextResponse.json({ posts: [] })
    }
    
    // Check storage bucket for posts without photos
    for (const post of posts) {
      if (!post.photos || post.photos.length === 0) {
        // List files in the post's directory in the bucket
        const { data: files, error: storageError } = await supabase
          .storage
          .from('dwelly-listings')
          .list('listings')

        if (storageError) {
          console.error('Error listing files:', storageError)
          continue
        }

        if (files && files.length > 0) {
          // Create photo entries for found files
          post.photos = files.map((file, index) => ({
            file_path: file.name,
            storage_path: `listings/${file.name}`,
            is_featured: index === 0,
            photo_order: index
          }))
        }
      }
    }

    // Transform the data to match the expected format
    const transformedPosts = posts.map(post => {
      const transformedPhotos = (post.photos || []).map((photo: any) => {
        const url = getStorageUrl(photo.storage_path || photo.file_path)
        return {
          ...photo,
          file_path: url
        }
      })

      return {
        post_id: post.post_id,
        title: post.title,
        description: post.description,
        price: post.price,
        city: post.city,
        barangay: post.barangay,
        street: post.street,
        approval_status: post.approval_status,
        created_at: post.created_at,
        users: post.users || null,
        room_types: post.room_types || null,
        rooms: post.rooms || [],
        photos: transformedPhotos,
        post_amenities: post.post_amenities?.map((pa: any) => pa.amenities) || []
      }
    })

    // Log sensitive data access
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logDataAccess(
      user.id,
      'pending_listings_data',
      {
        pending_listings_count: transformedPosts.length,
        ...requestMetadata
      }
    )

    return NextResponse.json({ posts: transformedPosts })
  } catch (error) {
    console.error('Unexpected error in pending listings endpoint:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return NextResponse.json(
      { 
        error: 'Unexpected error in pending listings endpoint', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 