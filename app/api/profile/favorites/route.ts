import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        created_at,
        posts (
          post_id,
          user_id,
          title,
          price,
          city,
          room_types (
            display_name
          ),
          photos (
            file_path,
            storage_path,
            is_featured,
            photo_order
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .not('posts.is_deleted', 'eq', true)
      .not('posts.archived', 'eq', true)
      .eq('posts.approval_status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('User favorites fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Fetch user data separately to avoid RLS issues
    const serviceClient = createServiceClient()
    const postsWithoutUsers = favorites
      .filter(fav => fav.posts)
      .map(fav => fav.posts as any)

    const userIds = Array.from(new Set(postsWithoutUsers.map(post => post.user_id)))
    let userMap: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await serviceClient
        .from('users')
        .select('user_id, full_name')
        .in('user_id', userIds)

      if (!usersError && users) {
        userMap = users.reduce((acc, user) => {
          acc[user.user_id] = user
          return acc
        }, {} as Record<string, any>)
      }
    }

    // Transform the data to match the expected format
    const transformedFavorites = favorites
      .filter(fav => fav.posts) // Filter out favorites where post was deleted
      .map(fav => {
        const post = fav.posts as any // Type assertion to handle post details

        return {
          ...post,
          created_at: fav.created_at, // Use favorite creation date
          users: userMap[post.user_id] || { full_name: 'Unknown User' }
        }
      })

    // Manually construct public URLs for photos
    const favoritesWithPhotoUrls = transformedFavorites.map(post => {
      const photosWithUrls = post.photos.map((photo: any) => {
        if (photo.storage_path) {
          const { data: { publicUrl } } = serviceClient.storage
            .from('dwelly-listings')
            .getPublicUrl(photo.storage_path);
          return { ...photo, file_path: publicUrl };
        }
        return photo;
      });
      return { ...post, photos: photosWithUrls };
    });

    return NextResponse.json({ favorites: favoritesWithPhotoUrls }, { status: 200 })

  } catch (error) {
    console.error('Profile favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 