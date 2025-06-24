import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import {
  Home,
  MapPin,
  User,
  Calendar,
  Wifi,
  Car,
  Camera,
  AirVent,
  Bath,
  Bed,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  AlertCircle,
  Phone,
  Mail,
  Building,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListingDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  listing: {
    post_id: string
    title: string
    description: string
    price: number
    city: string
    barangay: string
    street: string
    approval_status: string
    created_at: string
    is_deleted: boolean
    deleted_at: string | null
    deletion_reason: string | null
    amenities?: string[]
    landlord_name: string
    contact_number: string
    social_link?: string
    users: {
      full_name: string
      phone_number: string
      email: string
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
}

export function ListingDetailsModal({ isOpen, onClose, listing }: ListingDetailsModalProps) {
  const getStatusBadge = (status: string, isDeleted: boolean) => {
    if (isDeleted) return { color: 'bg-red-100 text-red-800', icon: <Archive className="w-4 h-4 mr-1" /> }
    switch (status) {
      case 'approved':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4 mr-1" /> }
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4 mr-1" /> }
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4 mr-1" /> }
      case 'under_review':
        return { color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="w-4 h-4 mr-1" /> }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-4 h-4 mr-1" /> }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const mainRoom = listing.rooms?.[0]
  const statusBadge = getStatusBadge(listing.approval_status, listing.is_deleted)
  const featuredImage = listing.photos?.find(photo => photo.is_featured)?.file_path || listing.photos?.[0]?.file_path || '/images/placeholder-property.svg'
  
  const allAmenities = [
    ...(mainRoom?.has_wifi ? [{ name: 'WiFi', icon: <Wifi className="w-5 h-5 mr-2" /> }] : []),
    ...(mainRoom?.has_cctv ? [{ name: 'CCTV', icon: <Camera className="w-5 h-5 mr-2" /> }] : []),
    ...(mainRoom?.is_airconditioned ? [{ name: 'Air Conditioning', icon: <AirVent className="w-5 h-5 mr-2" /> }] : []),
    ...(mainRoom?.has_parking ? [{ name: 'Parking', icon: <Car className="w-5 h-5 mr-2" /> }] : []),
    ...(listing.amenities || []).map(amenity => ({ name: amenity, icon: <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> }))
  ]

  if (!mainRoom) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p>This listing has no room data and cannot be displayed.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold">{listing.title}</span>
            <Badge className={statusBadge.color}>
              <div className="flex items-center">
                {statusBadge.icon}
                {listing.is_deleted ? 'Deleted' : listing.approval_status}
              </div>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Column - Images and Basic Info */}
          <div>
            <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
              <img
                src={featuredImage}
                alt={listing.title}
                className="object-cover w-full h-full"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {listing.photos?.slice(0, 4).map((photo, index) => (
                <div key={index} className="aspect-square rounded-md overflow-hidden">
                  <img
                    src={photo.file_path}
                    alt={`${listing.title} - photo ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>

            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Building className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="font-medium">{listing.room_types.display_name}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-500 mr-2" />
                    <span>{listing.street}, {listing.barangay}, {listing.city}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-500 mr-2" />
                    <span>Posted on {format(new Date(listing.created_at), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center text-xl font-bold text-green-600">
                    {formatPrice(listing.price)}/month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Owner Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Owner Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-500 mr-2" />
                    <span>{listing.landlord_name || 'Name not provided'}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-500 mr-2" />
                    <span>{listing.contact_number || 'Contact not provided'}</span>
                  </div>
                  {listing.social_link && (
                    <div className="flex items-center mt-2">
                      <ExternalLink className="w-5 h-5 text-gray-500 mr-2" />
                      <a
                        href={listing.social_link.startsWith('http') ? listing.social_link : `mailto:${listing.social_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button variant="outline" size="sm">
                          View Contact / Social Page
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Room Details */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Room Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Bed className="w-5 h-5 text-gray-500 mr-2" />
                    <span>{mainRoom.number_of_rooms} {mainRoom.number_of_rooms > 1 ? 'Rooms' : 'Room'}</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="w-5 h-5 text-gray-500 mr-2" />
                    <span>{mainRoom.bathroom_type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                {allAmenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allAmenities.map((amenity, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2 text-xs font-medium text-gray-900">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="truncate">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No amenities listed.</p>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </CardContent>
            </Card>

            {/* Deletion Info (if deleted) */}
            {listing.is_deleted && listing.deleted_at && (
              <Card className="border-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-700">Listing Deleted</h3>
                      <p className="text-sm">
                        This listing was deleted on {format(new Date(listing.deleted_at), 'MMMM d, yyyy')}.
                      </p>
                      {listing.deletion_reason && (
                        <p className="text-sm mt-1">
                          <strong>Reason:</strong> {listing.deletion_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 