"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Map } from 'lucide-react'
import Link from 'next/link'

function ViewToggleInner({ isMobile = false }) {
  const searchParams = useSearchParams()
  const [currentView, setCurrentView] = useState('list')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentView(searchParams.get('view') || 'list')
  }, [searchParams])

  if (!mounted) {
    if (isMobile) {
      return (
        <div className="flex rounded-md">
          <Button variant="ghost" size="sm" className="rounded-r-none border-0" disabled>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-l-none border-0" disabled>
            <Map className="w-4 h-4" />
          </Button>
        </div>
      )
    }
    return (
      <div className="fixed top-24 right-6 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
        <div className="flex rounded-md">
          <Button variant="ghost" size="sm" className="rounded-r-none border-0" disabled>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-l-none border-0" disabled>
            <Map className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Build URL for view toggle
  const buildViewUrl = (newView: 'list' | 'map') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', newView)
    
    // Reset to page 1 when switching views
    if (newView === 'list') {
      params.set('page', '1')
    } else {
      params.delete('page')
    }
    
    return `/listings?${params.toString()}`
  }

  const toggleComponent = (
    <div className="relative flex rounded-md">
      {/* Sliding background indicator */}
      <div 
        className={`absolute top-0 h-full w-1/2 bg-blue-600 rounded-md transition-transform duration-300 ease-in-out ${
          currentView === 'map' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      
      <Link href={buildViewUrl('list')}>
        <Button
          variant="ghost"
          size="sm"
          className={`relative z-10 rounded-r-none border-0 transition-colors duration-300 ${
            currentView === 'list' 
              ? 'text-white hover:text-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-transparent'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </Link>
      <Link href={buildViewUrl('map')}>
        <Button
          variant="ghost"
          size="sm"
          className={`relative z-10 rounded-l-none border-0 transition-colors duration-300 ${
            currentView === 'map' 
              ? 'text-white hover:text-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-transparent'
          }`}
        >
          <Map className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  )

  if (isMobile) {
    return toggleComponent
  }

  return (
    <div className="hidden md:block fixed top-24 right-6 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
      {toggleComponent}
    </div>
  )
}

export function ViewToggle() {
  return (
    <Suspense fallback={
      <div className="hidden md:block fixed top-24 right-6 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
        <div className="flex rounded-md">
          <Button variant="ghost" size="sm" className="rounded-r-none border-0">
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-l-none border-0">
            <Map className="w-4 h-4" />
          </Button>
        </div>
      </div>
    }>
      <ViewToggleInner />
    </Suspense>
  )
}

export function MobileViewToggle() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-lg border border-gray-200 p-1">
        <div className="flex rounded-md">
          <Button variant="ghost" size="sm" className="rounded-r-none border-0">
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-l-none border-0">
            <Map className="w-4 h-4" />
          </Button>
        </div>
      </div>
    }>
      <ViewToggleInner isMobile={true} />
    </Suspense>
  )
} 