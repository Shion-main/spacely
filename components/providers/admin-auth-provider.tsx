"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-provider' // Use the main AuthProvider

interface AdminAuthContextType {
  isAdmin: boolean
  loading: boolean
  signOut: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, signOut: mainSignOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('[AdminAuthProvider] Auth state:', { 
        user: !!user, 
        profile: !!profile, 
        authLoading,
        pathname: window.location.pathname 
      })
      
      // If auth is still loading, keep our loading state true but don't do anything else
      if (authLoading) {
        return
      }

      // No user means not admin
      if (!user) {
        console.log('[AdminAuthProvider] No user found')
        setIsAdmin(false)
        setLoading(false)
        
        // If on admin pages, redirect to auth
        if (window.location.pathname.startsWith('/admin')) {
          router.replace('/auth')
        }
        return
      }

      // Check if user is admin by email first (system admin)
      const isAdminEmail = user.email === 'spacely.main@gmail.com' || user.email?.includes('admin')
      
      if (isAdminEmail) {
        console.log('[AdminAuthProvider] System admin detected:', { email: user.email })
        setIsAdmin(true)
        setLoading(false)
        return
      }
      
      // For non-system admins, check profile role if available
      if (profile) {
        const isAdminProfile = profile.role === 'admin' || profile.role === 'super_admin'
        
        if (isAdminProfile) {
          console.log('[AdminAuthProvider] Profile admin detected:', { email: user.email, role: profile.role })
          setIsAdmin(true)
          setLoading(false)
          return
        } else {
          // Profile exists but user is not admin
          console.log('[AdminAuthProvider] User is not admin:', { email: user.email, role: profile.role })
          setIsAdmin(false)
          setLoading(false)
          
          // Only redirect if we're on admin pages and confirmed not admin
          if (window.location.pathname.startsWith('/admin')) {
            router.replace('/?error=forbidden')
          }
          return
        }
      }

      // If we get here, we have a user but no profile yet
      // Set a short timeout to wait for profile
      const timeoutId = setTimeout(() => {
        if (!profile) {
          console.log('[AdminAuthProvider] Profile fetch timeout, denying access')
          setIsAdmin(false)
          setLoading(false)
          if (window.location.pathname.startsWith('/admin')) {
            router.replace('/?error=forbidden')
          }
        }
      }, 2000) // Reduced timeout to 2 seconds

      return () => clearTimeout(timeoutId)
    }

    checkAdminStatus()
  }, [user, profile, authLoading, router])
  
  const signOut = async () => {
    setLoading(true)
    await mainSignOut()
    setIsAdmin(false)
    router.replace('/auth')
  }

  // If we're not on an admin page, don't show loading state
  if (!window.location.pathname.startsWith('/admin')) {
    return <AdminAuthContext.Provider value={{ isAdmin, loading: false, signOut }}>{children}</AdminAuthContext.Provider>
  }

  const value = {
    isAdmin,
    loading: authLoading || loading,
    signOut,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
} 