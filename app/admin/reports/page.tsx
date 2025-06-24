"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  ArrowLeft, 
  Eye, 
  Clock, 
  MessageCircle,
  Shield,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Report {
  report_id: string
  post_id: string
  reporter_id: string
  type: string
  reason: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  admin_notes?: string
  posts: {
    title: string
    city: string
    approval_status: string
  }
  reporter: {
    full_name: string
    email: string
  }
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

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800'
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('pending')
  const [processingReports, setProcessingReports] = useState<string[]>([])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reports')
      if (!response.ok) throw new Error('Failed to fetch reports')
      
      const data = await response.json()
      setReports(data.reports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss', notes?: string) => {
    try {
      setProcessingReports(prev => [...prev, reportId])
      
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: notes })
      })

      if (!response.ok) throw new Error(`Failed to ${action} report`)
      
      await fetchReports() // Refresh the list
    } catch (error) {
      console.error(`Error ${action}ing report:`, error)
      alert(`Failed to ${action} report`)
    } finally {
      setProcessingReports(prev => prev.filter(id => id !== reportId))
    }
  }

  const handleMarkUnderReview = async (report: Report) => {
    try {
      setProcessingReports(prev => [...prev, report.report_id])

      const response = await fetch(`/api/admin/reports/${report.report_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_approval_status: 'under_review', post_id: report.post_id })
      })

      if (!response.ok) throw new Error('Failed to mark under review')

      await fetchReports()
    } catch (error) {
      console.error('Error marking under review:', error)
      toast.error('Failed to mark under review')
    } finally {
      setProcessingReports(prev => prev.filter(id => id !== report.report_id))
    }
  }

  const getStatusCounts = () => {
    return {
      all: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length
    }
  }

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(report => report.status === filter)

  const statusCounts = getStatusCounts()

  useEffect(() => {
    fetchReports()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReports();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
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
                <AlertTriangle className="w-8 h-8 mr-3 text-red-600" />
                Reports Management
              </h1>
              <p className="text-gray-600 mt-2">
                Review and manage user reports of inappropriate content
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Reports', count: statusCounts.all },
              { key: 'pending', label: 'Pending', count: statusCounts.pending },
              { key: 'reviewed', label: 'Under Review', count: statusCounts.reviewed },
              { key: 'resolved', label: 'Resolved', count: statusCounts.resolved },
              { key: 'dismissed', label: 'Dismissed', count: statusCounts.dismissed }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key as typeof filter)}
                className="flex items-center space-x-2"
              >
                <span>{label}</span>
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "No reports have been submitted yet."
                  : `No ${filter} reports at the moment.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.report_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">{report.posts.title}</CardTitle>
                        <Badge className={STATUS_COLORS[report.status]}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {REPORT_TYPES[report.type as keyof typeof REPORT_TYPES] || report.type}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Reported by {report.reporter.full_name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-gray-500">
                          {report.posts.city}
                        </span>
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Link href={`/admin/reports/${report.report_id}`} passHref>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Report Details</h4>
                      <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-md border">
                        {report.reason}
                      </p>
                    </div>
                    
                    {report.admin_notes && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Notes
                        </h4>
                        <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                          {report.admin_notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {report.status === 'pending' && (
                      <div className="flex items-center space-x-3 pt-4 border-t">
                        <Button
                          onClick={() => handleMarkUnderReview(report)}
                          disabled={processingReports.includes(report.report_id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Mark as Under Review
                        </Button>
                      </div>
                    )}

                    {/* Resolution Info */}
                    {(report.status === 'resolved' || report.status === 'dismissed') && report.resolved_at && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {report.status === 'resolved' ? 'Resolved' : 'Dismissed'} on{' '}
                          {new Date(report.resolved_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 