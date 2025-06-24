import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { AuditLogger } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

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
      .select('is_deleted, approval_status, title, user_id')
      .eq('post_id', postId)
      .single()

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Restore the post
    const { error } = await supabase
      .from('posts')
      .update({ 
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        approval_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('post_id', postId)

    if (error) {
      console.error('Error restoring post:', error)
      throw error
    }

    // Log the admin action to audit table
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logPostAction(
      user.id,
      'restore_post',
      postId,
      {
        is_deleted: currentPost.is_deleted,
        approval_status: currentPost.approval_status,
        title: currentPost.title
      },
      { is_deleted: false, approval_status: 'approved' },
      {
        target_user_id: currentPost.user_id,
        ...requestMetadata
      }
    )

    // Revalidate paths
    revalidatePath('/admin/listings')
    revalidatePath('/admin/pending-listings')
    revalidatePath(`/listings/${postId}`)

    return NextResponse.json({ 
      message: 'Post restored successfully' 
    })

  } catch (error) {
    console.error('Restore post error:', error)
    return NextResponse.json(
      { error: 'Failed to restore post' },
      { status: 500 }
    )
  }
} 