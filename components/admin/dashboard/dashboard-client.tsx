"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAdminAuth } from '@/components/providers/admin-auth-provider'
import { 
  Users, 
  Home, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Flag,
  Archive,
  Calendar,
  Mail,
  Building,
  GraduationCap,
  BarChart3,
  Activity,
  Star,
  MapPin,
  Timer
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

interface DashboardStats {
  users: {
    total_users: number
    students: number
    admins: number
    staff: number
    blocked_users: number
    new_users_30d: number
  }
  posts: {
    total_posts: number
    available_posts: number
    occupied_posts: number
    archived_posts: number
    flagged_posts: number
    pending_posts: number
    approved_posts: number
    rejected_posts: number
    new_posts_30d: number
  }
  reports: {
    total_reports: number
    scam_reports: number
    occupied_reports: number
    other_reports: number
    new_reports_7d: number
  }
}

interface RecentActivity {
  users: Array<{
    user_id: string
    full_name: string
    email: string
    role: string
    department_name?: string
    course_name?: string
    created_at: string
  }>
  posts: Array<{
    post_id: string
    title: string
    price: number
    city: string
    barangay: string
    poster_name: string
    type_display: string
    created_at: string
  }>
  reports: Array<{
    report_id: string
    type: string
    reporter_name: string
    street: string
    barangay: string
    created_at: string
  }>
}

interface AuditLog {
  id: string
  admin_id: string
  action: 'create' | 'update' | 'delete' | 'block' | 'unblock'
  table_name: string
  record_id: string
  details: any
  created_at: string
  admin: {
    full_name: string
    email: string
  }
}

const formatActionText = (action: string) => {
  if (!action) return 'Unknown Action';
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [auditLogsPage, setAuditLogsPage] = useState(0)
  const [totalAuditLogs, setTotalAuditLogs] = useState(0)
  const auditLogsPerPage = 10
  const { isAdmin, loading: authLoading } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('[AdminDashboard] Auth state:', { isAdmin, authLoading })
    
    if (!authLoading && !isAdmin) {
      console.log('[AdminDashboard] Not admin, redirecting to auth')
      router.replace('/auth')
      return
    }

    if (!authLoading && isAdmin) {
      console.log('[AdminDashboard] Admin confirmed, fetching data')
      fetchDashboardData()
    }
  }, [isAdmin, authLoading, router])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/recent-activity')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData)
      }
    } catch (error) {
      console.error('AdminDashboard: Error fetching data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(`/api/admin/audit-logs?limit=${auditLogsPerPage}&offset=${auditLogsPage * auditLogsPerPage}`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs)
        setTotalAuditLogs(data.total)
      } else {
        console.error('Error fetching audit logs:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs()
    }
  }, [isAdmin, auditLogsPage])

  const getActionBadgeColor = (action: string) => {
    if (!action) return 'bg-gray-100 text-gray-800';
    const actionLower = action.toLowerCase();
    if (actionLower.includes('approve') || actionLower.includes('unban') || actionLower.includes('login')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    if (actionLower.includes('reject') || actionLower.includes('ban') || actionLower.includes('delete') || actionLower.includes('flag')) return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    if (actionLower.includes('update') || actionLower.includes('access') || actionLower.includes('view')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    if (actionLower.includes('logout') || actionLower.includes('archive')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  // Show loading state only when auth is loading
  if (authLoading) {
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

  // If not admin, don't render anything (redirect will happen)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-8 h-8 mr-3 text-blue-600" />
                Dashboard Overview
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor platform activity and manage administrative tasks
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.posts.total_posts ?? '...'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.posts.available_posts ?? '...'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats?.posts.pending_posts ?? '...'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Flagged</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats?.posts.flagged_posts ?? '...'}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Activity className="w-5 h-5 mr-2 text-blue-600" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest platform updates and changes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity?.users.slice(0, 5).map(user => (
                        <div key={user.user_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.full_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              New {user.role} registration
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-sm text-gray-500">
                            {format(new Date(user.created_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Shield className="w-5 h-5 mr-2 text-blue-600" />
                      Admin Actions
                    </CardTitle>
                    <CardDescription>Recent administrative activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {auditLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {log.admin.full_name}
                            </span>
                            <Badge className={getActionBadgeColor(log.action)}>
                              {formatActionText(log.action)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {log.table_name ? log.table_name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown Table'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 