"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Home, User, Calendar, FilterX, Search, Eye, RotateCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListingDetailsModal } from '@/components/admin/listing-details-modal'

interface Listing {
  post_id: string
  title: string
  description?: string
  price?: number
  city?: string
  barangay?: string
  street?: string
  created_at: string
  approval_status: string
  is_deleted: boolean
  deleted_at: string | null
  deletion_reason: string | null
  amenities?: string[]
  landlord_name?: string
  contact_number?: string
  social_link?: string
  room_types?: {
    type_name: string
    display_name: string
  }
  rooms?: Array<{
    number_of_rooms: number
    bathroom_type: string
    room_type: string
    has_wifi: boolean
    has_cctv: boolean
    is_airconditioned: boolean
    has_parking: boolean
  }>
  photos?: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
  users: {
    full_name: string
    phone_number?: string
    email?: string
  }
}

type DetailedListing = Listing & {
  description: string
  price: number
  city: string
  barangay: string
  street: string
  amenities?: string[]
  landlord_name: string
  contact_number: string
  social_link?: string
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
  users: {
    full_name: string
    phone_number: string
    email: string
  }
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [processingIds, setProcessingIds] = useState<string[]>([])
  const [selectedListing, setSelectedListing] = useState<DetailedListing | null>(null)

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (monthFilter) params.append('month', monthFilter)
        if (statusFilter !== 'all') params.append('status', statusFilter)
        
        const response = await fetch(`/api/admin/listings?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setListings(data)
        } else {
          toast.error('Failed to fetch listings.')
          setListings([])
        }
      } catch (error) {
        toast.error('An error occurred while fetching listings.')
        setListings([])
      } finally {
        setLoading(false)
      }
    }

    const handler = setTimeout(() => {
      fetchListings()
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, monthFilter, statusFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setMonthFilter('')
    setStatusFilter('all')
  }

  const handleRestore = async (postId: string) => {
    setProcessingIds(prev => [...prev, postId])
    try {
      const response = await fetch(`/api/admin/listings/${postId}/restore`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Listing restored successfully')
        // Refresh the listings
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (monthFilter) params.append('month', monthFilter)
        if (statusFilter !== 'all') params.append('status', statusFilter)
        
        const listingsResponse = await fetch(`/api/admin/listings?${params.toString()}`)
        if (listingsResponse.ok) {
          const data = await listingsResponse.json()
          setListings(data)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to restore listing')
      }
    } catch (error) {
      toast.error('An error occurred while restoring the listing')
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== postId))
    }
  }

  const getStatusBadge = (status: string, isDeleted: boolean) => {
    if (isDeleted) return 'bg-red-100 text-red-800'
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'under_review': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewListing = async (postId: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${postId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedListing(data.post as DetailedListing)
      } else {
        toast.error('Failed to fetch listing details')
      }
    } catch (error) {
      toast.error('An error occurred while fetching listing details')
    }
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <Home className="mr-2" /> All Listings
              </CardTitle>
              <CardDescription>View, manage, and filter all property listings on the platform.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Search by Listing or User</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input 
                  type="text" 
                  placeholder="Search title or user name..."
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Filter by Month</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input 
                  type="month" 
                  value={monthFilter} 
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={clearFilters} className="self-end">
              <FilterX className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          {/* Listings Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing Title</TableHead>
                  <TableHead>Posted By</TableHead>
                  <TableHead>Date Posted</TableHead>
                  <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">Loading listings...</TableCell>
                  </TableRow>
                ) : listings.length > 0 ? (
                  listings.map((listing) => (
                    <TableRow key={listing.post_id}>
                    <TableCell className="font-medium">
                      {listing.title}
                      {listing.is_deleted && listing.deletion_reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reason: {listing.deletion_reason}
                        </p>
                      )}
                    </TableCell>
                      <TableCell>{listing.users?.full_name ?? 'Unknown User'}</TableCell>
                      <TableCell>{format(new Date(listing.created_at), 'PPP')}</TableCell>
                      <TableCell>
                      <Badge className={getStatusBadge(listing.approval_status, listing.is_deleted)}>
                        {listing.is_deleted ? 'Deleted' : listing.approval_status}
                        </Badge>
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewListing(listing.post_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {listing.is_deleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(listing.post_id)}
                            disabled={processingIds.includes(listing.post_id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCw className={`h-4 w-4 ${processingIds.includes(listing.post_id) ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">No listings found for the selected filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {selectedListing && (
        <ListingDetailsModal
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          listing={selectedListing as DetailedListing}
        />
      )}
    </div>
  )
} 