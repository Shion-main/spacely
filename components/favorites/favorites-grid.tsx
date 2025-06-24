"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, BedDouble, User2, Bath } from 'lucide-react'
import toast from 'react-hot-toast'

// The Listing interface should be defined here or imported from a shared types file
// To keep this focused, I'll redefine it. A real app should share this.
interface Listing {
  post_id: string;
  title: string;
  price: number;
  city: string;
  barangay: string;
  users: { full_name: string };
  room_types: { display_name: string };
  rooms: Array<{ number_of_rooms: number; bathroom_type: string }>;
  photos: Array<{ file_path: string; is_featured: boolean }>;
}

interface FavoritesGridProps {
  initialFavorites: Listing[]
}

export function FavoritesGrid({ initialFavorites }: FavoritesGridProps) {
  const [favorites, setFavorites] = useState(initialFavorites)

  const removeFavorite = async (postId: string) => {
    try {
      const response = await fetch(`/api/favorites/${postId}`, {
        method: 'POST', // Using POST to toggle
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const result = await response.json()
        if (!result.isFavorited) {
          setFavorites(prev => prev.filter(fav => fav.post_id !== postId))
          toast.success('Removed from favorites')
        }
      } else {
        toast.error('Failed to update favorites')
      }
    } catch (error) {
      toast.error('An error occurred.')
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
        <p className="text-gray-600 mb-4">
          Start saving properties you're interested in by clicking the heart icon.
        </p>
        <Link href="/listings">
          <Button>Browse Listings</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((listing) => {
        const featuredPhoto = listing.photos?.find(photo => photo.is_featured) || listing.photos?.[0]
        const photoUrl = featuredPhoto?.file_path || '/images/placeholder-property.svg'
        const mainRoom = listing.rooms?.[0]

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
              <Badge className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white shadow-md">
                {listing.room_types.display_name}
              </Badge>
              {listing.photos.length > 1 && (
                <Badge variant="secondary" className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white shadow-md">
                  +{listing.photos.length - 1} photos
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm text-red-500 hover:text-red-600"
                onClick={() => removeFavorite(listing.post_id)}
              >
                <Heart className="w-[18px] h-[18px] fill-current" />
              </Button>
            </div>
            <CardContent className="p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                  {listing.title}
                </h3>
                <p className="text-xl font-bold text-blue-600">
                  ₱{listing.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-600 ml-1">/month</span>
                </p>
              </div>
              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
                <span className="text-sm line-clamp-1">
                  {listing.barangay}, {listing.city}
                </span>
              </div>
              {mainRoom && (
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  {mainRoom.number_of_rooms && (
                    <div className="flex items-center">
                      <BedDouble className="w-4 h-4 mr-2 text-blue-500" />
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
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <User2 className="w-4 h-4 mr-2 text-blue-500" />
                <span>By {listing.users?.full_name || 'Unknown User'}</span>
              </div>
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
  )
} 