"use client"

import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function HomeClient() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If no user is authenticated, redirect to auth page
      if (!user) {
        router.replace('/auth')
        return
      }

      // Check if user is admin based on email or profile role
      if (user.email === 'spacely.main@gmail.com' || 
          user.email?.includes('admin') || 
          profile?.role === 'admin' || 
          profile?.role === 'super_admin') {
        router.replace('/admin/dashboard')
        return
      }

      // Redirect regular users to listings page
      router.replace('/listings')
    }
  }, [loading, user, profile, router])

  // Show loading state while determining redirect
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
            SPACELY
          </h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return null
} 