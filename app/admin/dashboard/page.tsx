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

export default function AdminDashboardPage() {
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
      router.push('/auth')
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
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">
              Monitor platform activity and manage administrative tasks
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

        {/* Left Column (Recent Activity & Flagged Posts) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Platform Activity Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Platform Activity</h2>
            <div className="space-y-6">
              
              {/* New Users Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Users className="mr-2 h-5 w-5 text-blue-500" />
                    New Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {recentActivity?.users && recentActivity.users.length > 0 ? (
                        recentActivity.users.map(user => (
                          <li key={user.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center flex-1 min-w-0">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <span className="text-blue-600 font-bold">{user.full_name.charAt(0)}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{user.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.role} • {user.department_name}</p>
                              </div>
                            </div>
                            <p className="flex-shrink-0 ml-4 text-xs text-gray-500">{format(new Date(user.created_at), 'M/d/yyyy')}</p>
                          </li>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No new users recently.</p>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Posts Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Home className="mr-2 h-5 w-5 text-green-500" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {recentActivity?.posts && recentActivity.posts.length > 0 ? (
                        recentActivity.posts.map(post => (
                          <li key={post.post_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center flex-1 min-w-0">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Home className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{post.type_display}</p>
                                <p className="text-xs text-gray-500 truncate"><MapPin className="inline h-3 w-3 mr-1" />{post.barangay} • by {post.poster_name}</p>
                              </div>
                            </div>
                            <p className="flex-shrink-0 ml-4 text-xs text-gray-500">{format(new Date(post.created_at), 'M/d/yyyy')}</p>
                          </li>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No new posts recently.</p>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Reports Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Recent Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {recentActivity?.reports && recentActivity.reports.length > 0 ? (
                        recentActivity.reports.map(report => (
                          <li key={report.report_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center flex-1 min-w-0">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{report.type}</p>
                                <p className="text-xs text-gray-500 truncate"><MapPin className="inline h-3 w-3 mr-1" />{report.barangay} • by {report.reporter_name}</p>
                              </div>
                            </div>
                            <p className="flex-shrink-0 ml-4 text-xs text-gray-500">{format(new Date(report.created_at), 'M/d/yyyy')}</p>
                          </li>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No new reports recently.</p>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Column (Stats & Logs) */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-indigo-500" />
                System Status
              </CardTitle>
              <CardDescription>Current platform health overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats?.posts.available_posts ?? '...'}</p>
                  <p className="text-sm text-green-700">Available</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.posts.occupied_posts ?? '...'}</p>
                  <p className="text-sm text-yellow-700">Occupied</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats?.posts.flagged_posts ?? '...'}</p>
                  <p className="text-sm text-red-700">Flagged</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{stats?.posts.archived_posts ?? '...'}</p>
                  <p className="text-sm text-gray-700">Archived</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="mr-2 h-5 w-5 text-purple-500" />
                User Distribution
              </CardTitle>
              <CardDescription>Platform user breakdown by role</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-sm text-blue-700">Students</span>
                  <span className="font-bold text-blue-800">{stats?.users.students ?? '...'}</span>
                </li>
                <li className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-sm text-purple-700">Admins</span>
                  <span className="font-bold text-purple-800">{stats?.users.admins ?? '...'}</span>
                </li>
                <li className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                  <span className="font-medium text-sm text-gray-700">Staff</span>
                  <span className="font-bold text-gray-800">{stats?.users.staff ?? '...'}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Audit Logs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-gray-600" />
                Admin Audit Logs
              </CardTitle>
              <CardDescription>Recent actions performed by administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <ul className="space-y-4">
                  {auditLogs.length > 0 ? (
                    auditLogs.map(log => (
                      <li key={log.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {log.admin ? log.admin.full_name : 'Unknown Admin'}
                          </p>
                          <Badge className={getActionBadgeColor(log.action)}>
                            {formatActionText(log.action)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {log.table_name && log.record_id && (
                            log.table_name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' (ID: ' + log.record_id + ')'
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(log.created_at), 'MMM d, yyyy, h:mm a')}
                        </p>
                      </li>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No audit logs found.</p>
                  )}
                </ul>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAuditLogsPage(p => Math.max(0, p - 1))}
                  disabled={auditLogsPage === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {auditLogsPage + 1} of {Math.ceil(totalAuditLogs / auditLogsPerPage)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAuditLogsPage(p => p + 1)}
                  disabled={((auditLogsPage + 1) * auditLogsPerPage) >= totalAuditLogs}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
} 