"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  useEffect(() => {
    // Redirect to combined auth page in register mode, preserving redirectTo parameter
    const authUrl = redirectTo ? `/auth?mode=register&redirectTo=${encodeURIComponent(redirectTo)}` : '/auth?mode=register'
    router.replace(authUrl)
  }, [router, redirectTo])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
} 