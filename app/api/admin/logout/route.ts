import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuditLogger } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    console.log('Admin logout endpoint called')
    
    // Get current user for audit logging
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    
    // Log admin logout if user is authenticated
    if (user) {
      const requestMetadata = AuditLogger.extractRequestMetadata(request)
      await AuditLogger.logLogout(user.id, {
        logout_reason: 'manual',
        ...requestMetadata
      })
    }
    
    // Create response
    const response = NextResponse.json({ message: 'Admin logged out successfully' })
    
    // Clear the admin session cookie
    response.cookies.set('adminSession', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0) // Set to past date to delete cookie
    })
    
    console.log('Admin session cookie cleared')
    return response
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 