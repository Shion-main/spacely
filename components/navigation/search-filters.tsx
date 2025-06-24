"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, X } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { DAVAO_BARANGAYS } from '@/lib/davao-barangays'

interface RoomType {
  type_id: number
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
  
  const [barangay, setBarangay] = useState(searchParams.get('barangay') || '')
  const [roomType, setRoomType] = useState(searchParams.get('type_id') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('min_price') || searchParams.get('price_min') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('max_price') || searchParams.get('price_max') || '')

  const PRICE_OPTIONS = [
    { label: 'No minimum', value: '' },
    { label: '₱1,000', value: '1000' },
    { label: '₱5,000', value: '5000' },
    { label: '₱10,000', value: '10000' },
    { label: '₱20,000', value: '20000' },
    { label: '₱30,000', value: '30000' }
  ]

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (barangay) params.set('barangay', barangay)
    else params.delete('barangay')
    
    if (roomType) params.set('type_id', roomType)
    else params.delete('type_id')
    
    if (priceMin) params.set('min_price', priceMin)
    else params.delete('min_price')
    
    if (priceMax) params.set('max_price', priceMax)
    else params.delete('max_price')
    
    // Clean up old parameter names for backward compatibility
    params.delete('city')
    params.delete('room_type')
    params.delete('price_min')
    params.delete('price_max')
    
    // Reset to first page when applying filters
    params.delete('page')
    
    router.push(`/listings?${params.toString()}`)
    onClose()
  }

  const clearFilters = () => {
    setBarangay('')
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

  const hasActiveFilters = barangay || roomType || priceMin || priceMax

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
            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barangay
              </label>
              <Combobox
                options={DAVAO_BARANGAYS.map(b => ({ label: b, value: b }))}
                value={barangay}
                onChange={setBarangay}
                placeholder="Search and select a barangay..."
                searchPlaceholder="Search barangay..."
                emptyPlaceholder="No barangay found."
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
                  <option key={type.type_id} value={type.type_id}>
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
                <select
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PRICE_OPTIONS.map(opt => (
                    <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price (₱)
                </label>
                <select
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PRICE_OPTIONS.map(opt => (
                    <option key={opt.value || 'none'} value={opt.value}>{opt.value === '' ? 'No limit' : opt.label}</option>
                  ))}
                </select>
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