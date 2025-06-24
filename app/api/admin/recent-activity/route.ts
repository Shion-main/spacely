import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user and verify admin role
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

    const supabase = createServiceClient()

    // Get recent users (last 5)
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        full_name,
        email,
        role,
        created_at,
        departments!inner(name),
        courses(name)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (usersError) {
      console.error('Error fetching recent users:', usersError)
    }

    // Get recent posts (last 5)
    const { data: recentPosts, error: postsError } = await supabase
      .from('posts')
      .select(`
        post_id,
        title,
        price,
        city,
        barangay,
        created_at,
        users!posts_user_id_fkey(full_name),
        room_types!inner(display_name)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (postsError) {
      console.error('Error fetching recent posts:', postsError)
    }

    // Get recent reports (last 5)
    const { data: recentReports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        report_id,
        type,
        created_at,
        users!reports_reporter_id_fkey(full_name),
        posts!inner(street, barangay)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (reportsError) {
      console.error('Error fetching recent reports:', reportsError)
    }

    // Format the data to match the expected interface
    const users = (recentUsers || []).map(user => ({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_name: user.departments?.[0]?.name || null,
      course_name: user.courses?.[0]?.name || null,
      created_at: user.created_at
    }))

    const posts = (recentPosts || []).map(post => ({
      post_id: post.post_id,
      title: post.title || '',
      price: post.price || 0,
      city: post.city || '',
      barangay: post.barangay || '',
      poster_name: post.users?.[0]?.full_name || 'Unknown',
      type_display: post.room_types?.[0]?.display_name || 'Unknown',
      created_at: post.created_at
    }))

    const reports = (recentReports || []).map(report => ({
      report_id: report.report_id,
      type: report.type || 'other',
      reporter_name: report.users?.[0]?.full_name || 'Unknown',
      street: report.posts?.[0]?.street || '',
      barangay: report.posts?.[0]?.barangay || '',
      created_at: report.created_at
    }))

    return NextResponse.json({
      users,
      posts,
      reports
    })

  } catch (error) {
    console.error('Admin recent activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
} 