"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Bed, Bath, User, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import toast from 'react-hot-toast'

interface Listing {
  post_id: string
  title: string
  description: string
  price: number
  city: string
  barangay: string
  street: string
  approval_status: string
  created_at: string
  amenities?: string[]
  users?: {
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
  }>
  photos: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
}

interface SearchParams {
  [key: string]: string | undefined
}

interface ListingsGridProps {
  listings: Listing[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchParams: Record<string, string>
  favoritePostIds: string[]
}

export function ListingsGrid({ listings, currentPage, totalPages, totalCount, searchParams, favoritePostIds }: ListingsGridProps) {
  const { user } = useAuth()
  const [favoritesLoading, setFavoritesLoading] = useState<string[]>([])
  const [favoriteListings, setFavoriteListings] = useState<string[]>(favoritePostIds)

  const toggleFavorite = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites')
      return
    }

    setFavoritesLoading(prev => [...prev, postId])

    try {
      const response = await fetch(`/api/favorites/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.isFavorited) {
          setFavoriteListings(prev => [...prev, postId])
          toast.success('Added to your favorites!')
        } else {
          setFavoriteListings(prev => prev.filter(id => id !== postId))
          toast.success('Removed from your favorites')
        }
      } else {
        toast.error('Failed to update favorites')
      }
    } catch (error) {
      toast.error('Failed to update favorites')
    } finally {
      setFavoritesLoading(prev => prev.filter(id => id !== postId))
    }
  }

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value)
      }
    })
    params.set('page', page.toString())
    return `/listings?${params.toString()}`
  }

  const formatPrice = (price: number) => {
    // Handle null/undefined prices
    if (!price) {
      return 'Price on request'
    }
    
    return `₱${price.toLocaleString()}`
  }

  const getPhotoUrl = (photo: Listing['photos'][0] | undefined) => {
    if (!photo) return '/images/placeholder-property.svg'

    // If API already provided full URL
    if (photo.file_path && photo.file_path.startsWith('http')) {
      return photo.file_path
    }

    const path = photo.storage_path || photo.file_path

    if (!path) return '/images/placeholder-property.svg'
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not configured')
      return '/images/placeholder-property.svg'
    }

    // Ensure no leading slashes
    const cleaned = path.replace(/^\/+/, '')
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dwelly-listings/${cleaned}`
  }

  return (
    <div className="space-y-6">
      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {((currentPage - 1) * 12) + 1} - {Math.min(currentPage * 12, totalCount)} of {totalCount} results
        </p>
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => {
          const isFavorited = favoriteListings.includes(listing.post_id)
          const featuredPhoto = listing.photos?.find(photo => photo.is_featured) || listing.photos?.[0]
          const photoUrl = getPhotoUrl(featuredPhoto)

          const mainRoom = listing.rooms?.[0]
          
          // Use amenities directly from listing.amenities array
          const allAmenities = listing.amenities || [];

          return (
            <Card 
              key={listing.post_id} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 rounded-xl border-0 bg-white"
            >
              <div className="relative">
                <img
                  src={photoUrl}
                  alt={listing.title}
                  className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Favorite Button */}
                {user && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm ${isFavorited ? 'text-red-500 hover:text-red-600' : 'text-gray-700 hover:text-red-500'}`}
                    onClick={() => toggleFavorite(listing.post_id)}
                    disabled={favoritesLoading.includes(listing.post_id)}
                  >
                    <Heart className={`w-[18px] h-[18px] ${isFavorited ? 'fill-current' : ''}`} />
                  </Button>
                )}

                {/* Property Type Badge */}
                <Badge className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white shadow-md">
                  {listing.room_types?.display_name || 'Unknown Type'}
                </Badge>

                {/* Photos Count */}
                {listing.photos.length > 1 && (
                  <Badge variant="secondary" className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white shadow-md">
                    +{listing.photos.length - 1} photos
                  </Badge>
                )}
              </div>

              <CardContent className="p-5">
                {/* Property Type Title */}
                <div className="mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-200">
                    {listing.room_types?.display_name || 'Unknown Type'}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
                    <span className="text-sm line-clamp-1">
                      {listing.street ? `${listing.street}, ` : ''}{listing.barangay}, {listing.city}
                    </span>
                  </div>
                  
                  {/* Price */}
                  <p className="text-xl font-bold text-blue-600">
                    {formatPrice(listing.price)}
                    <span className="text-sm font-normal text-gray-600 ml-1">/month</span>
                  </p>
                </div>

                {/* Room Details */}
                {mainRoom && (
                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                    {mainRoom.number_of_rooms && (
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-2 text-blue-500" />
                        <span>{mainRoom.number_of_rooms} room{mainRoom.number_of_rooms > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {mainRoom.bathroom_type && (
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="capitalize">{mainRoom.bathroom_type}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Amenities */}
                {allAmenities.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {allAmenities.map((amenity, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors duration-200"
                        >
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owner */}
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <User className="w-4 h-4 mr-2 text-blue-500" />
                  <span>By {listing.users?.full_name || 'Unknown'}</span>
                </div>

                {/* View Details Button */}
                <Link href={`/listings/${listing.post_id}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          {/* Previous Button */}
          <Link href={currentPage > 1 ? buildPageUrl(currentPage - 1) : '#'}>
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          </Link>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {/* First Page */}
            {currentPage > 3 && (
              <>
                <Link href={buildPageUrl(1)}>
                  <Button variant={1 === currentPage ? "default" : "outline"} size="sm">
                    1
                  </Button>
                </Link>
                {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
              </>
            )}

            {/* Current Page and Neighbors */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
              if (pageNum > totalPages) return null
              
              return (
                <Link key={pageNum} href={buildPageUrl(pageNum)}>
                  <Button 
                    variant={pageNum === currentPage ? "default" : "outline"} 
                    size="sm"
                    className={pageNum === currentPage ? "bg-blue-600 text-white" : ""}
                  >
                    {pageNum}
                  </Button>
                </Link>
              )
            })}

            {/* Last Page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                <Link href={buildPageUrl(totalPages)}>
                  <Button variant={totalPages === currentPage ? "default" : "outline"} size="sm">
                    {totalPages}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Next Button */}
          <Link href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : '#'}>
            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              className="flex items-center"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
} 