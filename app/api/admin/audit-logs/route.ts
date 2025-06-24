import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseUserClient = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For system admin, allow access
    if (user.email !== 'spacely.main@gmail.com') {
      const { data: profile } = await supabaseUserClient
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Access denied. User is not an admin.' }, { status: 403 })
      }
    }

    const supabase = createServiceClient()

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Fetch audit logs with admin details and related record information
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        id:log_id,
        action:action_type,
        table_name,
        record_id,
        old_values,
        new_values,
        created_at,
        admin:users!admin_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching audit logs:', error)
      // Return empty logs instead of error for better UX
      return NextResponse.json({
        logs: [],
        total: 0,
        limit,
        offset
      })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Unexpected error in audit logs route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 