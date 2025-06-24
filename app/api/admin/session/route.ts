import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role using service client
    const serviceClient = createServiceClient()
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('role, email, full_name')
      .eq('user_id', user.id)
      .single()

    // If user doesn't exist in users table, check if they're a system admin
    if (userError || !userData) {
      // For system admins who don't have profiles, check if their email matches admin pattern
      if (user.email === 'spacely.main@gmail.com' || user.email?.includes('admin')) {
        return NextResponse.json({
          isAdmin: true,
          user: {
            id: user.id,
            email: user.email,
            name: 'Administrator',
            role: 'super_admin'
          }
        })
      }
      
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has admin role
    const isAdmin = ['admin', 'super_admin'].includes(userData.role)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      isAdmin: true,
      user: {
        id: user.id,
        email: userData.email,
        name: userData.full_name,
        role: userData.role
      }
    })

  } catch (error) {
    console.error('Admin session check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 