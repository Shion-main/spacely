"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AdminAuthProvider, useAdminAuth } from '@/components/providers/admin-auth-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  Menu,
  Home, 
  Clock, 
  Users, 
  Flag, 
  LogOut, 
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { isAdmin, loading, signOut } = useAdminAuth()
  const { user } = useAuth() // Get user from main auth provider
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // If not admin, this will be handled by the AdminAuthProvider redirect
  if (!isAdmin) {
    return null
  }

  const isLinkActive = (href: string) => {
    if (href === '/admin/pending-listings') {
      return pathname === href || pathname.startsWith('/admin/pending-listings/')
    }
    if (href === '/admin/reports') {
      return pathname === href || pathname.startsWith('/admin/reports/')
    }
    return pathname === href
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Toast and redirect are handled in the auth provider
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const adminNavLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: TrendingUp },
    { href: '/admin/pending-listings', label: 'Pending Posts', icon: Clock },
    { href: '/admin/users', label: 'Users', icon: Users, active: pathname === '/admin/users' },
    { href: '/admin/listings', label: 'Listings', icon: Home, active: pathname === '/admin/listings' },
    { href: '/admin/reports', label: 'Reports', icon: Flag },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200 z-40 flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                SPACELY
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {adminNavLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isLinkActive(href)
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full flex items-center justify-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {/* Mobile menu button */}
                  <button className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}>
                    <Menu className="w-6 h-6 text-gray-700" />
                  </button>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Admin Dashboard
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Welcome back,
                  </p>
                  <p className="font-semibold text-gray-900">
                    Administrator
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold">
                    A
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  )
} 