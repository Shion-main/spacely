import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user and verify admin role from Supabase auth
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseUserClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied. User is not an admin.' }, { status: 403 })
    }

    // Create service client for admin operations - bypasses RLS
    const supabase = createServiceClient()

    // Fetch user statistics
    const { data: userData, error: userError } = await supabase.from('users').select(`
      user_id,
      role,
      is_blocked,
      created_at
    `).eq('is_deleted', false)

    if (userError) {
      console.error('Error fetching users for stats:', userError)
      throw userError
    }

    const totalUsers = userData?.length || 0
    const students = userData?.filter(u => u.role === 'student').length || 0
    const admins = userData?.filter(u => ['admin', 'super_admin'].includes(u.role)).length || 0
    const staff = userData?.filter(u => u.role === 'staff').length || 0
    const blockedUsers = userData?.filter(u => u.is_blocked).length || 0
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newUsers30d = userData?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length || 0

    const users = {
      total_users: totalUsers,
      students,
      admins,
      staff,
      blocked_users: blockedUsers,
      new_users_30d: newUsers30d
    }

    // Fetch post statistics
    const { data: postData, error: postError } = await supabase.from('posts').select(`
      post_id,
      status,
      approval_status,
      archived,
      is_flagged,
      created_at
    `).eq('is_deleted', false)

    if (postError) {
      console.error('Error fetching posts for stats:', postError)
      throw postError
    }

    const totalPosts = postData?.length || 0
    const availablePosts = postData?.filter(p => p.status === 'available').length || 0
    const occupiedPosts = postData?.filter(p => p.status === 'occupied').length || 0
    const archivedPosts = postData?.filter(p => p.archived).length || 0
    const flaggedPosts = postData?.filter(p => p.is_flagged).length || 0
    const pendingPosts = postData?.filter(p => p.approval_status === 'pending').length || 0
    const approvedPosts = postData?.filter(p => p.approval_status === 'approved').length || 0
    const rejectedPosts = postData?.filter(p => p.approval_status === 'rejected').length || 0
    const thirtyDaysAgoPosts = new Date()
    thirtyDaysAgoPosts.setDate(thirtyDaysAgoPosts.getDate() - 30)
    const newPosts30d = postData?.filter(p => new Date(p.created_at) >= thirtyDaysAgoPosts).length || 0

    const posts = {
      total_posts: totalPosts,
      available_posts: availablePosts,
      occupied_posts: occupiedPosts,
      archived_posts: archivedPosts,
      flagged_posts: flaggedPosts,
      pending_posts: pendingPosts,
      approved_posts: approvedPosts,
      rejected_posts: rejectedPosts,
      new_posts_30d: newPosts30d
    }

    // Fetch report statistics
    const { data: reportData, error: reportError } = await supabase.from('reports').select(`
      report_id,
      type,
      created_at
    `).eq('is_deleted', false)

    if (reportError) {
      console.error('Error fetching reports for stats:', reportError)
      throw reportError
    }

    const totalReports = reportData?.length || 0
    const scamReports = reportData?.filter(r => r.type === 'scam').length || 0
    const occupiedReports = reportData?.filter(r => r.type === 'occupied').length || 0
    const otherReports = reportData?.filter(r => r.type === 'other').length || 0
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newReports7d = reportData?.filter(r => new Date(r.created_at) >= sevenDaysAgo).length || 0

    const reports = {
      total_reports: totalReports,
      scam_reports: scamReports,
      occupied_reports: occupiedReports,
      other_reports: otherReports,
      new_reports_7d: newReports7d
    }

    return NextResponse.json({
      users,
      posts,
      reports
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
} 