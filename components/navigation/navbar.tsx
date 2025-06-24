"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { Menu, X, Home, Plus, Heart, User, Shield, LogOut, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { SearchBar } from './search-bar'

interface RoomType {
  type_name: string
  display_name: string
}

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
  }

  const navLinks = [
    { href: '/listings', label: 'Home', icon: Home },
    ...(user ? [
      { href: '/listings/create', label: 'Create Listing', icon: Plus },
      { href: '/favorites', label: 'Favorites', icon: Heart },
    ] : []),
    ...(profile?.role === 'admin' ? [
      { href: '/admin/dashboard', label: 'Admin', icon: Shield },
    ] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo */}
          <div className="flex items-center">
            <Link 
              href={profile?.role === 'admin' || profile?.role === 'super_admin' ? '/admin/dashboard' : '/listings'} 
              className="flex items-center space-x-2 sm:space-x-3"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base sm:text-lg">S</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                SPACELY
              </span>
            </Link>
          </div>

          {/* Center Section: Search and Nav Links */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-blue-50 text-blue-700"
                      : "spacely-text-primary hover:text-blue-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Section: User Actions */}
          <div className="hidden lg:flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm spacely-text-muted">
                  Hi, {profile?.full_name?.split(' ')[0] || 'User'}!
                </span>
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1 spacely-text-primary hover:text-blue-600 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="spacely-text-primary">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="spacely-btn-primary">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200">
          <div className="px-3 sm:px-4 pt-2 pb-3 space-y-1 bg-white">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                  pathname === href
                    ? "bg-blue-50 text-blue-700"
                    : "spacely-text-primary hover:text-blue-600 hover:bg-gray-50"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
            
            <div className="pt-4 border-t border-gray-200">
              {user ? (
                <div className="space-y-3">
                  <div className="px-3 py-2">
                    <p className="text-sm spacely-text-muted">Signed in as</p>
                    <p className="text-sm font-medium spacely-text-primary">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs spacely-text-muted">{profile?.email}</p>
                  </div>
                  <Link href="/profile" className="block mx-3">
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-center space-x-2 spacely-text-primary hover:text-blue-600 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full mx-3 flex items-center justify-center space-x-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 px-3">
                  <Link href="/auth/login" className="block">
                    <Button variant="ghost" className="w-full spacely-text-primary" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="block">
                    <Button className="w-full spacely-btn-primary" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 