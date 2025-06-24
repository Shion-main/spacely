import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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
    const searchParams = new URL(request.url).searchParams
    const search = searchParams.get('search')
    const month = searchParams.get('month')
    const status = searchParams.get('status')

    let query = supabase
      .from('posts')
      .select(`
        post_id,
        title,
        created_at,
        approval_status,
        is_deleted,
        deleted_at,
        deletion_reason,
        users!posts_user_id_fkey (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,users.full_name.ilike.%${search}%`)
    }

    // Apply month filter
    if (month) {
      const startDate = new Date(month)
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      query = query.gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    }

    // Apply status filter
    if (status) {
      switch (status) {
        case 'active':
          query = query.eq('is_deleted', false).eq('approval_status', 'approved')
          break
        case 'deleted':
          query = query.eq('is_deleted', true)
          break
        case 'pending':
          query = query.eq('is_deleted', false).eq('approval_status', 'pending')
          break
        case 'rejected':
          query = query.eq('is_deleted', false).eq('approval_status', 'rejected')
          break
      }
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching listings:', error)
      throw error
    }

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error in listings route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
} 