import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AuditLogger } from '@/lib/audit-logger'

const ADMIN_ROLES = ['admin', 'super_admin'] as const
type AdminRole = typeof ADMIN_ROLES[number]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        landlord_name,
        contact_number,
        social_link,
        users!posts_user_id_fkey (
          full_name,
          phone_number,
          email
        ),
        room_types (
          type_name,
          display_name
        ),
        rooms (
          number_of_rooms,
          bathroom_type,
          room_type
        ),
        photos (
          file_path,
          storage_path,
          is_featured,
          photo_order
        ),
        post_amenities (
          amenities (
            name,
            type
          )
        )
      `)
      .eq('post_id', params.id)
      .single()

    if (postError) {
      console.error('Error fetching post:', postError)
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Manually construct the public URLs for photos, mirroring the public API logic
    if (post.photos && post.photos.length > 0) {
      const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (storageUrl) {
        post.photos = post.photos.map((photo: any) => {
          let finalPath = photo.storage_path || photo.file_path
          if (!finalPath || finalPath.includes('storage/v1/object')) {
            return photo // It's already a full URL
          }
          finalPath = finalPath.replace(/^\/+/, '')
          
          // Ensure the correct bucket name is part of the path
          if (!finalPath.startsWith('dwelly-listings/')) {
            finalPath = `dwelly-listings/${finalPath}`
          }

          return {
            ...photo,
            file_path: `${storageUrl}/storage/v1/object/public/${finalPath}`
          }
        })
      }
    }

    // Fallback to fetch user data if the join didn't return it
    if (!post.users && post.user_id) {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, phone_number, email')
            .eq('user_id', post.user_id)
            .single();

        if (userData) {
            post.users = userData;
        } else if (userError) {
            console.error('Error fetching user data fallback:', userError);
        }
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error in post details route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post details' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authClient = createClient()

    // 1. Authenticate and authorize the user
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
    
    // 2. Use the Service Client for the update operation
    const supabase = createServiceClient()
    const { action, reason } = await request.json()
    const { id: postId } = params

    // Get current post data for audit logging
    const { data: currentPost } = await supabase
      .from('posts')
      .select('approval_status, title, user_id')
      .eq('post_id', postId)
      .single()

    let updateData: any = { updated_at: new Date().toISOString() }
    let responseMessage = ''
    let auditAction: 'approve_post' | 'reject_post' | 'archive_post' | 'delete_post'

    switch (action) {
      case 'approve':
        updateData = { 
          ...updateData,
          approval_status: 'approved', 
          approved_at: new Date().toISOString(),
          approved_by: user.id
        }
        responseMessage = 'Listing approved successfully'
        auditAction = 'approve_post'
        break
      case 'reject':
        updateData = { 
          ...updateData,
          approval_status: 'rejected', 
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason
        }
        responseMessage = 'Listing rejected successfully'
        auditAction = 'reject_post'
        break
      case 'archive':
        updateData = {
          ...updateData,
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          rejection_reason: reason // Can reuse reason field for archive notes
        }
        responseMessage = 'Listing archived successfully'
        auditAction = 'archive_post'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('post_id', postId)

    if (error) {
      console.error(`Failed to ${action} listing:`, error)
      return NextResponse.json({ error: `Failed to ${action} listing`, details: error.message }, { status: 500 })
    }

    // Log the admin action to audit table
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logPostAction(
      user.id,
      auditAction,
      postId,
      currentPost ? {
        approval_status: currentPost.approval_status,
        title: currentPost.title
      } : undefined,
      updateData,
      {
        reason: reason || null,
        target_user_id: currentPost?.user_id,
        ...requestMetadata
      }
    )

    return NextResponse.json({ message: responseMessage })
  } catch (error) {
    console.error('Unexpected error in PATCH handler:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
} 