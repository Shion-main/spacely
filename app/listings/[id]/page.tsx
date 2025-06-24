"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Heart, 
  Share2, 
  Wifi, 
  Car, 
  Shield, 
  Zap, 
  Droplets,
  Bath,
  Bed,
  Star,
  ChevronLeft,
  ChevronRight,
  User,
  Flag,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Listing {
  post_id: string
  user_id: string
  title: string
  description: string
  price: number
  city: string
  barangay: string
  street: string
  building_name?: string
  unit_number?: string
  landlord_name: string
  contact_number: string
  social_link: string
  page_link?: string
  maps_link?: string
  approval_status: string
  created_at: string
  amenities?: string[]
  room_types: {
    display_name: string
  }
  rooms: {
    number_of_rooms: number
    bathroom_type: string
    room_type: string
  }[]
  photos: Array<{
    file_path: string
    storage_path?: string
    is_featured: boolean
    photo_order: number
  }>
  users?: {
    user_id?: string
    full_name: string
    phone_number?: string
  }
  is_deleted: boolean
  reports?: Array<{
    report_id: string
    post_id: string
    report_type: string
    description: string
    status: string
    created_at: string
  }>
}

export default function ListingDetailsPage() {
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()

  const listingId = params?.id as string

  useEffect(() => {
    if (listingId) {
      fetchListing()
      if (user) {
        checkFavoriteStatus()
      }
    }
  }, [listingId, user])

  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch listing')
      }
      const data = await response.json()
      setListing(data)
    } catch (error) {
      console.error('Error fetching listing:', error)
      toast.error('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites/${listingId}`)
      if (response.ok) {
        const data = await response.json()
        setIsFavorite(data.isFavorite)
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to add favorites')
      router.push('/auth/login')
      return
    }

    // Prevent owners from favoriting their own posts
    if (listing && listing.user_id === user.id) {
      toast.error('You cannot favorite your own listing')
      return
    }

    try {
      const response = await fetch(`/api/favorites/${listingId}`, {
        method: isFavorite ? 'DELETE' : 'POST'
      })

      if (response.ok) {
        setIsFavorite(!isFavorite)
        toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites')
      }
    } catch (error) {
      toast.error('Failed to update favorites')
    }
  }

  const handleReport = async () => {
    if (!user) {
      toast.error('Please log in to report listings')
      router.push('/auth/login')
      return
    }

    if (!reportType || !reportDescription.trim()) {
      toast.error('Please select a report type and provide a description')
      return
    }

    if (reportDescription.trim().length < 10) {
      toast.error('Description must be at least 10 characters long')
      return
    }

    setIsSubmittingReport(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: listingId,
          report_type: reportType,
          description: reportDescription.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Report submitted successfully. Our team will review it.')
        setIsReportModalOpen(false)
        setReportType('')
        setReportDescription('')
      } else {
        toast.error(data.error || 'Failed to submit report')
      }
    } catch (error) {
      toast.error('Failed to submit report')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const shareListing = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: `Check out this property: ${listing?.title}`,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const nextImage = () => {
    if (listing?.photos) {
      setCurrentImageIndex((prev) => 
        prev === listing.photos.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (listing?.photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listing.photos.length - 1 : prev - 1
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing...</p>
        </div>
      </div>
    )
  }

  if (!listing || listing.is_deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Listing Not Found</h1>
          <p className="text-gray-600 mb-6">
            This listing may have been removed by the owner or does not exist.
          </p>
          <Button onClick={() => router.push('/listings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Button>
        </div>
      </div>
    )
  }

  const sortedPhotos = listing.photos.sort((a, b) => a.photo_order - b.photo_order)
  const amenityIcons = {
    wifi: Wifi,
    cctv: Shield,
    aircon: Zap,
    parking: Car,
    electricity: Zap,
    water: Droplets
  }

      return (
        <div className="min-h-screen bg-gray-50">
      {/* Add notice for posts under review */}
      {listing?.reports?.some(report => report.status === 'reviewed') && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                This listing is currently under review by our admin team.
              </p>
            </div>
          </div>
        </div>
      )}

                    <main className="flex-1 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Back to Listings Navigation */}
              <div className="mb-6">
                <Link href="/listings">
                  <Button variant="outline" className="gap-2 hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Listings
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Image Gallery */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8">
                    <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                      {sortedPhotos.length > 0 ? (
                        <>
                          <img
                            src={sortedPhotos[currentImageIndex]?.file_path}
                            alt={`${listing.title} - Photo ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => setIsImageModalOpen(true)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/placeholder-property.svg'
                            }}
                          />
                          
                          {/* Navigation Arrows */}
                          {sortedPhotos.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-200 z-10"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-200 z-10"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {/* Photo Counter */}
                          <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm text-sm">
                            {currentImageIndex + 1} / {sortedPhotos.length}
                          </div>

                          {/* Click to expand hint */}
                          <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm text-xs">
                            Click to expand
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src="/images/placeholder-property.svg"
                            alt="No photos available"
                            className="w-32 h-32 opacity-50"
                          />
                        </div>
                      )}
                    </div>

                    {/* Photo thumbnails */}
                    {sortedPhotos.length > 1 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {sortedPhotos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                              currentImageIndex === index 
                                ? 'border-blue-500 ring-2 ring-blue-200' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <img
                              src={photo.file_path}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/placeholder-property.svg'
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2">
              <Card className="shadow-xl bg-white/80 backdrop-blur-lg">
                <CardContent className="p-6 space-y-6">
                  {/* Title and Price */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                      <div className="flex items-center mt-2 space-x-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {listing.room_types.display_name}
                        </Badge>
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Available
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Action Buttons - Only show for non-owners */}
                      {user && listing.user_id !== user.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 hover:bg-gray-50"
                            onClick={toggleFavorite}
                          >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                            {isFavorite ? 'Saved' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={() => setIsReportModalOpen(true)}
                          >
                            <Flag className="w-4 h-4" />
                            Report
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 hover:bg-gray-50"
                        onClick={shareListing}
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                      <div className="text-left sm:text-right sm:ml-4 w-full sm:w-auto">
                        <p className="text-3xl font-bold text-blue-600">₱{listing.price.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">per month</p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start space-x-2 text-gray-600">
                    <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{listing.street}</p>
                      <p>{listing.barangay}, {listing.city}</p>
                      {listing.building_name && (
                        <p className="text-sm text-gray-500">
                          {listing.building_name}
                          {listing.unit_number && ` • Unit ${listing.unit_number}`}
                        </p>
                      )}
                    </div>
                  </div>

                                    {/* Room Details */}
                  {(() => {
                    const room = listing.rooms && listing.rooms.length > 0 ? listing.rooms[0] : null;
                    
                    return (
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <Bed className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                          <p className="font-medium">{room?.number_of_rooms || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Room{(room?.number_of_rooms || 0) > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-center">
                          <Bath className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                          <p className="font-medium capitalize">{room?.bathroom_type || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Bathroom</p>
                        </div>
                        <div className="text-center">
                          <Star className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                          <p className="font-medium capitalize">
                            {room?.room_type === 'bare' && 'Bare'}
                            {room?.room_type === 'semi_furnished' && 'Semi Furnished'}
                            {room?.room_type === 'furnished' && 'Furnished'}
                            {(!room?.room_type || room?.room_type === '' || room?.room_type === null) && 'Contact Owner'}
                          </p>
                          <p className="text-sm text-gray-600">Furnishing</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Amenities */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Amenities & Features</h2>
                    {(() => {
                      const amenityIcons: { [key: string]: React.ComponentType<any> } = {
                        'WiFi': Wifi,
                        'CCTV': Shield,
                        'Air Conditioning': Zap,
                        'Parking': Car,
                        'Own Electric Meter': Zap,
                        'Own Water Meter': Droplets
                      };
                      
                      if (!listing.amenities || listing.amenities.length === 0) {
                        return (
                          <p className="text-gray-600 italic">No specific amenities listed for this property.</p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {listing.amenities.map((amenity, index) => {
                            const IconComponent = amenityIcons[amenity] || Shield;
                            return (
                              <Badge 
                                key={index}
                                variant="outline"
                                className="flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-200 text-sm font-normal"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                {amenity}
                              </Badge>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">About this property</h2>
                    <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Move to the main content area */}
            </div>
          </div>
      </main>

          {/* Contact and Action Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="lg:col-span-3">
              <Card className="shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-xl">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{listing.landlord_name}</p>
                        <p className="text-sm text-gray-600">Property Owner</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => window.open(`tel:${listing.contact_number}`)}
                    >
                      <Phone className="w-4 h-4" />
                      {listing.contact_number}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => window.open(listing.social_link, '_blank')}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message on Social
                    </Button>

                    {listing.page_link && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => window.open(listing.page_link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Visit Page
                      </Button>
                    )}

                    {listing.maps_link && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => window.open(listing.maps_link, '_blank')}
                      >
                        <MapPin className="w-4 h-4" />
                        View on Maps
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Report Modal */}
        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Report Listing
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Report Type
                </label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="fake_listing">Fake Listing</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="discrimination">Discrimination</SelectItem>
                    <SelectItem value="safety_concern">Safety Concern</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide details about why you're reporting this listing..."
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {reportDescription.length}/500 characters (minimum 10 required)
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReportModalOpen(false)
                    setReportType('')
                    setReportDescription('')
                  }}
                  className="flex-1"
                  disabled={isSubmittingReport}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReport}
                  disabled={!reportType || reportDescription.trim().length < 10 || isSubmittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Screen Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black">
            <div className="relative w-full h-full flex items-center justify-center">
              {sortedPhotos.length > 0 && (
                <>
                  <img
                    src={sortedPhotos[currentImageIndex]?.file_path}
                    alt={`${listing.title} - Photo ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[95vh] object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/placeholder-property.svg'
                    }}
                  />
                  
                  {/* Navigation Arrows in Modal */}
                  {sortedPhotos.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 z-10"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 z-10"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Photo Counter in Modal */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1} / {sortedPhotos.length}
                  </div>

                  {/* Close hint */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-2 rounded-full backdrop-blur-sm text-sm">
                    Press ESC or click outside to close
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  )
} 