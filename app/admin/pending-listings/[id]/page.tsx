"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAdminAuth } from '@/components/providers/admin-auth-provider'
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageSquare,
  ExternalLink,
  Check,
  X,
  Archive,
  Clock,
  Wifi,
  Car,
  Camera,
  AirVent,
  Bath,
  Bed,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { MapView } from '@/components/listings/map-view'

interface PendingListing {
  post_id: string
  title: string
  description: string
  price: number
  city: string
  barangay: string
  street: string
  approval_status: string
  created_at: string
  amenities: string[]
  users: {
    full_name: string
    phone_number: string
    email: string
    role: string
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
  building_name?: string
  unit_number?: string
  landlord_name: string
  contact_number: string
  social_link: string
  page_link?: string
  maps_link?: string
  latitude?: number | null
  longitude?: number | null
}

export default function PendingListingDetailsPage() {
  const [listing, setListing] = useState<PendingListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const { isAdmin, loading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/auth')
      return
    }

    if (isAdmin) {
      fetchListingDetails()
    }
  }, [isAdmin, authLoading, router, postId])

  const fetchListingDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/listings/${postId}`)
      if (response.ok) {
        const data = await response.json()
        setListing(data.post)
      } else {
        toast.error('Failed to fetch listing details')
        router.push('/admin/pending-listings')
      }
    } catch (error) {
      console.error('Error fetching listing details:', error)
      toast.error('Failed to fetch listing details')
      router.push('/admin/pending-listings')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'approve' | 'reject' | 'archive', reason?: string) => {
    setActionLoading(true)

    try {
      const response = await fetch(`/api/admin/listings/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...(reason && { reason })
        })
      })

      if (response.ok) {
        toast.success(`Post ${action}d successfully`)
        router.push('/admin/pending-listings')
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} post`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} post`)
    } finally {
      setActionLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (!price) return 'Price on request'
    return `₱${price.toLocaleString()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'approved': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'archived': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      case 'archived': return <Archive className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading || !listing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing details...</p>
        </div>
      </div>
    )
  }

  const mainRoom = listing.rooms[0]
  const sortedPhotos = [...listing.photos].sort((a, b) => (a.photo_order || 0) - (b.photo_order || 0))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link href="/admin/pending-listings" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Pending Listings
      </Link>

      {/* Status and Actions */}
      <div className="flex items-center justify-between mb-6">
        <Badge className={`${getStatusColor(listing.approval_status)} text-sm px-3 py-1`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(listing.approval_status)}
            <span className="capitalize">{listing.approval_status}</span>
          </div>
        </Badge>

        {listing.approval_status === 'pending' && (
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const reason = prompt('Rejection reason (optional):')
                handleAction('reject', reason || undefined)
              }}
              disabled={actionLoading}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="aspect-video relative">
                <img
                  src={sortedPhotos[currentImageIndex]?.file_path || '/images/placeholder-property.svg'}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                {sortedPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === 0 ? sortedPhotos.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === sortedPhotos.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {sortedPhotos.length > 0 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {sortedPhotos.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {sortedPhotos.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {sortedPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        currentImageIndex === index ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={photo.file_path}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{listing.title}</h2>
                <div className="flex items-center text-gray-600 mt-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>
                    {listing.building_name && `${listing.building_name}, `}
                    {listing.unit_number && `Unit ${listing.unit_number}, `}
                    {listing.street}, {listing.barangay}, {listing.city}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-blue-600">{formatPrice(listing.price)}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Room Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center text-gray-600">
                    <Bed className="w-4 h-4 mr-2 text-blue-500" />
                    <span>{mainRoom.number_of_rooms} rooms</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Bath className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="capitalize">{mainRoom.bathroom_type}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium text-blue-500 mr-2">Type:</span>
                    <span className="capitalize">{mainRoom.room_type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Amenities Section */}
              {listing.amenities && listing.amenities.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity, index) => (
                      <div 
                        key={index} 
                        className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-900">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* Location Map */}
              {listing.latitude && listing.longitude && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="w-full h-80 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <MapView 
                      initialLat={listing.latitude} 
                      initialLng={listing.longitude}
                      readonly={true}
                    />
                  </div>
                  {listing.maps_link && (
                    <div className="mt-3">
                      <a
                        href={listing.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Contact Info */}
        <div className="space-y-6">
          {/* Poster Info */}
          <Card>
            <CardHeader>
              <CardTitle>Poster Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {listing.users.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{listing.users.full_name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{listing.users.role}</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex items-center text-gray-600">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span className="text-sm">{listing.users.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span className="text-sm">{listing.users.phone_number}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landlord Info */}
          <Card>
            <CardHeader>
              <CardTitle>Landlord Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Landlord Name</p>
                <p className="font-medium text-gray-900">{listing.landlord_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Number</p>
                <p className="font-medium text-gray-900">{listing.contact_number}</p>
              </div>
              {listing.social_link && (
                <div>
                  <p className="text-sm text-gray-600">Social Media</p>
                  <a
                    href={listing.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Profile
                  </a>
                </div>
              )}
              {listing.page_link && (
                <div>
                  <p className="text-sm text-gray-600">Business Page</p>
                  <a
                    href={listing.page_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Visit Page
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listing Details */}
          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Posted on</p>
                <p className="font-medium text-gray-900">
                  {new Date(listing.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Property Type</p>
                <p className="font-medium text-gray-900">{listing.room_types.display_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Photos</p>
                <p className="font-medium text-gray-900">{listing.photos.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 