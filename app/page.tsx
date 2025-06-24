import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // If no user is authenticated, redirect to auth page
  if (!user || authError) {
    redirect('/auth')
  }

  // Check if user is admin
  if (user.email === 'spacely.main@gmail.com' || user.email?.includes('admin')) {
    redirect('/admin/dashboard')
  }

  // Check user profile for admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    redirect('/admin/dashboard')
  }

  // Redirect regular users to listings page
  redirect('/listings')
}

export const metadata = {
  title: 'SPACELY - Affordable Nearby Rentals',
  description: 'Share and discover budget-friendly rental spaces near Mapua Malayan Colleges Mindanao. Students and staff helping each other find affordable rental solutions.',
} 