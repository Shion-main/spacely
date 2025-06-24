import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { userRegistrationSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = userRegistrationSchema.parse(body)
    
    // Sanitize input
    const sanitizedData = {
      ...validatedData,
      full_name: sanitizeText(validatedData.full_name, { maxLength: 100 }),
    }

    const supabase = createClient()
    const serviceClient = createServiceClient()

    // Check if user already exists
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('user_id, email, id_number')
      .or(`email.eq.${sanitizedData.email},id_number.eq.${sanitizedData.id_number}`)
      .single()

    if (existingUser) {
      if (existingUser.email === sanitizedData.email) {
        return NextResponse.json(
          { error: 'Email address is already registered' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'ID Number is already registered' },
          { status: 400 }
        )
      }
    }

    // Format phone number with +63 prefix if not already present
    let formattedPhoneNumber = sanitizedData.phone_number
    if (!formattedPhoneNumber.startsWith('+63')) {
      formattedPhoneNumber = `+63${formattedPhoneNumber}`
    }

    // Create auth user using regular signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: sanitizedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/auth/callback`,
        data: {
          full_name: sanitizedData.full_name,
          role: sanitizedData.role,
        }
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile using service client to bypass RLS
    const { error: profileError } = await serviceClient
      .from('users')
      .insert({
        user_id: authData.user.id,
        full_name: sanitizedData.full_name,
        id_number: sanitizedData.id_number,
        role: sanitizedData.role,
        year_level: sanitizedData.year_level || null,
        department_id: sanitizedData.department_id || null,
        course_id: sanitizedData.course_id || null,
        email: sanitizedData.email,
        phone_number: formattedPhoneNumber,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Note: With regular signup, we can't easily delete the auth user
      // The user will need to verify their email before the account is fully active
      console.log('User auth account created but profile creation failed for:', authData.user.id)
      
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: authData.user.email_confirmed_at 
          ? 'Registration successful! Please login to continue.'
          : 'Registration successful! Please check your email to verify your account.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed: !!authData.user.email_confirmed_at
        }
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Registration error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 