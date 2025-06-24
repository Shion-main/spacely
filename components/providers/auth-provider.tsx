"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: any
    status?: 'success' | 'blocked' | 'failed'
    profile?: UserProfile
  }>
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const isSigningIn = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[AuthProvider] Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthProvider] Session error:', error)
          setLoading(false)
          return
        }
        
        console.log('[AuthProvider] Initial session:', !!session?.user)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('[AuthProvider] Fetching profile for initial session...')
          await fetchUserProfile(session.user.id)
        }
        
        // Always set loading to false after session check
        setLoading(false)
      } catch (error) {
        console.error('[AuthProvider] Error getting initial session:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If a sign-in process is happening, let it handle the profile logic
        // to avoid race conditions.
        if (isSigningIn.current) {
          return
        }

        console.log('[AuthProvider] Auth state change:', event, !!session?.user)
        
        // Don't set loading back to true for auth state changes
        // as this can cause unnecessary loading states
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('[AuthProvider] User authenticated, fetching profile...')
          await fetchUserProfile(session.user.id)
        } else {
          console.log('[AuthProvider] No user, clearing profile')
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('[AuthProvider] Fetching profile for user:', userId)
      
      // Use API endpoint to fetch profile (bypasses RLS issues)
      const response = await fetch('/api/auth/profile')
      
      if (!response.ok) {
        console.error('[AuthProvider] Profile API error:', response.status, response.statusText)
        return
      }
      
      const { profile } = await response.json()
      
      if (!profile) {
        console.error('[AuthProvider] No profile data returned')
        return
      }

      // If the account is blocked, immediately sign out and prevent app access
      if (profile.is_blocked) {
        console.warn('[AuthProvider] Blocked user detected on load. Signing out...')
        // Only show toast if it's NOT during the sign-in process,
        // which has its own toast mechanism.
        if (!isSigningIn.current) {
          const toast = (await import('react-hot-toast')).default
          toast.error('Your account has been blocked. Please contact support.')
        }
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.replace('/auth')
        }
        return
      }

      console.log('[AuthProvider] Profile fetched successfully:', profile)
      setProfile(profile)
    } catch (error) {
      console.error('[AuthProvider] Error fetching user profile:', error)
    }
  }

  const signIn = async (
    email: string,
    password: string
  ): Promise<{
    error: any
    status?: 'success' | 'blocked' | 'failed'
    profile?: UserProfile
  }> => {
    isSigningIn.current = true
    try {
      // 1. Sign in with Supabase
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (signInError) {
        return { error: signInError, status: 'failed' }
      }

      if (!signInData.user) {
        return {
          error: { message: 'Sign in failed, no user returned.' },
          status: 'failed',
        }
      }

      // 2. Fetch profile directly from client to check status.
      // This is more reliable than an API fetch right after login.
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*, departments(name), courses(name)')
        .eq('user_id', signInData.user.id)
        .single()

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        return {
          error: profileError || { message: 'Could not verify user status.' },
          status: 'failed',
        }
      }

      // 3. Check if the user is blocked
      if (profileData.is_blocked) {
        await supabase.auth.signOut()
        return { error: null, status: 'blocked' }
      }

      // 4. User is valid, set state
      setUser(signInData.user)
      setProfile(profileData)

      return { error: null, status: 'success', profile: profileData }
    } catch (error: any) {
      console.error('Unexpected error during sign in:', error)
      return { error, status: 'failed' }
    } finally {
      isSigningIn.current = false
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return { error: authError }
    }

    // If auth user was created, create the profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: authData.user.id,
          email: authData.user.email!,
          ...userData,
        })

      if (profileError) {
        // If profile creation fails, we should ideally delete the auth user
        // but for now just return the error
        return { error: profileError }
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    try {
      console.log('[AuthProvider] Starting sign out process...')
      
      // The only thing needed is to call signOut and Supabase handles the session clearing.
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthProvider] Sign out error:', error)
        // Even if there's an error, we should try to redirect.
      }

      // Use replace to prevent back navigation to authenticated state.
      // The onAuthStateChange listener will handle clearing user/profile state.
      window.location.replace('/auth')
      
      return { error: null }
    } catch (error) {
      console.error('[AuthProvider] Unexpected error during sign out:', error)
      return { error }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 