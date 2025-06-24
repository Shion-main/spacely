"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  MapPin, 
  DollarSign, 
  Home, 
  Users, 
  Wifi,
  Car,
  Shield,
  Snowflake,
  Camera,
  Book
} from 'lucide-react'

interface RoomType {
  id: string
  type_name: string
  display_name: string
}

interface InitialFilters {
  q?: string
  type?: string
  min_price?: string
  max_price?: string
  city?: string
  barangay?: string
  rooms?: string
  bathroom?: string
  amenities?: string
  sort?: string
}

interface ListingsFiltersProps {
  roomTypes: RoomType[]
  cities: string[]
  amenities: string[]
  initialFilters: InitialFilters
}

const BATHROOM_TYPES = [
  { value: 'private', label: 'Private Bathroom' },
  { value: 'shared', label: 'Shared Bathroom' },
  { value: 'ensuite', label: 'Ensuite' }
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' }
]

const COMMON_AMENITIES = [
  { name: 'WiFi', icon: Wifi },
  { name: 'Parking', icon: Car },
  { name: 'Security', icon: Shield },
  { name: 'Air Conditioning', icon: Snowflake },
  { name: 'CCTV', icon: Camera },
  { name: 'Study Area', icon: Book }
]

export function ListingsFilters({ roomTypes, cities, amenities, initialFilters }: ListingsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    q: initialFilters.q || '',
    type: initialFilters.type || '',
    min_price: initialFilters.min_price || '',
    max_price: initialFilters.max_price || '',
    city: initialFilters.city || '',
    barangay: initialFilters.barangay || '',
    rooms: initialFilters.rooms || '',
    bathroom: initialFilters.bathroom || '',
    amenities: initialFilters.amenities ? initialFilters.amenities.split(',') : [],
    sort: initialFilters.sort || 'newest'
  })

  const updateUrl = (newFilters: typeof filters) => {
    const params = new URLSearchParams()
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        if (key === 'amenities' && Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','))
          }
        } else {
          // Map frontend parameter names to API parameter names
          let paramName = key
          if (key === 'type') paramName = 'type_id'
          if (key === 'q') paramName = 'search'
          
          params.set(paramName, value as string)
        }
      }
    })

    router.push(`/listings${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleFilterChange = (key: keyof typeof filters, value: string | string[]) => {
    const newFilters = {
      ...filters,
      [key]: value
    }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = filters.amenities
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity]
    
    handleFilterChange('amenities', newAmenities)
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      q: '',
      type: '',
      min_price: '',
      max_price: '',
      city: '',
      barangay: '',
      rooms: '',
      bathroom: '',
      amenities: [],
      sort: 'newest'
    }
    setFilters(clearedFilters)
    router.push('/listings')
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sort') return false
    if (key === 'amenities') return (value as string[]).length > 0
    return value !== ''
  })

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Search className="w-5 h-5 mr-2" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search listings..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Sort */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-5 h-5 mr-2" />
            Sort By
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filters.sort} onValueChange={(value) => handleFilterChange('sort', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Property Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Home className="w-5 h-5 mr-2" />
            Property Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filters.type || "all"} onValueChange={(value) => handleFilterChange('type', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {roomTypes.map((type) => (
                <SelectItem key={type.id} value={type.type_name}>
                  {type.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <MapPin className="w-5 h-5 mr-2" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
            <Input
              placeholder="Enter barangay..."
              value={filters.barangay}
              onChange={(e) => handleFilterChange('barangay', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <DollarSign className="w-5 h-5 mr-2" />
            Price Range (₱/month)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum</label>
            <Input
              type="number"
              placeholder="Min price"
              value={filters.min_price}
              onChange={(e) => handleFilterChange('min_price', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum</label>
            <Input
              type="number"
              placeholder="Max price"
              value={filters.max_price}
              onChange={(e) => handleFilterChange('max_price', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Users className="w-5 h-5 mr-2" />
            Room Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rooms</label>
            <Select value={filters.rooms || "any"} onValueChange={(value) => handleFilterChange('rooms', value === "any" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} room{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bathroom Type</label>
            <Select value={filters.bathroom || "any"} onValueChange={(value) => handleFilterChange('bathroom', value === "any" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {BATHROOM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {COMMON_AMENITIES.map(({ name, icon: Icon }) => (
              <div
                key={name}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  filters.amenities.includes(name)
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleAmenityToggle(name)}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{name}</span>
              </div>
            ))}
            
            {/* Additional amenities */}
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 mb-2">Selected amenities:</p>
              {filters.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filters.amenities.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleAmenityToggle(amenity)}
                    >
                      {amenity} ×
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">None selected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={clearAllFilters}
          className="w-full"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  )
} 