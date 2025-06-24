"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Filter, X } from 'lucide-react'

interface RoomType {
  type_name: string
  display_name: string
}

interface SearchParams {
  [key: string]: string | undefined
}

interface SearchSectionProps {
  roomTypes: RoomType[]
  searchParams: SearchParams
}

export function SearchSection({ roomTypes, searchParams }: SearchSectionProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.search || '')
  const [barangay, setBarangay] = useState(searchParams.barangay || '')
  const [roomType, setRoomType] = useState(searchParams.type_id || '')
  const [priceMin, setPriceMin] = useState(searchParams.min_price || '')
  const [priceMax, setPriceMax] = useState(searchParams.max_price || '')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (barangay) params.set('barangay', barangay)
    if (roomType) params.set('type_id', roomType)
    if (priceMin) params.set('min_price', priceMin)
    if (priceMax) params.set('max_price', priceMax)
    
    // Keep view if it exists
    const currentView = searchParams.view
    if (currentView) params.set('view', currentView)
    
    router.push(`/listings?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setBarangay('')
    setRoomType('')
    setPriceMin('')
    setPriceMax('')
    
    // Keep view if it exists
    const params = new URLSearchParams()
    const currentView = searchParams.view
    if (currentView) params.set('view', currentView)
    
    router.push(`/listings?${params.toString()}`)
  }

  const hasActiveFilters = search || barangay || roomType || priceMin || priceMax

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Main Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title, location, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              Search
            </Button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Barangay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barangay
                </label>
                <Input
                  placeholder="Enter barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All types</option>
                  {roomTypes.map((type:any) => (
                    <option key={type.id || type.type_name} value={type.id}>
                      {type.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Min */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price (₱)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>

              {/* Price Max */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price (₱)
                </label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
              </div>
              
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </Button>
                )}
                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 