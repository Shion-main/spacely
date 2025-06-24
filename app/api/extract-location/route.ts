import { NextRequest, NextResponse } from 'next/server'
const { findBarangay } = require('@/lib/enhanced-barangay-geocoder')

// Map URL patterns for extracting coordinates
const MAP_URL_PATTERNS = {
  googleMaps: [
    // Standard Google Maps URLs with coordinates
    /https?:\/\/(?:www\.)?google\.com\/maps\/.*[@,](-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /https?:\/\/(?:www\.)?google\.com\/maps\/place\/.*@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Google Maps @ format
    /https?:\/\/(?:www\.)?google\.com\/maps\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Legacy maps.google.com URLs
    /https?:\/\/maps\.google\.com\/.*[@,](-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /https?:\/\/maps\.google\.com\/maps\?.*q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Google Maps search format
    /https?:\/\/(?:www\.)?google\.com\/maps\/search\/(-?\d+\.?\d*),\s*\+?(-?\d+\.?\d*)/,
  ],
  appleMaps: [
    // Apple Maps URLs
    /https?:\/\/maps\.apple\.com\/.*ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /https?:\/\/maps\.apple\.com\/.*[@,](-?\d+\.?\d*),(-?\d+\.?\d*)/
  ]
}

// Extract coordinates directly from URL patterns
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  // Try Google Maps patterns
  for (const pattern of MAP_URL_PATTERNS.googleMaps) {
    const match = url.match(pattern)
    if (match && match[1] && match[2]) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      
      // Validate coordinates are reasonable for Philippines
      if (isValidPhilippinesCoordinates(lat, lng)) {
        return { lat, lng }
      }
    }
  }

  // Try Apple Maps patterns
  for (const pattern of MAP_URL_PATTERNS.appleMaps) {
    const match = url.match(pattern)
    if (match && match[1] && match[2]) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      
      if (isValidPhilippinesCoordinates(lat, lng)) {
        return { lat, lng }
      }
    }
  }

  return null
}

// Validate coordinates are within Philippines bounds
function isValidPhilippinesCoordinates(lat: number, lng: number): boolean {
  return lat >= 4 && lat <= 21 && lng >= 116 && lng <= 127
}

// Reverse geocode coordinates to get address details
async function reverseGeocode(lat: number, lng: number) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  
  // If no API key, return basic info with enhanced barangay geocoding
  if (!apiKey) {
    console.log('⚠️ Google Maps API key not configured, using enhanced barangay geocoder only')
    
    let barangayInfo = null
    try {
      console.log(`🔍 Using enhanced barangay geocoder for coordinates: ${lat}, ${lng}`)
      barangayInfo = await findBarangay(lat, lng)
      console.log(`📍 Enhanced barangay geocoder result:`, JSON.stringify(barangayInfo, null, 2))
    } catch (error: any) {
      console.error('❌ Enhanced barangay geocoder failed:', error.message)
    }

    return {
      street: '', // Will be filled from URL if available
      barangay: barangayInfo?.barangay || '',
      city: 'Davao City',
      province: 'Davao del Sur',
      formatted_address: `${barangayInfo?.barangay || ''}, Davao City, Davao del Sur, Philippines`,
      coordinates: { lat, lng },
      barangay_confidence: barangayInfo?.confidence || 'unknown',
      barangay_method: barangayInfo?.method || 'none'
    }
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch geocoding data')
  }

  const data = await response.json()

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error('No address found for coordinates')
  }

  const result = data.results[0]
  const components = result.address_components || []

  // Parse basic address components from Google
  const address = {
    street: '',
    city: '',
    province: ''
  }

  // Helper to find the first matching component type
  const findComponent = (types: string[]) => {
    for (const type of types) {
      const component = components.find((c: any) => c.types.includes(type))
      if (component) return component.long_name
    }
    return ''
  }

  // Build a street address from components
  const streetNumber = findComponent(['street_number'])
  const route = findComponent(['route'])
  address.street = [streetNumber, route].filter(Boolean).join(' ')
  
  address.city = findComponent(['locality', 'administrative_area_level_3'])
  address.province = findComponent(['administrative_area_level_1'])

  // Use our enhanced barangay geocoder for accurate barangay detection
  let barangayInfo = null
  try {
    console.log(`🔍 Using enhanced barangay geocoder for coordinates: ${lat}, ${lng}`)
    barangayInfo = await findBarangay(lat, lng)
    console.log(`📍 Enhanced barangay geocoder result:`, JSON.stringify(barangayInfo, null, 2))
    console.log(`🎯 Barangay extracted: "${barangayInfo?.barangay || 'NONE'}"`)
    console.log(`🎯 Confidence: "${barangayInfo?.confidence || 'UNKNOWN'}"`)
    console.log(`🎯 Method: "${barangayInfo?.method || 'NONE'}"`)
  } catch (error: any) {
    console.error('❌ Enhanced barangay geocoder failed:', error.message)
    console.error('❌ Error stack:', error.stack)
    // Continue without barangay info
  }

  return {
    street: address.street,
    barangay: barangayInfo?.barangay || '',
    city: address.city || 'Davao City',
    province: address.province || 'Davao del Sur',
    formatted_address: result.formatted_address || '',
    coordinates: { lat, lng },
    barangay_confidence: barangayInfo?.confidence || 'unknown',
    barangay_method: barangayInfo?.method || 'none'
  }
}

// Expand shortened URLs
async function expandShortenedUrl(url: string): Promise<string | null> {
  try {
    // Using GET is more reliable for following redirects than HEAD
    const response = await fetch(url, {
      method: 'GET', 
      redirect: 'follow'
    })
    return response.url
  } catch (error) {
    console.error('Failed to expand URL:', error)
    return null
  }
}

// Check if URL is a Google shortened URL
function isGoogleShortenedUrl(url: string): boolean {
  return /https?:\/\/maps\.app\.goo\.gl\//.test(url)
}

export async function POST(request: NextRequest) {
  try {
    const { maps_link } = await request.json()

    if (!maps_link || !maps_link.trim()) {
      return NextResponse.json(
        { success: false, error: 'Map URL is required' },
        { status: 400 }
      )
    }

    console.log('Extracting location from URL:', maps_link.trim())

    let coordinates = extractCoordinatesFromUrl(maps_link.trim())

    // If no direct coordinates found and it's a shortened URL, try to expand it
    if (!coordinates && isGoogleShortenedUrl(maps_link)) {
      console.log('Detected shortened Google Maps URL, trying to expand...')
      const expandedUrl = await expandShortenedUrl(maps_link)
      if (expandedUrl) {
        console.log('URL expanded successfully, extracting coordinates...')
        coordinates = extractCoordinatesFromUrl(expandedUrl)
      }
    }

    if (!coordinates) {
      return NextResponse.json(
        { success: false, error: 'Could not extract coordinates from URL' },
        { status: 400 }
      )
    }

    console.log('Found coordinates:', coordinates)

    // Get detailed location info using reverse geocoding + barangay geocoder
    const location = await reverseGeocode(coordinates.lat, coordinates.lng)

    return NextResponse.json({
      success: true,
      location: location,
    })

  } catch (error: any) {
    console.error('Error extracting location from map URL:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 