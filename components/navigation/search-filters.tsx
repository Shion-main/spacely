"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, X } from 'lucide-react'

interface RoomType {
  type_name: string
  display_name: string
}

interface SearchFiltersProps {
  roomTypes?: RoomType[]
  isOpen: boolean
  onClose: () => void
}

export function SearchFilters({ roomTypes = [], isOpen, onClose }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [roomType, setRoomType] = useState(searchParams.get('room_type') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '')

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (city) params.set('city', city)
    else params.delete('city')
    
    if (roomType) params.set('room_type', roomType)
    else params.delete('room_type')
    
    if (priceMin) params.set('price_min', priceMin)
    else params.delete('price_min')
    
    if (priceMax) params.set('price_max', priceMax)
    else params.delete('price_max')
    
    // Reset to first page when applying filters
    params.delete('page')
    
    router.push(`/listings?${params.toString()}`)
    onClose()
  }

  const clearFilters = () => {
    setCity('')
    setRoomType('')
    setPriceMin('')
    setPriceMax('')
    
    const params = new URLSearchParams()
    const search = searchParams.get('search')
    const view = searchParams.get('view')
    
    if (search) params.set('search', search)
    if (view) params.set('view', view)
    
    router.push(`/listings?${params.toString()}`)
    onClose()
  }

  const hasActiveFilters = city || roomType || priceMin || priceMax

  if (!isOpen) return null

  return (
    <div className="absolute top-full left-0 mt-2 w-96 z-50">
      <Card className="shadow-lg border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <Input
                placeholder="Enter city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                {roomTypes.map((type) => (
                  <option key={type.type_name} value={type.type_name}>
                    {type.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-2">
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
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <div className="text-sm text-gray-600">
              {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
            </div>
            
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleApplyFilters}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 