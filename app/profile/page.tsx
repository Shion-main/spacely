"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  GraduationCap, 
  Edit, 
  Plus, 
  Heart, 
  Home, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Archive,
  Info,
  Trash
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ListingCard } from '@/components/profile/listing-card'

interface UserListing {
  post_id: string
  title: string
  price: number
  city: string
  approval_status: string
  created_at: string
  photos: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
  room_types: {
    display_name: string
  }
  rejection_reason: string | null
  is_deleted: boolean
  archived: boolean
  deleted_at: string | null
}

interface FavoriteListing {
  post_id: string
  title: string
  price: number
  city: string
  created_at: string
  photos: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
  room_types: {
    display_name: string
  }
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'recycle_bin'>('listings')
  const [activeListings, setActiveListings] = useState<UserListing[]>([])
  const [deletedListings, setDeletedListings] = useState<UserListing[]>([])
  const [favoriteListings, setFavoriteListings] = useState<FavoriteListing[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    fetchUserData()
  }, [user, router])

  // Refresh data when URL search params change (e.g., when returning from edit page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('refresh') === 'true') {
      fetchUserData()
      // Clean up the URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Refresh data when coming back to the page (e.g., after editing)
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData()
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const getFeaturedImage = (photos: any[]) => {
    if (!photos || photos.length === 0) {
      return '/images/placeholder-property.svg';
    }
    
    const featured = photos.find(p => p.is_featured) || photos.sort((a, b) => (a.photo_order || 0) - (b.photo_order || 0))[0];
    
    if (!featured || !featured.file_path) {
      return '/images/placeholder-property.svg';
    }
    
    // The API now handles URL transformation, so we can use file_path directly
    return featured.file_path;
  }

  const fetchUserData = async () => {
    setLoading(true)
    try {
      // Fetch user's listings
      const listingsResponse = await fetch('/api/profile/listings', {
        cache: 'no-store', 
      })
      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json()

        setActiveListings(listingsData.listings.filter((l: UserListing) => !l.is_deleted))
        setDeletedListings(listingsData.listings.filter((l: UserListing) => l.is_deleted))
      } else {
        toast.error('Failed to load your listings.')
        setActiveListings([])
        setDeletedListings([])
      }

      // Fetch user's favorites
      const favoritesResponse = await fetch('/api/profile/favorites', {
        cache: 'no-store',
      })
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json()
        setFavoriteListings(favoritesData.favorites)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast.error('An unexpected error occurred while fetching your data.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <MoreHorizontal className="w-4 h-4" />
    }
  }

  const handleDelete = async (postId: string) => {
    const originalActive = [...activeListings];
    const listingToDelete = activeListings.find(l => l.post_id === postId);
    
    if (!listingToDelete) {
      toast.error('Listing not found');
      return;
    }

    setActiveListings(activeListings.filter(l => l.post_id !== postId));

    try {
      const response = await fetch(`/api/listings/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        toast.success('Listing deleted successfully!');
        setDeletedListings([...deletedListings, { ...listingToDelete, is_deleted: true, deleted_at: new Date().toISOString(), rejection_reason: null }]);
      } else {
        const data = await response.json();
        toast.error(`Failed to delete listing: ${data.error}`);
        setActiveListings(originalActive); // Revert on failure
      }
    } catch (error) {
      toast.error('An unexpected error occurred during deletion.');
      setActiveListings(originalActive); // Revert on failure
    }
  };

  const handleRestore = async (postId: string) => {
    const originalDeleted = [...deletedListings];
    setDeletedListings(deletedListings.filter(l => l.post_id !== postId));

    try {
      const response = await fetch(`/api/listings/${postId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Listing restored successfully!');
        const restoredListing = originalDeleted.find(l => l.post_id === postId);
        if (restoredListing) {
          setActiveListings([...activeListings, { ...restoredListing, is_deleted: false, deleted_at: null }]);
        }
      } else {
        const data = await response.json();
        toast.error(`Failed to restore listing: ${data.error}`);
        setDeletedListings(originalDeleted); // Revert on failure
      }
    } catch (error) {
      toast.error('An unexpected error occurred during restoration.');
      setDeletedListings(originalDeleted); // Revert on failure
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="flex-1">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                <p className="text-gray-600">{profile.email}</p>
                <Badge variant="outline" className="mt-1 capitalize">{profile.role}</Badge>
              </div>
            </div>
            <div className="flex space-x-3 sm:self-auto self-start">
              <Link href="/profile/edit">
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>This information is private and will not be shared publicly.</CardDescription>
                </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><User className="w-5 h-5 mr-3 text-gray-500"/>Personal Information</h3>
                    <div className="text-sm">
                      <p className="text-gray-500">ID Number</p>
                      <p className="font-medium">{profile.id_number}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Year Level</p>
                      <p className="font-medium">{profile.year_level || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><Mail className="w-5 h-5 mr-3 text-gray-500"/>Contact Information</h3>
                    <div className="text-sm">
                      <p className="text-gray-500">Email Address</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Phone Number</p>
                      <p className="font-medium">{profile.phone_number}</p>
                    </div>
                  </div>

                  {/* Academic Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><GraduationCap className="w-5 h-5 mr-3 text-gray-500"/>Academic Information</h3>
                    <div className="text-sm">
                      <p className="text-gray-500">Department</p>
                      <p className="font-medium">{profile.departments?.name || 'Not specified'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Course</p>
                      <p className="font-medium">{profile.courses?.name || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200 overflow-x-auto no-scrollbar">
            <nav className="-mb-px flex flex-wrap gap-x-6 px-4 sm:px-6">
              <button
                onClick={() => setActiveTab('listings')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'listings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Listings
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'favorites'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Favorites
              </button>
              <button
                onClick={() => setActiveTab('recycle_bin')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recycle_bin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recycle Bin
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'listings' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">My Listings ({activeListings.length})</h2>
                  <Link href="/listings/create">
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create New Listing
                    </Button>
                  </Link>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your listings...</p>
                  </div>
                ) : activeListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeListings.map(listing => (
                      <ListingCard key={listing.post_id} listing={listing} onDelete={handleDelete} onRestore={handleRestore} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">You haven't posted any listings yet.</h3>
                    <p className="text-gray-600 mt-1">
                      Ready to find the perfect housemate? Get started by creating your first listing.
                    </p>
                    <Link href="/listings/create" className="mt-4 inline-block">
                      <Button>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create First Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">My Favorites ({favoriteListings.length})</h2>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your favorites...</p>
                  </div>
                ) : favoriteListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favoriteListings.map(listing => {
                      const featuredImage = getFeaturedImage(listing.photos)
                      return (
                      <Card key={listing.post_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img
                                src={featuredImage}
                              alt={listing.title}
                              className="w-full h-48 object-cover rounded-t-lg"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{listing.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{listing.city}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xl font-bold text-blue-600">
                                ₱{listing.price.toLocaleString()}/month
                              </span>
                              <Badge variant="outline">{listing.room_types.display_name}</Badge>
                            </div>
                              <div className="mt-4">
                                <Link href={`/listings/${listing.post_id}`} className="w-full">
                                  <Button variant="outline" className="w-full">
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">You haven't favorited any listings yet.</h3>
                    <p className="text-gray-600 mt-1">
                      Click the heart icon on any listing to save it here for later.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recycle_bin' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold">Recycle Bin ({deletedListings.length})</h2>
                  <p className="text-sm text-gray-600 mt-1">Listings in the recycle bin are permanently deleted after 30 days.</p>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your recycle bin...</p>
                  </div>
                ) : deletedListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {deletedListings.map(listing => (
                      <ListingCard key={listing.post_id} listing={listing} onDelete={handleDelete} onRestore={handleRestore} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Trash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Your recycle bin is empty.</h3>
                    <p className="text-gray-600 mt-1">
                      When you delete a listing, it will appear here for 30 days before being permanently removed.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </>
  )
} 