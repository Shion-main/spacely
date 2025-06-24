import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Get the authenticated user
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service client to fetch profile with department and course names (bypasses RLS)
    const serviceClient = createServiceClient()
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select(`
        *,
        departments (
          name
        ),
        courses (
          name
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
    
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { full_name, phone_number, year_level, department_id, course_id, password, old_password } = await request.json()

    // Update profile fields
    const updates: any = {}
    if (full_name !== undefined) updates.full_name = full_name
    if (phone_number !== undefined) updates.phone_number = phone_number
    if (year_level !== undefined) updates.year_level = year_level
    if (department_id !== undefined) updates.department_id = department_id
    if (course_id !== undefined) updates.course_id = course_id

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // Update password if provided
    if (password) {
      if (!old_password) {
        return NextResponse.json({ error: 'Old password required' }, { status: 400 })
      }

      // verify old password
      // @ts-ignore: allow passing old_password after runtime check
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: String(old_password) })
      if (verifyError) {
        return NextResponse.json({ error: 'Old password is incorrect' }, { status: 403 })
      }

      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) {
        console.error('Password update error:', pwError)
        return NextResponse.json({ error: 'Failed to update password', details: pwError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile PATCH API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 