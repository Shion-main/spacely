"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ListingsGrid } from './listings-grid'

// Dynamically import the map view to prevent SSR issues
const ListingsMapView = dynamic(() => import('./listings-map-view').then(mod => ({ default: mod.ListingsMapView })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map view...</p>
      </div>
    </div>
  )
})

interface Listing {
  post_id: string
  title: string
  description: string
  price: number
  city: string
  barangay: string
  street: string
  latitude?: number
  longitude?: number
  approval_status: string
  created_at: string
  users: {
    user_id: string
    full_name: string
    phone_number: string
  }
  room_types: {
    type_name: string
    display_name: string
  }
  rooms: Array<{
    number_of_rooms: number
    bathroom_type: string
    room_type: string
    has_wifi: boolean
    has_cctv: boolean
    is_airconditioned: boolean
    has_parking: boolean
  }>
  photos: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
  amenities?: string[]
}

interface SearchParams {
  [key: string]: string | string[] | undefined
}

interface ListingsContentProps {
  listings: Listing[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchParams: SearchParams
  view: 'list' | 'map'
  favoritePostIds: string[]
}

export function ListingsContent({ 
  listings, 
  currentPage, 
  totalPages, 
  totalCount, 
  searchParams, 
  view,
  favoritePostIds
}: ListingsContentProps) {
  const [mapListings, setMapListings] = useState<Listing[]>(listings)
  const [isLoadingMapData, setIsLoadingMapData] = useState(false)

  // For map view, fetch fresh data from client-side to ensure coordinates are included
  useEffect(() => {
    if (view === 'map') {
      console.log('🔄 Map view detected, fetching fresh data with coordinates...')
      setIsLoadingMapData(true)
      
      // Build the same URL as server-side but fetch from client
      const apiUrl = new URL('/api/listings', window.location.origin)
      apiUrl.searchParams.set('page', '1')
      apiUrl.searchParams.set('limit', '100') // Get more listings for map view
      
      // Add search parameters
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          apiUrl.searchParams.set(key, value)
        }
      })

      fetch(apiUrl.toString(), {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ Fresh map data fetched:', data.listings?.length || 0, 'listings')
        if (data.listings) {
          const transformedListings = data.listings.map((listing: Listing) => ({
            ...listing,
            photos: listing.photos.map(photo => {
              const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              if (!storageUrl || photo.file_path.startsWith('http')) {
                return photo;
              }
              let finalPath = photo.storage_path || photo.file_path;
              finalPath = finalPath.replace(/^\/+/, '');
              if (!finalPath.startsWith('dwelly-listings/')) {
                finalPath = `dwelly-listings/${finalPath}`;
              }
              return {
                ...photo,
                file_path: `${storageUrl}/storage/v1/object/public/${finalPath}`
              };
            })
          }));
          setMapListings(transformedListings);
        }
        setIsLoadingMapData(false)
      })
      .catch(error => {
        console.error('❌ Error fetching map data:', error)
        setIsLoadingMapData(false)
      })
    } else {
      setMapListings(listings)
    }
  }, [view, searchParams])

  return (
    <>
      {view === 'list' ? (
        <div className="space-y-6">
          <ListingsGrid
            listings={listings}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            searchParams={searchParams as Record<string, string>}
            favoritePostIds={favoritePostIds}
          />
        </div>
      ) : (
        <div className="h-full w-full min-h-[400px]">
          {isLoadingMapData ? (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading fresh map data...</p>
              </div>
            </div>
          ) : (
            <ListingsMapView listings={mapListings} />
          )}
        </div>
      )}
    </>
  )
} 