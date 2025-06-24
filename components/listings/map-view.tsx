"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Google Maps loader with better error handling
const loadGoogleMaps = async () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
  }

  // Check if Google Maps is already loaded
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return window.google
  }

  try {
    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places', 'marker']
    })
    
    return await loader.load()
  } catch (error) {
    console.error('Failed to load Google Maps:', error)
    throw error
  }
}

interface MapViewProps {
  onLocationSelect?: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
  className?: string
  readonly?: boolean
}

export function MapView({ onLocationSelect, initialLat = 7.0633, initialLng = 125.5956, className, readonly = false }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null)
  const [schoolMarker, setSchoolMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Validate coordinates to prevent NaN errors
  const validateCoordinates = (lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180
  }

  // Update marker position when coordinates change from outside (map extraction)
  useEffect(() => {
    if (marker && validateCoordinates(initialLat, initialLng)) {
      marker.position = { lat: initialLat, lng: initialLng }
      if (map) {
        map.setCenter({ lat: initialLat, lng: initialLng })
      }
    }
  }, [initialLat, initialLng, marker, map])

  useEffect(() => {
    const initMap = async () => {
      try {
        const google = await loadGoogleMaps()
        
        if (!mapRef.current) return

        // Validate initial coordinates
        const centerLat = validateCoordinates(initialLat, initialLng) ? initialLat : 7.0633
        const centerLng = validateCoordinates(initialLat, initialLng) ? initialLng : 125.5956

        // Create the map centered on the coordinates or school
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          mapId: 'SPACELY_CREATE_MAP', // Required for AdvancedMarkerElement
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        // Add school marker (Mapua Malayan Colleges Mindanao)
        const schoolPosition = { lat: 7.063094743511767, lng: 125.5959630834256 }
        
        const schoolMarkerElement = document.createElement('div')
        schoolMarkerElement.innerHTML = `
          <div style="
            width: 48px;
            height: 56px;
            position: relative;
            cursor: pointer;
          ">
            <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 0C10.745 0 0 10.745 0 24C0 37.255 24 56 24 56C24 56 48 37.255 48 24C48 10.745 37.255 0 24 0Z" fill="#D32F2F"/>
              <text x="24" y="32" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">S</text>
            </svg>
          </div>
        `

        const schoolMarkerInstance = new google.maps.marker.AdvancedMarkerElement({
          position: schoolPosition,
          map: mapInstance,
          content: schoolMarkerElement,
          title: 'Mapua Malayan Colleges Mindanao',
          zIndex: 1000
        })

        const schoolInfoWindow = new google.maps.InfoWindow({
          content: '<h6 style="margin: 0; padding: 8px; font-weight: bold;">Mapua Malayan Colleges Mindanao</h6>'
        })

        schoolMarkerInstance.addListener('click', () => {
          schoolInfoWindow.open(mapInstance, schoolMarkerInstance)
        })

        // Create a custom marker element for the listing location
        const markerElement = document.createElement('div')
        markerElement.innerHTML = `
          <div style="
            width: 32px;
            height: 40px;
            position: relative;
            cursor: pointer;
          ">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#2563eb"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" fill="#2563eb" font-size="12" font-weight="bold">📍</text>
            </svg>
          </div>
        `

        // Create AdvancedMarkerElement for listing location
        const markerInstance = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: centerLat, lng: centerLng },
          map: mapInstance,
          content: markerElement,
          gmpDraggable: !readonly,
          title: readonly ? 'Listing Location' : 'Listing Location (Drag to adjust)'
        })

        // Only add interactive listeners if not readonly
        if (!readonly) {
          // Listen for marker drag events
          markerInstance.addListener('dragend', () => {
            const position = markerInstance.position as google.maps.LatLng
            if (position && onLocationSelect) {
              const lat = position.lat();
              const lng = position.lng();
              
              if (validateCoordinates(lat, lng)) {
                onLocationSelect(lat, lng)
              }
            }
          })

          // Listen for map clicks to move marker
          mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return
            
            const lat = e.latLng.lat()
            const lng = e.latLng.lng()
            
            if (validateCoordinates(lat, lng)) {
              markerInstance.position = { lat, lng }
              if (onLocationSelect) {
                onLocationSelect(lat, lng)
              }
            }
          })
        }

        setMap(mapInstance)
        setMarker(markerInstance)
        setSchoolMarker(schoolMarkerInstance)
        setIsLoading(false)

      } catch (error) {
        console.error('Error loading Google Maps:', error)
        setIsLoading(false)
      }
    }

    initMap()
  }, []) // Remove initialLat/initialLng from deps to prevent re-init

  // Return different layouts based on readonly mode
  if (readonly) {
    return (
      <div className={`relative w-full h-full ${className || ''}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10 rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-full rounded-lg overflow-hidden"
        />
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Map Container */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10 rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
          <div 
            ref={mapRef} 
            className="w-full h-[400px] rounded-lg overflow-hidden"
          />
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <p>🔴 <strong>Red pin:</strong> Mapua Malayan Colleges Mindanao</p>
          <p>🔵 <strong>Blue pin:</strong> Your listing location (click map or drag to adjust)</p>
        </div>
      </CardContent>
    </Card>
  )
} 