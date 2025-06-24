import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { AuditLogger } from '@/lib/audit-logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 User details API called with ID:', params.id)
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin user authenticated:', user.id)

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      console.log('❌ Admin check failed. Profile:', profile)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('✅ Admin role verified:', profile.role)

    // Use service client for all admin operations to bypass RLS
    console.log('🔧 Creating service client...')
    const serviceClient = createServiceClient()
    console.log('✅ Service client created successfully')

    // Fetch basic user information
    console.log('🔍 Fetching user data for ID:', params.id)
    
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select(`
        user_id,
        email,
        full_name,
        phone_number,
        id_number,
        department_id,
        course_id,
        role,
        is_blocked,
        created_at,
        updated_at,
        departments(name),
        courses(name)
      `)
      .eq('user_id', params.id)
      .single()

    console.log('📊 User query result:', { 
      userData: userData?.full_name, 
      userFound: !!userData,
      error: userError?.message,
      errorCode: userError?.code
    })

    if (userError || !userData) {
      console.log('❌ User not found. Error:', userError)
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message || 'No user data returned',
        user_id_searched: params.id
      }, { status: 404 })
    }

    console.log('✅ User found:', userData.full_name)

    // Fetch user's listings
    const { data: listings } = await serviceClient
      .from('posts')
      .select(`
        post_id,
        title,
        approval_status,
        archived,
        created_at,
        price
      `)
      .eq('user_id', params.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Count listings by status
    const listingsStats = {
      total: listings?.length || 0,
      active: listings?.filter(l => l.approval_status === 'approved').length || 0,
      pending: listings?.filter(l => l.approval_status === 'pending').length || 0,
      archived: listings?.filter(l => l.archived === true).length || 0,
      recent: listings?.slice(0, 5).map(l => ({
        ...l,
        status: l.approval_status // Map for compatibility with frontend
      })) || []
    }

    // Fetch user's favorites
    const { data: favorites } = await serviceClient
      .from('favorites')
      .select(`
        created_at,
        posts!inner(
          post_id,
          title
        )
      `)
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })

    const favoritesStats = {
      total: favorites?.length || 0,
      recent: favorites?.slice(0, 5).map(f => ({
        post_id: f.posts[0]?.post_id,
        title: f.posts[0]?.title,
        created_at: f.created_at
      })) || []
    }

    // Fetch reports made by user
    const { data: reportsByUser } = await serviceClient
      .from('reports')
      .select('report_id')
      .eq('reporter_id', params.id)

    // Fetch reports made against user's posts
    const { data: reportsAgainstUser } = await serviceClient
      .from('reports')
      .select(`
        report_id,
        type,
        created_at,
        posts!inner(user_id)
      `)
      .eq('posts.user_id', params.id)
      .order('created_at', { ascending: false })

    const reportsStats = {
      made_by_user: reportsByUser?.length || 0,
      made_against_user: reportsAgainstUser?.length || 0,
      recent_against: reportsAgainstUser?.slice(0, 5).map(r => ({
        ...r,
        status: 'pending' // Default status since we don't have this column
      })) || []
    }

    // Calculate activity stats
    const registrationDate = new Date(userData.created_at)
    const now = new Date()
    const daysSinceRegistration = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))

    const activityStats = {
      total_logins: 0, // This would require tracking login events
      last_active: userData.updated_at || userData.created_at,
      days_since_registration: daysSinceRegistration
    }

    // Log the admin action
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logDataAccess(
      user.id,
      `view_user_details: ${params.id}`,
      {
        user_name: userData.full_name,
        user_email: userData.email,
        ...requestMetadata
      }
    )

    const userDetails = {
      ...userData,
      student_id: userData.id_number, // Map for compatibility with frontend
      is_banned: userData.is_blocked, // Map for compatibility with frontend
      last_login: userData.updated_at, // Map for compatibility with frontend
      listings: listingsStats,
      favorites: favoritesStats,
      reports: reportsStats,
      activity: activityStats
    }

    return NextResponse.json(userDetails)
  } catch (error) {
    console.error('❌ Unexpected error in user details API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 