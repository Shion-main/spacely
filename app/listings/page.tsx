import { Suspense } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ListingsHeader } from '@/components/listings/listings-header'
import { ListingsContent } from '@/components/listings/listings-content'
import { ViewToggle } from '@/components/listings/view-toggle'
import { SearchBar } from '@/components/navigation/search-bar'

interface SearchParams {
  [key: string]: string | undefined
}

interface ListingsPageProps {
  searchParams: SearchParams
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const supabase = createClient()

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

  // Resolve base URL dynamically when env var is absent (works on Vercel & localhost)
  const host = headers().get('host') || 'localhost:5000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  // Build API URL with search parameters
  const apiUrl = new URL('/api/listings', baseUrl)
  apiUrl.searchParams.set('page', page.toString())
  apiUrl.searchParams.set('limit', pageSize.toString())
  
  if (search) apiUrl.searchParams.set('search', search)
  if (city) apiUrl.searchParams.set('city', city)
  if (roomType) apiUrl.searchParams.set('type_id', roomType)
  if (priceMin !== undefined) apiUrl.searchParams.set('min_price', priceMin.toString())
  if (priceMax !== undefined) apiUrl.searchParams.set('max_price', priceMax.toString())

  // Fetch data from our API endpoint (which has the RLS bypass fix)
  let listings: any[] = []
  let totalCount = 0
  
  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      listings = data.listings || []
      
      // Get total count by making a separate query without pagination
      const countUrl = new URL('/api/listings', baseUrl)
      if (search) countUrl.searchParams.set('search', search)
      if (city) countUrl.searchParams.set('city', city)
      if (roomType) countUrl.searchParams.set('type_id', roomType)
      if (priceMin !== undefined) countUrl.searchParams.set('min_price', priceMin.toString())
      if (priceMax !== undefined) countUrl.searchParams.set('max_price', priceMax.toString())
      countUrl.searchParams.set('limit', '1000') // Large number to get all results for counting
      
      const countResponse = await fetch(countUrl.toString())
      if (countResponse.ok) {
        const countData = await countResponse.json()
        totalCount = countData.listings?.length || 0
      }
    } else {
      console.error('Failed to fetch listings from API:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('Error fetching listings from API:', error)
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