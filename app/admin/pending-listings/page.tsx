"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminAuth } from '@/components/providers/admin-auth-provider'
import {
  Search,
  Filter,
  Eye,
  Check,
  X,
  Archive,
  Clock,
  MapPin,
  User,
  Home,
  Calendar,
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
  XCircle,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import ReasonModal from '@/components/admin/reason-modal'

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
  amenities?: string[]
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
}

export default function PendingListingsPage() {
  const [listings, setListings] = useState<PendingListing[]>([])
  const [filteredListings, setFilteredListings] = useState<PendingListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string[]>([])
  const { isAdmin, loading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [modalInfo, setModalInfo] = useState<{id:string;action:'reject'|'archive'}|null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/auth')
      return
    }

    if (isAdmin) {
      fetchPendingListings()
    }
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    let filtered = listings

    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.barangay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.users.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.approval_status === statusFilter)
    }

    setFilteredListings(filtered)
  }, [listings, searchTerm, statusFilter])

  const fetchPendingListings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/pending-listings')
      if (response.ok) {
        const data = await response.json()
        setListings(data.posts || [])
      } else {
        toast.error('Failed to fetch pending listings')
      }
    } catch (error) {
      console.error('Error fetching pending listings:', error)
      toast.error('Failed to fetch pending listings')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (postId: string, action: 'approve' | 'reject' | 'archive', reason?: string) => {
    setActionLoading(prev => [...prev, postId])

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
        fetchPendingListings()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} post`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} post`)
    } finally {
      setActionLoading(prev => prev.filter(id => id !== postId))
    }
  }

  const formatPrice = (price: number) => {
    if (!price) return 'Price on request'
    return `₱${price.toLocaleString()}`
  }

  const getFeaturedImage = (photos: PendingListing['photos']) => {
    if (!photos || photos.length === 0) {
      return '/images/placeholder-property.svg'
    }

    const featuredPhoto = photos.find(photo => photo.is_featured)
    if (featuredPhoto?.file_path) {
      return featuredPhoto.file_path
    }
    
    const firstPhoto = photos.sort((a, b) => (a.photo_order || 0) - (b.photo_order || 0))[0]
    return firstPhoto?.file_path || '/images/placeholder-property.svg'
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
      case 'pending': return <Clock className="w-3 h-3" />
      case 'approved': return <CheckCircle className="w-3 h-3" />
      case 'rejected': return <XCircle className="w-3 h-3" />
      case 'archived': return <Archive className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pending Listings</h1>
            <p className="text-gray-500">
              Review, approve, or reject new listings submitted by users.
            </p>
          </div>
          <Button onClick={fetchPendingListings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p>Loading listings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const featuredImage = getFeaturedImage(listing.photos)
              const mainRoom = listing.rooms[0]
              const amenities = listing.amenities?.slice(0, 4) || []

              return (
                <Card key={listing.post_id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200/80 bg-white/50 backdrop-blur-xl">
                  {/* Image Section */}
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={featuredImage}
                      alt={listing.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={`${getStatusColor(listing.approval_status)} border backdrop-blur-md`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(listing.approval_status)}
                          <span className="capitalize">{listing.approval_status}</span>
                        </div>
                      </Badge>
                    </div>

                    {/* Property Type Badge */}
                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 backdrop-blur-md">
                      {listing.room_types.display_name}
                    </Badge>

                    {/* Photos Count */}
                    {listing.photos.length > 1 && (
                      <Badge variant="secondary" className="absolute bottom-3 right-3 bg-black/60 text-white border-0 backdrop-blur-md">
                        +{listing.photos.length - 1} photos
                      </Badge>
                    )}
                  </div>

                  {/* Content Section */}
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                        {listing.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                          {formatPrice(listing.price)}
                          <span className="text-sm font-normal text-gray-600 ml-1">/month</span>
                        </p>
                        <div className="text-sm text-gray-500">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
                      <span className="text-sm line-clamp-1">
                        {listing.street}, {listing.barangay}, {listing.city}
                      </span>
                    </div>

                    {/* Room Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Bed className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-sm">{mainRoom.number_of_rooms} Room{mainRoom.number_of_rooms > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Bath className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-sm capitalize">{mainRoom.bathroom_type} Bath</span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {amenities.map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-gray-100/80 text-gray-700 backdrop-blur-sm">
                              {amenity}
                            </Badge>
                          ))}
                          {(listing.amenities?.length ?? 0) > 4 && (
                            <Badge variant="secondary" className="text-xs bg-gray-100/80 text-gray-700 backdrop-blur-sm">
                              +{(listing.amenities?.length ?? 0) - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Poster Info */}
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {listing.users.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{listing.users.full_name}</p>
                          <p className="text-xs text-gray-600 capitalize">{listing.users.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-blue-600 hover:bg-blue-50"
                        onClick={() => router.push(`/admin/pending-listings/${listing.post_id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {listing.approval_status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(listing.post_id, 'approve')}
                            disabled={actionLoading.includes(listing.post_id)}
                            className="flex-1 text-emerald-600 border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalInfo({ id: listing.post_id, action: 'reject' })}
                            disabled={actionLoading.includes(listing.post_id)}
                            className="flex-1 text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {listing.approval_status !== 'pending' && (
                        <div className="flex-1 text-center">
                          <Badge className={getStatusColor(listing.approval_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(listing.approval_status)}
                              <span className="capitalize">{listing.approval_status}</span>
                            </div>
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      {modalInfo && (
        <ReasonModal
          open={Boolean(modalInfo)}
          actionLabel={modalInfo.action === 'reject' ? 'Reject' : 'Archive'}
          onClose={() => setModalInfo(null)}
          onSubmit={(reason) => {
            handleAction(modalInfo.id, modalInfo.action, reason || undefined)
            setModalInfo(null)
          }}
        />
      )}
    </div>
  )
} 