import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { AuditLogger } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create client for authentication
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      console.error('Admin login auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    // Verify admin role using service client
    const serviceClient = createServiceClient()
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('role, email, full_name')
      .eq('user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has admin role
    if (!['admin', 'super_admin'].includes(userData.role)) {
      console.error('User does not have admin role:', userData.role)
      
      // Sign out the user since they're not an admin
      await supabase.auth.signOut()
      
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    console.log('✅ Admin login successful:', userData.email)
    
    // Log admin login to audit table
    const requestMetadata = AuditLogger.extractRequestMetadata(request)
    await AuditLogger.logLogin(authData.user.id, {
      email: userData.email,
      name: userData.full_name,
      role: userData.role,
      ...requestMetadata
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: userData.email,
        name: userData.full_name,
        role: userData.role
      }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 