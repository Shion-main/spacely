import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reportSchema = z.object({
  post_id: z.string().uuid(),
  report_type: z.enum([
    'inappropriate_content',
    'spam',
    'fraud',
    'fake_listing',
    'harassment',
    'discrimination',
    'safety_concern',
    'other'
  ]),
  description: z.string().min(10).max(500)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    // Check if post exists and get owner info
    const { data: post } = await supabase
      .from('posts')
      .select('post_id, user_id')
      .eq('post_id', validatedData.post_id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Prevent owners from reporting their own posts
    if (post.user_id === user.id) {
      return NextResponse.json({ 
        error: 'You cannot report your own listing' 
      }, { status: 403 })
    }

    // Check if user has already reported this post
    const { data: existingReport } = await supabase
      .from('reports')
      .select('report_id')
      .eq('post_id', validatedData.post_id)
      .eq('reporter_id', user.id)
      .single()

    if (existingReport) {
      return NextResponse.json({ 
        error: 'You have already reported this listing' 
      }, { status: 409 })
    }

    // Create the report using service client to bypass potential RLS issues
    const serviceClient = createServiceClient()
    const { data: report, error } = await serviceClient
      .from('reports')
      .insert({
        post_id: validatedData.post_id,
        reporter_id: user.id,
        type: validatedData.report_type,
        reason: validatedData.description,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Report submitted successfully',
      report_id: report.report_id
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in reports API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 