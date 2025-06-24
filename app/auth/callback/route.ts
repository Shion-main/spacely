import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const redirectTo = searchParams.get('redirectTo')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If there's a specific redirectTo parameter, use it
      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
      
      // Otherwise, redirect to auth page with success message
      return NextResponse.redirect(`${origin}/auth?message=verification_success`)
    }
  }

  // If there's an error or no code, redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=verification_failed`)
} 