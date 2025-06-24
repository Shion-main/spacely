import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

export const revalidate = 30

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch report with related post and user information
    const { data: report, error } = await supabase
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
        posts:posts!inner (
          post_id,
          title,
          description,
          price,
          city,
          barangay,
          street,
          building_name,
          unit_number,
          landlord_name,
          contact_number,
          social_link,
          page_link,
          maps_link,
          approval_status,
          created_at,
          is_deleted,
          status,
          amenities,
          room_types (
            display_name
          ),
          rooms (
            number_of_rooms,
            bathroom_type
          ),
          photos (
            file_path,
            storage_path,
            is_featured,
            photo_order
          )
        ),
        reporter:reporter_id (
          full_name,
          email
        )
      `)
      .eq('report_id', params.id)
      .single()

    if (error) {
      console.error('Error fetching report:', error)
      return NextResponse.json(
        { error: 'Failed to fetch report', details: error.message },
        { status: 500 }
      )
    }

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    console.log('[Admin Report API] 1. After initial query:', JSON.stringify(report, null, 2));

    // Fallback to check storage if photos are not in the database
    if (report.posts && (!report.posts[0]?.photos || report.posts[0].photos.length === 0)) {
      const { data: files, error: storageError } = await supabase
        .storage
        .from('dwelly-listings')
        .list(`listings/${report.post_id}`)

      if (storageError) {
        console.error('[Admin Report API] Error listing files from storage:', storageError)
      } else if (files && files.length > 0) {
        report.posts[0].photos = files.map((file, index) => ({
          file_path: file.name,
          storage_path: `listings/${report.post_id}/${file.name}`,
          is_featured: index === 0,
          photo_order: index
        }))
      }
    }

    // Transform photo URLs to be absolute
    if (report.posts && report.posts[0]?.photos) {
      const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (storageUrl) {
        report.posts[0].photos = report.posts[0].photos.map((photo: any) => {
          // If the path is already a full URL, return it as is
          if (photo.file_path.startsWith('http')) {
            return photo
          }
          
          let finalPath = photo.storage_path || photo.file_path
          
          // Ensure we don't double-prefix and path is within the correct bucket
          if (finalPath.includes('storage/v1/object')) {
             return { ...photo, file_path: finalPath }
          }
          
          finalPath = finalPath.replace(/^\/+/, '')
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

    console.log('[Admin Report API] 4. Final report object being sent:', JSON.stringify(report, null, 2));

    // Log sensitive data access
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logDataAccess(
      user.id,
      'view_report_details',
      {
        report_id: params.id,
        ...requestMetadata
      }
    )

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error in report details API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { status, post_id, admin_notes, post_approval_status } = body
    const supabase = createServiceClient()
    const requestMetadata = AuditLogger.extractRequestMetadata(request)

    // Handle updating just the post's approval status
    if (post_approval_status && post_id) {
      if (post_approval_status !== 'under_review') {
        return NextResponse.json({ error: 'Invalid post approval status provided.' }, { status: 400 })
      }

      // 1. Update post status
      const { data: post, error: postUpdateError } = await supabase
        .from('posts')
        .update({ approval_status: post_approval_status })
        .eq('post_id', post_id)
        .select('approval_status')
        .single()

      if (postUpdateError) {
        console.error('Error updating post status to under_review:', postUpdateError)
        return NextResponse.json({ error: 'Failed to update listing status', details: postUpdateError.message }, { status: 500 })
      }
      
      // 2. Update report status to 'reviewed'
      const { data: report, error: reportUpdateError } = await supabase
        .from('reports')
        .update({ status: 'reviewed' })
        .eq('report_id', params.id)
        .select('status')
        .single()
        
      if (reportUpdateError) {
        console.error('Error updating report status to reviewed:', reportUpdateError)
        // Note: Don't block if this fails, post status update is more critical
      }

      // 3. Log actions
      await AuditLogger.logPostAction(
        user.id,
        'update_post_status',
        post_id,
        { approval_status: post.approval_status },
        { approval_status: post_approval_status },
        { ...requestMetadata, reason: 'Admin review following a user report.' }
      )
      
      if (report && !reportUpdateError) {
        await AuditLogger.logReportAction(
          user.id,
          'update_report_status',
          params.id,
          { status: report.status },
          { status: 'reviewed' },
          { ...requestMetadata, reason: 'Automatically marked as reviewed.' }
        )
      }
      
      revalidatePath('/admin/reports')
      revalidatePath('/api/admin/reports')
      return NextResponse.json({ message: 'Post status updated and report marked as reviewed.' })
    }


    // Handle updating the report status (and potentially the post)
    if (status) {
      if (!['resolved', 'dismissed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }

      // 1. Archive the listing if the report is resolved
      if (status === 'resolved' && post_id) {
        const { error: postUpdateError } = await supabase
          .from('posts')
          .update({ is_deleted: true, approval_status: 'archived' })
          .eq('post_id', post_id)

        if (postUpdateError) {
          console.error('Error archiving post:', postUpdateError)
          return NextResponse.json(
            { error: 'Failed to archive listing', details: postUpdateError.message },
            { status: 500 }
          )
        }
      }

      // 1b. Re-enable listing if report is dismissed
      if (status === 'dismissed' && post_id) {
        const { data: prevPost, error: revertError } = await supabase
          .from('posts')
          .update({ approval_status: 'approved', is_deleted: false })
          .eq('post_id', post_id)
          .select('approval_status')
          .single()

        if (revertError) {
          console.error('Error reverting post status:', revertError)
          return NextResponse.json(
            { error: 'Failed to revert listing status', details: revertError.message },
            { status: 500 }
          )
        }

        // audit log
        await AuditLogger.logPostAction(
          user.id,
          'update_post_status',
          post_id,
          { approval_status: prevPost?.approval_status ?? 'under_review' },
          { approval_status: 'approved' },
          { reason: 'Report dismissed', ...requestMetadata }
        )
      }

      // 2. Update report status
      const resolved_at = new Date().toISOString()

      const { data: report, error: updateError } = await supabase
        .from('reports')
        .update({
          status,
          resolved_at,
          admin_notes
        })
        .eq('report_id', params.id)
        .select('status') // Select old status for logging
        .single()

      if (updateError) {
        console.error('Error updating report:', updateError)
        return NextResponse.json(
          { error: 'Failed to update report', details: updateError.message },
          { status: 500 }
        )
      }

      // 3. Log admin action
      await AuditLogger.logReportAction(
        user.id,
        'update_report_status',
        params.id,
        { status: report.status }, // old status
        { status: status }, // new status
        { 
          admin_notes,
          post_id: post_id,
          archived_post: status === 'resolved',
          ...requestMetadata
        }
      )

      revalidatePath('/admin/reports')
      revalidatePath('/api/admin/reports')
      return NextResponse.json({ message: `Report status updated to ${status}` })
    }

    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })

  } catch (error) {
    console.error('Error in PATCH report API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
