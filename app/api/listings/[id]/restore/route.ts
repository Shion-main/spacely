import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const postId = params.id

  // Verify the user owns the post before restoring
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('user_id, approval_status')
    .eq('post_id', postId)
    .single()

  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found or you do not have permission to restore it.' }, { status: 404 })
  }

  if (post.user_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to restore this post.' }, { status: 403 })
  }

  if (post.approval_status === 'archived') {
    return NextResponse.json({ error: 'This post has been archived by an administrator and cannot be restored.' }, { status: 403 })
  }

  // Restore the post by setting deleted_at to NULL and is_deleted to FALSE
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      deleted_at: null,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    })
    .eq('post_id', postId)

  if (updateError) {
    console.error('Error restoring post:', updateError)
    return NextResponse.json({ error: 'Failed to restore post', details: updateError.message }, { status: 500 })
  }

  // Log the restore action
  await AuditLogger.logPostAction(user.id, 'restore_post' as any, postId, { deleted_at: 'TIMESTAMP', is_deleted: true }, { deleted_at: null, is_deleted: false });

  // Revalidate paths to clear cache and show the restored post
  revalidatePath('/profile') // User's dashboard/profile page
  revalidatePath('/listings') // Main listings page
  revalidatePath(`/listings/${postId}`) // The specific listing page

  return NextResponse.json({ message: 'Post restored successfully.' })
} 