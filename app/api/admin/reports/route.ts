import { NextRequest, NextResponse } from 'next/server'
export const revalidate = 30
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'

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

    // Use service client for admin operations - bypasses RLS
    const supabase = createServiceClient()

    // Fetch reports with related post and user information
    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        report_id,
        post_id,
        reporter_id,
        type,
        reason,
        status,
        created_at,
        resolved_at,
        admin_notes,
        posts:post_id (
          title,
          city
        ),
        reporter:reporter_id (
          full_name,
          email
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reports', details: error.message },
        { status: 500 }
      )
    }

    // Log sensitive data access
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logDataAccess(
      user.id,
      'view_reports_list',
      requestMetadata
    )

    // Ensure all reports have a status
    const processedReports = reports.map(report => ({
      ...report,
      status: report.status || 'pending'
    }))

    return NextResponse.json({ reports: processedReports })
  } catch (error) {
    console.error('Error in reports API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 