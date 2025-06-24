import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
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

    // Check if user is admin
    const { data: profile } = await supabaseUserClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Use service client to fetch all users, bypassing RLS
    const supabaseAdminClient = createServiceClient()

    // Fetch all users with their department and course information
    const { data: users, error } = await supabaseAdminClient
      .from('users')
      .select(`
        user_id,
        email,
        full_name,
        phone_number,
        id_number,
        role,
        is_blocked,
        created_at,
        departments (
          name
        ),
        courses (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Log sensitive data access
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logDataAccess(
      user.id,
      'users_data',
      {
        users_count: users?.length || 0,
        ...requestMetadata
      }
    )

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 