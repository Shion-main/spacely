"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  MapPin,
  Home,
  Heart,
  Flag,
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react'

interface UserDetails {
  user_id: string
  email: string
  full_name: string
  phone_number: string
  student_id: string
  department_id: number
  course_id: number
  role: string
  is_banned: boolean
  is_blocked?: boolean
  created_at: string
  last_login: string
  banned_at?: string
  banned_by?: string
  departments?: {
    name: string
  }
  courses?: {
    name: string
  }
  listings: {
    total: number
    active: number
    pending: number
    archived: number
    recent: Array<{
      post_id: string
      title: string
      status: string
      created_at: string
      price: number
    }>
  }
  favorites: {
    total: number
    recent: Array<{
      post_id: string
      title: string
      created_at: string
    }>
  }
  reports: {
    made_by_user: number
    made_against_user: number
    recent_against: Array<{
      report_id: string
      type: string
      created_at: string
      status: string
    }>
  }
  activity: {
    total_logins: number
    last_active: string
    days_since_registration: number
  }
}

interface UserDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  onUserUpdate?: () => void
}

export function UserDetailsModal({ isOpen, onClose, userId, onUserUpdate }: UserDetailsModalProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'activity' | 'reports'>('overview')
  const [processing, setProcessing] = useState(false)
  const [confirmModal, setConfirmModal] = useState<'ban' | 'unban' | null>(null)

  const fetchUserDetails = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      setUserDetails(null)
      setError(null)
      
      console.log('Fetching user details for:', userId)
      const response = await fetch(`/api/admin/users/${userId}/details`)
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error:', response.status, errorData)
        
        if (response.status === 404) {
          setError(`User not found. The user ID "${userId}" does not exist in the database.`)
        } else if (response.status === 401) {
          setError('Authentication required. Please log in as an admin.')
        } else if (response.status === 403) {
          setError('Access denied. Admin privileges required.')
        } else {
          setError(`Failed to load user details: ${errorData.error || response.statusText}`)
        }
        return
      }
      
      const data = await response.json()
      console.log('User details loaded:', data.full_name)
      setUserDetails(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching user details:', error)
      setUserDetails(null)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (action: 'ban' | 'unban') => {
    if (!userId || !userDetails) return
    
    try {
      setProcessing(true)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) throw new Error(`Failed to ${action} user`)
      
      // Refresh user details
      await fetchUserDetails()
      onUserUpdate?.()
    } catch (error) {
      console.error(`Error ${action}ning user:`, error)
      alert(`Failed to ${action} user`)
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
      setActiveTab('overview')
    } else if (isOpen && !userId) {
      setError('No user ID provided')
    }
  }, [isOpen, userId])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-blue-600" />
              <span>User Details</span>
              {userDetails && (
                <Badge variant={['admin', 'super_admin'].includes(userDetails.role) ? 'default' : 'secondary'}>
                  {userDetails.role}
                </Badge>
              )}
              {(userDetails?.is_banned || userDetails?.is_blocked) && (
                <Badge variant="destructive">Blocked</Badge>
              )}
            </div>
            {userDetails && !['admin', 'super_admin'].includes(userDetails.role) && (
              <div className="flex space-x-2">
                {userDetails.is_blocked ? (
                  <Button
                    size="sm"
                    onClick={() => setConfirmModal('unban')}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Unblock User
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmModal('ban')}
                    disabled={processing}
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Block User
                  </Button>
                )}
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View comprehensive user information including listings, activity, and reports.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading user details...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-medium">Error Loading User Details</h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchUserDetails} variant="outline">
              Try Again
            </Button>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'overview', label: 'Overview', icon: User },
                { key: 'listings', label: 'Listings', icon: Home },
                { key: 'activity', label: 'Activity', icon: Activity },
                { key: 'reports', label: 'Reports', icon: Flag }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{userDetails.full_name}</h3>
                      <p className="text-gray-600">Student ID: {userDetails.student_id}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {userDetails.email}
                      </div>
                      {userDetails.phone_number && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {userDetails.phone_number}
                        </div>
                      )}
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        Joined {new Date(userDetails.created_at).toLocaleDateString()}
                      </div>
                      {userDetails.last_login && (
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          Last login: {new Date(userDetails.last_login).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 pt-2">
                      <div className="flex items-center space-x-1">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Dept:</span>
                        <span className="text-sm">{userDetails.departments?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Course:</span>
                        <span className="text-sm">{userDetails.courses?.name || 'N/A'}</span>
                      </div>
                    </div>

                    {(userDetails.is_banned || userDetails.is_blocked) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                        <div className="flex items-center text-red-800">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <span className="font-medium">Account Blocked</span>
                        </div>
                        <p className="text-red-700 text-sm mt-1">
                          Account has been blocked by admin
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{userDetails.listings.total}</div>
                        <div className="text-sm text-gray-600">Total Listings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{userDetails.listings.active}</div>
                        <div className="text-sm text-gray-600">Active Listings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{userDetails.favorites.total}</div>
                        <div className="text-sm text-gray-600">Favorites</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{userDetails.activity.days_since_registration}</div>
                        <div className="text-sm text-gray-600">Days Active</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{userDetails.listings.total}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{userDetails.listings.active}</div>
                        <div className="text-sm text-gray-600">Active</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{userDetails.listings.pending}</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{userDetails.listings.archived}</div>
                        <div className="text-sm text-gray-600">Archived</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.listings.recent.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.listings.recent.map((listing) => (
                          <div key={listing.post_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium">{listing.title}</h4>
                              <p className="text-sm text-gray-600">
                                Created: {new Date(listing.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={listing.status === 'approved' ? 'default' : listing.status === 'pending' ? 'secondary' : 'outline'}>
                                {listing.status}
                              </Badge>
                              <p className="text-sm font-medium text-green-600 mt-1">₱{listing.price.toLocaleString()}/month</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">No listings found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{userDetails.activity.total_logins}</div>
                        <div className="text-sm text-gray-600">Total Logins</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{userDetails.activity.days_since_registration}</div>
                        <div className="text-sm text-gray-600">Days Since Registration</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {userDetails.activity.last_active ? new Date(userDetails.activity.last_active).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Last Active</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Favorite Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.favorites.recent.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.favorites.recent.map((favorite) => (
                          <div key={favorite.post_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium">{favorite.title}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                Favorited: {new Date(favorite.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">No favorites found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{userDetails.reports.made_by_user}</div>
                        <div className="text-sm text-gray-600">Reports Made</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{userDetails.reports.made_against_user}</div>
                        <div className="text-sm text-gray-600">Reports Against User</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reports Against User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.reports.recent_against.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.reports.recent_against.map((report) => (
                          <div key={report.report_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium capitalize">{report.type} Report</h4>
                              <p className="text-sm text-gray-600">
                                Reported: {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                              {report.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">No reports found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Failed to load user details</p>
          </div>
        )}
      </DialogContent>
      {confirmModal && (
        <Dialog open onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{confirmModal === 'ban' ? 'Block User' : 'Unblock User'}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              Are you sure you want to {confirmModal === 'ban' ? 'block' : 'unblock'} {userDetails?.full_name}?
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal === 'ban' ? 'destructive' : 'default'}
                onClick={() => { handleUserAction(confirmModal); setConfirmModal(null) }}
                disabled={processing}
              >
                {confirmModal === 'ban' ? 'Block' : 'Unblock'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
} 