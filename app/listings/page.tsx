import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ListingsHeader } from '@/components/listings/listings-header'
import { ListingsContent } from '@/components/listings/listings-content'
import { ViewToggle } from '@/components/listings/view-toggle'
import { SearchBar } from '@/components/navigation/search-bar'
import { headers } from 'next/headers'

interface SearchParams {
  [key: string]: string | undefined
}

interface ListingsPageProps {
  searchParams: SearchParams
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const supabase = createClient()
  const headersList = headers()
  const host = headersList.get('host') || 'localhost:5000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`

  // Await search parameters
  const resolvedSearchParams = await searchParams

  // Get search parameters
  const search = resolvedSearchParams.search || ''
  const city = resolvedSearchParams.city || ''
  const roomType = resolvedSearchParams.room_type || ''
  const priceMin = resolvedSearchParams.price_min ? Number(resolvedSearchParams.price_min) : undefined
  const priceMax = resolvedSearchParams.price_max ? Number(resolvedSearchParams.price_max) : undefined
  const page = resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1
  const view = resolvedSearchParams.view || 'list' // 'list' or 'map'

  const pageSize = 12

  // Fetch listings directly from Supabase to avoid SSR fetch issues
  let listings: any[] = []
  let totalCount = 0

  try {
    // Build query
    let query = supabase
      .from('posts')
      .select(`
        post_id,
        title,
        description,
        price,
        city,
        barangay,
        street,
        latitude,
        longitude,
        created_at,
        users!inner(
          full_name,
          phone_number
        ),
        rooms!inner(
          number_of_rooms,
          bathroom_type,
          room_types!inner(
            type_name,
            display_name
          )
        ),
        photos(
          file_path,
          storage_path,
          is_featured,
          photo_order
        ),
        amenities!left(
          amenity_id,
          amenity_name
        )
      `)
      .eq('is_approved', true)
      .eq('is_deleted', false)
      .eq('is_flagged', false)

    // Add filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%,barangay.ilike.%${search}%`)
    }
    if (city) {
      query = query.eq('city', city)
    }
    if (roomType) {
      query = query.eq('rooms.room_types.type_name', roomType)
    }
    if (priceMin !== undefined) {
      query = query.gte('price', priceMin)
    }
    if (priceMax !== undefined) {
      query = query.lte('price', priceMax)
    }

    // Get total count
    const { count } = await query
      .select('*', { count: 'exact', head: true })
    totalCount = count || 0

    // Get paginated results
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
      console.error('Supabase query error:', error)
    } else {
      listings = data || []
    }
  } catch (error) {
    console.error('Error fetching listings:', error)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  // Get room types for filter
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('type_name, display_name')
    .order('display_name')

  // Get user's favorites
  const { data: { user } } = await supabase.auth.getUser()
  let favoritePostIds: string[] = []
  if (user) {
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('favorites')
      .select('post_id')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
    
    if (favoritesData) {
      favoritePostIds = favoritesData.map(fav => fav.post_id)
    }
  }

  return (
    <div className="flex flex-col">
      <ViewToggle />
      
      <main className={view === 'map' ? 'h-[calc(100vh-80px)]' : 'flex-1'}>
        {view === 'map' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map view...</p>
              </div>
            </div>
          }>
            <ListingsContent
              listings={listings || []}
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              searchParams={resolvedSearchParams}
              view={view as 'list' | 'map'}
              favoritePostIds={favoritePostIds}
            />
          </Suspense>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ListingsHeader totalCount={totalCount} />
            <div className="mb-6">
              <SearchBar roomTypes={roomTypes || []} />
            </div>

            {/* Listings Content */}
            <Suspense fallback={<div className="text-center py-8">Loading listings...</div>}>
              <ListingsContent
                listings={listings || []}
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                searchParams={resolvedSearchParams}
                view={view as 'list' | 'map'}
                favoritePostIds={favoritePostIds}
              />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  )
}

export const metadata = {
  title: 'Browse Listings - SPACELY',
  description: 'Find your perfect campus home near Mapua Malayan Colleges Mindanao',
} 