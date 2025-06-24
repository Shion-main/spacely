import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { AuditLogger } from '@/lib/audit-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate and authorize admin
    const authClient = createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await authClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()
    const postId = params.id

    // Get current post data for audit logging
    const { data: currentPost } = await supabase
      .from('posts')
      .select('is_flagged, title, user_id')
      .eq('post_id', postId)
      .single()

    // Flag the post
    const { error } = await supabase
      .from('posts')
      .update({ 
        is_flagged: true,
        flagged_at: new Date().toISOString(),
        flagged_by: user.id
      })
      .eq('post_id', postId)

    if (error) {
      console.error('Error flagging post:', error)
      throw error
    }

    // Log the admin action to audit table
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logFlagAction(
      user.id,
      'flag_post',
      postId,
      {
        previous_flagged_status: currentPost?.is_flagged || false,
        post_title: currentPost?.title,
        target_user_id: currentPost?.user_id,
        ...requestMetadata
      }
    )

    return NextResponse.json({ 
      message: 'Post flagged successfully' 
    })

  } catch (error) {
    console.error('Flag post error:', error)
    return NextResponse.json(
      { error: 'Failed to flag post' },
      { status: 500 }
    )
  }
} 