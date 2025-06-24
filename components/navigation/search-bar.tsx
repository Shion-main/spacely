"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'
import { SearchFilters } from './search-filters'

interface RoomType {
  type_name: string
  display_name: string
}

interface SearchBarProps {
  roomTypes?: RoomType[]
}

export function SearchBar({ roomTypes = [] }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize search state after component mounts to avoid hydration issues
  useEffect(() => {
    setMounted(true)
    setSearch(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const params = new URLSearchParams(searchParams.toString())
    
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    
    // Reset to first page when searching
    params.delete('page')
    
    router.push(`/listings?${params.toString()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Check if filters are active
  const hasActiveFilters = searchParams.get('city') || searchParams.get('room_type') || 
                          searchParams.get('price_min') || searchParams.get('price_max')

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="relative">
        <div className="flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              className="pl-10 pr-4 py-2 w-64 sm:w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              disabled
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 p-2 hover:bg-gray-100 text-gray-600"
            disabled
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-1 p-2 hover:bg-gray-100"
            disabled
          >
            <Search className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSearch} className="flex items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4 py-2 w-64 sm:w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-2 p-2 hover:bg-gray-100 ${hasActiveFilters ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
          )}
        </Button>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="ml-1 p-2 hover:bg-gray-100"
        >
          <Search className="w-4 h-4 text-gray-600" />
        </Button>
      </form>

      <SearchFilters 
        roomTypes={roomTypes}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  )
} 