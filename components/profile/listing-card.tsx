"use client"

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, Edit, Trash2, Clock, CheckCircle, XCircle, Info, Archive, RotateCw, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

interface Listing {
  post_id: string
  title: string
  price: number
  approval_status: string
  photos: Array<{ file_path: string }>
  room_types: { display_name: string }
  rejection_reason?: string | null
  is_deleted: boolean
  deleted_at?: string | null
  deletion_reason?: string | null
}

interface ListingCardProps {
  listing: Listing
  onDelete: (postId: string) => void
  onRestore: (postId: string) => void
}

const getFeaturedImage = (photos: any[]) => {
  if (!photos || photos.length === 0) return '/images/placeholder-property.svg';
  const featured = photos.find((p: any) => p.is_featured) || photos[0];
  return featured?.file_path || '/images/placeholder-property.svg';
}

const calculateDaysLeft = (deletedAt: string | null | undefined): number => {
  if (!deletedAt) return 30;
  const deleteDate = new Date(deletedAt);
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const timeDiff = deleteDate.getTime() + thirtyDays - new Date().getTime();
  return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onDelete, onRestore }) => {
  const featuredImage = getFeaturedImage(listing.photos)
  const daysLeft = calculateDaysLeft(listing.deleted_at)

  let statusBadge: React.ReactNode;
  
  if (listing.is_deleted) {
    if (listing.approval_status === 'archived') {
      statusBadge = <Badge variant="destructive" className="absolute top-2 right-2 flex items-center"><Archive className="mr-1 h-3 w-3" /> Deleted by Admin</Badge>;
    } else {
      statusBadge = <Badge variant="destructive" className="absolute top-2 right-2 flex items-center"><Archive className="mr-1 h-3 w-3" /> Deletes in {daysLeft} days</Badge>;
    }
  } else {
    switch (listing.approval_status) {
      case 'approved':
        statusBadge = <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 flex items-center"><CheckCircle className="mr-1 h-3 w-3" /> Approved</Badge>;
        break;
      case 'pending':
        statusBadge = <Badge variant="secondary" className="absolute top-2 right-2 flex items-center"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
        break;
      case 'under_review':
        statusBadge = <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 flex items-center text-white"><Shield className="mr-1 h-3 w-3" /> Under Review</Badge>;
        break;
      case 'rejected':
        statusBadge = <Badge variant="destructive" className="absolute top-2 right-2 flex items-center"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
        break;
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative">
        <img src={featuredImage} alt={listing.title} className="w-full h-48 object-cover" />
        {statusBadge}
        <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent w-full p-4">
          <p className="text-white font-bold text-lg truncate">{listing.title}</p>
        </div>
      </div>
      <CardContent className="p-4 flex flex-col flex-grow">
        {listing.approval_status === 'rejected' && listing.rejection_reason && (
          <Alert variant="destructive" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription>{listing.rejection_reason}</AlertDescription>
          </Alert>
        )}
        {listing.is_deleted && listing.deletion_reason && (
          <Alert variant="destructive" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Deletion Reason</AlertTitle>
            <AlertDescription>{listing.deletion_reason}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
          <p>{listing.room_types?.display_name || 'N/A'}</p>
          <p className="font-bold text-lg text-blue-600">₱{listing.price.toLocaleString()}</p>
        </div>
        
        {listing.is_deleted ? (
          listing.approval_status === 'archived' ? (
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full" disabled>
                <RotateCw className="mr-2 h-4 w-4" /> Restore Disabled
              </Button>
              <a href="mailto:spacely.main@gmail.com?subject=Listing%20Appeal%20Request&body=Hello%20Admin,%20I%20would%20like%20to%20appeal%20the%20deletion%20of%20my%20listing%20(ID:%20${listing.post_id})." className="w-full">
                <Button variant="outline" className="w-full">
                  Appeal to Admin
                </Button>
              </a>
            </div>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => onRestore(listing.post_id)}
            >
              <RotateCw className="mr-2 h-4 w-4" /> Restore
            </Button>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Link href={`/listings/${listing.post_id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" /> View
              </Button>
            </Link>
            <Link href={`/listings/edit/${listing.post_id}`} className="flex-1">
              <Button variant="default" className="w-full">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button variant="destructive" className="flex-1" onClick={() => onDelete(listing.post_id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 