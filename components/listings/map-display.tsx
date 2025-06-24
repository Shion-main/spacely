"use client"

import React, { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface MapDisplayProps {
  mapUrl?: string
  title: string
  address: string
  latitude?: number | null
  longitude?: number | null
}

export function MapDisplay({ mapUrl, title, address, latitude, longitude }: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places']
      })

      try {
        const google = await loader.load()
        
        if (!mapRef.current) return

        // Validate coordinates to prevent NaN errors
        const validateCoordinates = (lat: number, lng: number) => {
          return !isNaN(lat) && !isNaN(lng) && 
                 lat >= -90 && lat <= 90 && 
                 lng >= -180 && lng <= 180
        }

        let center: google.maps.LatLngLiteral

        // If we have coordinates, use them
        if (latitude && longitude && validateCoordinates(latitude, longitude)) {
          center = { lat: latitude, lng: longitude }
        } else if (mapUrl) {
          // Try to extract coordinates from maps URL
          try {
            const urlObj = new URL(mapUrl)
            if (mapUrl.includes('@')) {
              const [lat, lng] = mapUrl.split('@')[1].split(',')
              const parsedLat = parseFloat(lat)
              const parsedLng = parseFloat(lng)
              if (validateCoordinates(parsedLat, parsedLng)) {
                center = { lat: parsedLat, lng: parsedLng }
              } else {
                center = { lat: 7.0633, lng: 125.5956 } // Default to Mapua MCM location
              }
            } else {
              // Default to searching the address
              center = { lat: 7.0633, lng: 125.5956 } // Default to Mapua MCM location
            }
          } catch (error) {
            console.error('Error parsing maps URL:', error)
            center = { lat: 7.0633, lng: 125.5956 } // Default to Mapua MCM location
          }
        } else {
          // Default to Mapua MCM location
          center = { lat: 7.0633, lng: 125.5956 }
        }

        // Create the map
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 17,
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

        // Create a marker (using legacy marker for compatibility)
        const marker = new google.maps.Marker({
          position: center,
          map,
          title
        })

        // Create an info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${title}</h3>
              <p class="text-sm text-gray-600">${address}</p>
            </div>
          `
        })

        // Open info window on marker click
        marker.addListener('click', () => {
          infoWindow.open(map, marker)
        })

        // If we don't have exact coordinates, try to geocode the address
        if (!latitude && !longitude) {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location
              map.setCenter(location)
              marker.setPosition(location)
            }
          })
        }

      } catch (error) {
        console.error('Error loading Google Maps:', error)
      }
    }

    initMap()
  }, [mapUrl, title, address, latitude, longitude])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg overflow-hidden"
    />
  )
} 