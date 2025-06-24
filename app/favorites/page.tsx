import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Heart } from 'lucide-react'
import { FavoritesGrid } from '@/components/favorites/favorites-grid'
import { redirect } from 'next/navigation'

async function fetchFavorites(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      created_at,
      posts (
        *,
        room_types (*),
        rooms (*),
        photos (*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .not('posts.is_deleted', 'eq', true)
    .not('posts.archived', 'eq', true)
    .eq('posts.approval_status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching favorites on server:', error)
    return []
  }

  // Fetch user data separately to avoid RLS issues
  const serviceClient = createServiceClient()
  const postsWithUser = data
    .filter(fav => fav.posts)
    .map(fav => fav.posts as any)

  const userIds = Array.from(new Set(postsWithUser.map(post => post.user_id)))
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

  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return data
    .filter(fav => fav.posts)
    .map(fav => {
      const post = fav.posts as any
      const transformedPhotos = (post.photos || []).map((photo: any) => {
        if (!storageUrl || !photo.storage_path) {
          return { ...photo, file_path: '/images/placeholder-property.svg' }
        }
        return {
          ...photo,
          file_path: `${storageUrl}/storage/v1/object/public/dwelly-listings/${photo.storage_path}`
        }
      })

      return {
        ...post,
        photos: transformedPhotos,
        favorited_at: fav.created_at,
        users: userMap[post.user_id] || { full_name: 'Unknown User' }
      }
    })
}

export default async function FavoritesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/favorites')
  }

  const favorites = await fetchFavorites(user.id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Heart className="w-8 h-8 mr-3 text-red-500" />
                  My Favorites
                </h1>
                <p className="text-gray-600 mt-2">
              Properties you've saved for later viewing.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{favorites.length}</p>
                <p className="text-sm text-gray-600">Saved Properties</p>
              </div>
            </div>
          </div>
      <FavoritesGrid initialFavorites={favorites} />
    </div>
  )
} 