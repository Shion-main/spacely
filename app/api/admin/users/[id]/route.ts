import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { action } = await request.json()
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate action
    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Use service client to bypass RLS for user data operations
    const supabaseAdmin = createServiceClient()

    // Check if target user exists and is not an admin
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('role, full_name, email, is_blocked')
      .eq('user_id', params.id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot ban admin users' }, { status: 403 })
    }

    // Update user ban status
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_blocked: action === 'ban',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', params.id)
      .select()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log the admin action to audit table
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logUserAction(
      user.id,
      action === 'ban' ? 'ban_user' : 'unban_user',
      params.id,
      targetUser ? {
        is_blocked: targetUser.is_blocked,
        full_name: targetUser.full_name,
        email: targetUser.email
      } : undefined,
      {
        is_blocked: action === 'ban',
        updated_at: new Date().toISOString()
      },
      {
        target_user_name: targetUser?.full_name,
        target_user_email: targetUser?.email,
        ...requestMetadata
      }
    )

    return NextResponse.json({ 
      message: `User ${action}ned successfully`,
      user: data[0]
    })
  } catch (error) {
    console.error('Error processing user action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 