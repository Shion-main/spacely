"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
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
  AlertTriangle,
  Home,
  Clock,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Report {
  report_id: string;
  post_id: string;
  reporter_id: string;
  type: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  admin_notes?: string;
  posts: {
    post_id: string;
    user_id: string;
    title: string;
    description: string;
    price: number;
    city: string;
    barangay: string;
    street: string;
    building_name?: string;
    unit_number?: string;
    landlord_name: string;
    contact_number: string;
    social_link: string;
    page_link?: string;
    maps_link?: string;
    approval_status: string;
    created_at: string;
    amenities?: string[];
    room_types: {
      display_name: string;
    };
    rooms: {
      number_of_rooms: number;
      bathroom_type: string;
    };
    photos: Array<{
      file_path: string;
      storage_path?: string;
      is_featured: boolean;
      photo_order: number;
    }>;
    users?: {
      user_id?: string;
      full_name: string;
      phone_number?: string;
    };
    is_deleted: boolean;
  };
  reporter: {
    full_name: string;
    email: string;
  };
}

const REPORT_TYPES = {
  inappropriate_content: 'Inappropriate Content',
  spam: 'Spam',
  fraud: 'Fraud',
  fake_listing: 'Fake Listing',
  harassment: 'Harassment',
  discrimination: 'Discrimination',
  safety_concern: 'Safety Concern',
  other: 'Other'
}

export default function ReportDetailsPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  const params = useParams()
  const router = useRouter()

  const reportId = params?.id as string

  useEffect(() => {
    if (reportId) {
      fetchReportDetails()
    }
  }, [reportId])

  const fetchReportDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/reports/${reportId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report details')
      }
      const data = await response.json()
      setReport(data.report)
    } catch (error) {
      console.error('Error fetching report details:', error)
      toast.error('Failed to load report details')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAction = async (action: 'acknowledge' | 'reject') => {
    if (!report) return

    let statusUpdate: 'resolved' | 'dismissed'
    if (action === 'acknowledge') {
      statusUpdate = 'resolved'
    } else { // 'reject'
      statusUpdate = 'dismissed'
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/reports/${report.report_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: statusUpdate,
          post_id: report.post_id,
          admin_notes: action === 'acknowledge' ? 'Report acknowledged and listing archived.' : 'Report rejected as invalid.'
        })
      })

      if (!response.ok) throw new Error(`Failed to ${action} report`)
      
      toast.success(`Report successfully ${action}ed.`)
      await fetchReportDetails() // Refresh the data
    } catch (error) {
      console.error(`Error ${action}ing report:`, error)
      toast.error(`Failed to ${action} report`)
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdatePostStatus = async (newStatus: 'under_review') => {
    if (!report?.posts?.post_id) return

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/reports/${report.report_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_approval_status: newStatus,
          post_id: report.posts.post_id 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update listing status')
      }

      toast.success('Listing status updated to Under Review.')
      await fetchReportDetails()
    } catch (error) {
      console.error('Error updating post status:', error)
      toast.error('Failed to update listing status.')
    } finally {
      setProcessing(false)
    }
  }

  const nextImage = () => {
    if (report?.posts.photos) {
      setCurrentImageIndex((prev) => 
        prev === report.posts.photos.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (report?.posts.photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? report.posts.photos.length - 1 : prev - 1
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Report Details...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Found</h3>
            <p className="text-gray-600 mb-4">This report may have been deleted or does not exist.</p>
            <Link href="/admin/reports">
              <Button variant="outline" className="mt-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const listing = report.posts

  // A helper function to render amenity icons
  const renderAmenityIcon = (amenity: string) => {
    const iconProps = { className: "w-5 h-5 text-blue-600" }
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi {...iconProps} />
      case 'air conditioning': return <Zap {...iconProps} />
      case 'parking': return <Car {...iconProps} />
      case 'cctv': return <Shield {...iconProps} />
      case 'water included': return <Droplets {...iconProps} />
      default: return <Star {...iconProps} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="p-4 sm:p-6 md:p-8">
        <Button variant="outline" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reports
        </Button>
      </div>

      <main className="p-4 sm:p-6 md:p-8 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Listing Details */}
          <div className="lg:col-span-2">
            {/* Admin Action Buttons */}
            {(report.status === 'pending' || report.status === 'reviewed') && (
              <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
                {listing.approval_status !== 'under_review' && (
                  <Button 
                    onClick={() => handleUpdatePostStatus('under_review')} 
                    disabled={processing}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                    variant="default"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Mark as Under Review
                  </Button>
                )}
                <Button 
                  onClick={() => handleAction('acknowledge')} 
                  disabled={processing}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Acknowledge & Archive
                </Button>
                <Button 
                  onClick={() => handleAction('reject')} 
                  disabled={processing}
                  className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Report
                </Button>
              </div>
            )}
            {processing && <p className="text-center text-sm text-gray-500 mb-4">Processing...</p>}

            {/* Image Gallery */}
            <Card className="mb-6 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {listing.photos && listing.photos.length > 0 ? (
                  <>
                    <img
                      src={listing.photos[currentImageIndex].file_path}
                      alt={`Property image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setIsImageModalOpen(true)}
                    />
                    {listing.photos.length > 1 && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-between p-2">
                          <Button variant="outline" size="icon" onClick={prevImage} className="bg-white/80 hover:bg-white rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={nextImage} className="bg-white/80 hover:bg-white rounded-full">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {listing.photos.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-200">
                    <Home className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </Card>

            {/* Listing Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-bold">{listing.title}</CardTitle>
                    <CardDescription className="text-md text-gray-600 mt-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {listing.street}, {listing.barangay}, {listing.city}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      ₱{listing.price?.toLocaleString() ?? 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">/month</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Room and Bath */}
                <div className="flex items-center space-x-6 border-t pt-6">
                  {listing.rooms && (
                    <div className="flex items-center space-x-2">
                      <Bed className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">{listing.rooms.number_of_rooms} {listing.room_types?.display_name || 'Room'}</span>
                    </div>
                  )}
                  {listing.rooms && (
                    <div className="flex items-center space-x-2">
                      <Bath className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">{listing.rooms.bathroom_type}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xl font-semibold mb-3">About this property</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>
                
                {/* Amenities */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Amenities</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {listing.amenities.map(amenity => (
                        <div key={amenity} className="flex items-center space-x-3">
                          {renderAmenityIcon(amenity)}
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Status
                  </h4>
                  <p className="text-sm text-gray-500">{listing.is_deleted ? 'This listing has been archived.' : 'This listing is currently active.'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Report Details & Actions */}
          <div className="lg:col-span-1 space-y-6">
             <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Reporter Information
                  </h4>
                  <p className="text-sm text-gray-600">{report.reporter.full_name}</p>
                  <p className="text-sm text-gray-600">{report.reporter.email}</p>
                </div>

                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Type
                  </h4>
                  <Badge className="mb-2">
                    {REPORT_TYPES[report.type as keyof typeof REPORT_TYPES] || report.type}
                  </Badge>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.reason}</p>
                </div>

                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    Timeline
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Reported on: {new Date(report.created_at).toLocaleString()}</p>
                    {report.resolved_at && (
                      <p>
                        {report.status === 'resolved' ? 'Resolved' : 'Dismissed'} on:{' '}
                        {new Date(report.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {report.admin_notes && (
                  <div>
                    <h4 className="font-medium flex items-center mb-2">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Notes
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {report.admin_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold">{listing.landlord_name}</p>
                    <p className="text-sm text-gray-500">Owner</p>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{listing.contact_number}</span>
                  </div>
                  {listing.social_link && (
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <a href={listing.social_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Contact via Social Media
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Report Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Current Status
                  </h4>
                  <p className="text-sm text-gray-500 capitalize">
                    {report.status}
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl p-2">
          {listing.photos && listing.photos.length > 0 && (
            <img
              src={listing.photos[currentImageIndex].file_path}
              alt={`Property image ${currentImageIndex + 1}`}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 