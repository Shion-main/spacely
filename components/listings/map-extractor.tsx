"use client"

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface LocationData {
  street: string
  barangay: string
  city: string
  province: string
  formatted_address: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface MapExtractorProps {
  onLocationExtracted?: (location: LocationData) => void
  onCoordinatesExtracted?: (lat: number, lng: number) => void
  className?: string
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

type ExtractionStatus = 'idle' | 'extracting' | 'success' | 'error'

export function MapExtractor({ 
  onLocationExtracted, 
  onCoordinatesExtracted, 
  className, 
  value = '', 
  onChange 
}: MapExtractorProps) {
  const [status, setStatus] = useState<ExtractionStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isValidMapUrl = useCallback((url: string): boolean => {
    if (!url) return false
    const patterns = [
      /https?:\/\/(?:www\.)?google\.com\/maps/,
      /https?:\/\/maps\.google\.com/,
      /https?:\/\/maps\.app\.goo\.gl/,
      /https?:\/\/maps\.apple\.com/
    ]
    return patterns.some(pattern => pattern.test(url))
  }, [])

  const extractLocation = async () => {
    if (!value.trim() || !isValidMapUrl(value)) {
      toast.error('Please enter a valid map URL')
      return
    }

    setIsLoading(true)
    setStatus('extracting')
    setStatusMessage('Extracting location from map link...')

    try {
      const response = await fetch('/api/extract-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maps_link: value.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract location')
      }

      if (result.success) {
        setStatus('success')
        setStatusMessage('Location extracted successfully!')
        
        if (onLocationExtracted && result.location) {
          onLocationExtracted(result.location)
        }
        
        if (onCoordinatesExtracted && result.coordinates) {
          onCoordinatesExtracted(result.coordinates.lat, result.coordinates.lng)
        }

        toast.success('Location extracted and fields auto-filled!')
      } else {
        throw new Error(result.error || 'Could not extract location')
      }

    } catch (error: any) {
      console.error('Error extracting location:', error)
      setStatus('error')
      setStatusMessage(error.message || 'Failed to extract location')
      toast.error(error.message || 'Failed to extract location')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'extracting':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'extracting':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={extractLocation}
          disabled={isLoading || !isValidMapUrl(value)}
          className="flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">
            {isLoading ? 'Extracting...' : 'Extract'}
          </span>
        </Button>
        <Input
          type="url"
          value={value}
          onChange={onChange}
          placeholder="Paste Google or Apple Maps link to autofill location"
          className="flex-grow"
        />
      </div>

      {statusMessage && (
        <div className={`mt-2 flex items-center space-x-2 text-sm ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  )
} 