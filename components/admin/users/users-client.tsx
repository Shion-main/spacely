"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Eye,
  Ban,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { TableCell, TableRow } from '@/components/ui/table'
import { UserDetailsModal } from '@/components/admin/user-details-modal'
import ConfirmModal from '@/components/admin/confirm-modal'
import { useAdminAuth } from '@/components/providers/admin-auth-provider'
import { useRouter } from 'next/navigation'

interface User {
  user_id: string
  email: string
  full_name: string
  phone_number: string
  id_number: string
  department_id: number
  course_id: number
  role: string
  is_blocked: boolean
  created_at: string
  departments?: {
    name: string
  }
  courses?: {
    name: string
  }
  _count?: {
    posts: number
    favorites: number
  }
  student_id?: string
}

interface RoleCounts {
  all: number
  student: number
  admin: number
  banned: number
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'admin'>('all')
  const [processingUsers, setProcessingUsers] = useState<string[]>([])
  const [modalInfo, setModalInfo] = useState<{ userId: string; action: 'ban' | 'unban' | 'view' } | null>(null)
  const { isAdmin, loading: authLoading } = useAdminAuth()
  const router = useRouter()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const { users } = await response.json()
      setUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'ban' | 'unban') => {
    try {
      setProcessingUsers(prev => [...prev, userId])
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) throw new Error(`Failed to ${action} user`)
      
      await fetchUsers() // Refresh the list
    } catch (error) {
      console.error(`Error ${action}ning user:`, error)
      alert(`Failed to ${action} user`)
    } finally {
      setProcessingUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const getRoleCounts = (): RoleCounts => {
    return {
      all: users.length,
      student: users.filter(u => u.role === 'student').length,
      admin: users.filter(u => ['admin', 'super_admin'].includes(u.role)).length,
      banned: users.filter(u => u.is_blocked).length
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || (
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      user.id_number.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'admin' && ['admin', 'super_admin'].includes(user.role)) ||
      (filterRole === 'student' && user.role === 'student')
    
    return matchesSearch && matchesRole
  })

  const roleCounts = getRoleCounts()

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/auth')
      return
    }

    if (!authLoading && isAdmin) {
      fetchUsers()
    }
  }, [isAdmin, authLoading, router])

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
            SPACELY
          </h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3 text-blue-600" />
                Users Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage registered users and their account status
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{roleCounts.all}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{roleCounts.student}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{roleCounts.admin}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Banned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{roleCounts.banned}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or student ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Users' },
                  { key: 'student', label: 'Students' },
                  { key: 'admin', label: 'Admins' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={filterRole === key ? "default" : "outline"}
                    onClick={() => setFilterRole(key as any)}
                    size="sm"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">
                {searchQuery || filterRole !== 'all' 
                  ? "Try adjusting your search criteria."
                  : "No users have registered yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((userData) => (
              <Card key={userData.user_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">{userData.full_name}</CardTitle>
                        <Badge variant={['admin', 'super_admin'].includes(userData.role) ? 'default' : 'secondary'}>
                          {userData.role}
                        </Badge>
                        {userData.is_blocked && (
                          <Badge variant="destructive">
                            Blocked
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2" />
                            {userData.email}
                          </div>
                          <div className="text-sm text-gray-600 mt-3">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">Dept:</span>
                                <span>{userData.departments?.name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">Course:</span>
                                <span>{userData.courses?.name || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          {userData.phone_number && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-4 h-4 mr-2" />
                              {userData.phone_number}
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            Joined {new Date(userData.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </CardDescription>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!['admin', 'super_admin'].includes(userData.role) && (
                        <>
                          {userData.is_blocked ? (
                            <Button
                              size="sm"
                              onClick={() => setModalInfo({ userId: userData.user_id, action: 'unban' })}
                              disabled={processingUsers.includes(userData.user_id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setModalInfo({ userId: userData.user_id, action: 'ban' })}
                              disabled={processingUsers.includes(userData.user_id)}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Block User
                            </Button>
                          )}
                        </>
                      )}

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setModalInfo({ userId: userData.user_id, action: 'view' })
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* User Details Modal */}
        {modalInfo && (
          <UserDetailsModal
            isOpen={modalInfo.action === 'view'}
            onClose={() => setModalInfo(null)}
            userId={modalInfo.userId}
            onUserUpdate={fetchUsers}
          />
        )}

        {/* Confirmation Modal (only for ban/unban) */}
        {modalInfo && (modalInfo.action === 'ban' || modalInfo.action === 'unban') && (
          <ConfirmModal
            open={modalInfo.action === 'ban' || modalInfo.action === 'unban'}
            title={modalInfo.action === 'ban' ? 'Block User' : 'Unblock User'}
            description={modalInfo.action === 'ban'
              ? 'Are you sure you want to block this user?'
              : 'Are you sure you want to unblock this user?'}
            confirmLabel={modalInfo.action === 'ban' ? 'Block' : 'Unblock'}
            onClose={() => setModalInfo(null)}
            onConfirm={() => handleUserAction(modalInfo.userId, modalInfo.action as 'ban' | 'unban')}
          />
        )}
      </div>
    </div>
  )
} 