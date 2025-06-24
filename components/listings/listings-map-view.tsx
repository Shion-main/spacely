"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, ExternalLink, X as ClearIcon, Route, Clock } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Google Maps loader with better error handling
const loadGoogleMaps = async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log('[Map Debug] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:', apiKey);
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
      libraries: ['places', 'marker', 'routes']
    })
    
    return await loader.load()
  } catch (error) {
    console.error('Failed to load Google Maps:', error)
    throw error
  }
}

interface Listing {
  post_id: string
  title: string
  description: string
  price: number
  city: string
  barangay: string
  street: string
  latitude?: number
  longitude?: number
  users?: {
    full_name: string
    phone_number: string
  }
  room_types?: {
    type_name: string
    display_name: string
  }
  rooms: Array<{
    number_of_rooms: number
    bathroom_type: string
    room_type: string
  }>
  photos: Array<{
    file_path: string
    storage_path: string
    is_featured: boolean
    photo_order: number
  }>
  amenities?: string[]
}

interface ListingsMapViewProps {
  listings: Listing[]
}

export function ListingsMapView({ listings }: ListingsMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isDirectionsVisible, setIsDirectionsVisible] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)

  // Debug logging
  console.log('🗺️ MapView received listings:', listings.length)
  if (listings.length > 0) {
    console.log('🔍 First listing coords check:', {
      title: listings[0].title,
      latitude: listings[0].latitude,
      longitude: listings[0].longitude,
      hasCoords: !!(listings[0].latitude && listings[0].longitude)
    })
  }

  // Filter listings that have coordinates - use useMemo to prevent re-calculation
  const listingsWithCoords = useMemo(() => {
    const filtered = listings.filter(listing => 
      listing.latitude != null && listing.longitude != null &&
      !isNaN(Number(listing.latitude)) && !isNaN(Number(listing.longitude))
    )
    console.log(`🎯 Listings with coordinates: ${filtered.length} out of ${listings.length}`)
    return filtered
  }, [listings])

  const formatPrice = (price: number) => {
    if (!price) {
      return 'Price on request'
    }
    return `₱${price.toLocaleString()}`
  }

  const getFeaturedImage = (photos: Listing['photos']) => {
    const featuredPhoto = photos.find(photo => photo.is_featured)
    if (featuredPhoto) return featuredPhoto.file_path
    
    const firstPhoto = photos.sort((a, b) => (a.photo_order || 0) - (b.photo_order || 0))[0]
    return firstPhoto?.file_path || '/images/placeholder-property.svg'
  }

  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [], request: {} as google.maps.DirectionsRequest });
      setIsDirectionsVisible(false)
      setRouteInfo(null)
    }
  }

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Map loading timeout after 10 seconds')
      setIsLoading(false)
      setHasError(true)
    }, 10000)

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places", "marker", "routes"],
    });

    loader.load().then(google => {
      console.log('✅ Google Maps libraries loaded successfully');
      if (!mapRef.current) {
        console.error('❌ Map container ref is null after load');
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setHasError(true);
        return;
      }

      if (typeof google.maps.Map !== 'function') {
        console.error('google.maps.Map is NOT a function!', google.maps);
        setHasError(true);
        setIsLoading(false);
        clearTimeout(loadingTimeout);
        return;
      }
      
      const mapInstance = new google.maps.Map(mapRef.current as HTMLDivElement, {
        center: { lat: 7.0633, lng: 125.5956 },
        zoom: 14,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });

      // Add school marker
      const schoolPosition = { lat: 7.063094743511767, lng: 125.5959630834256 };
      new google.maps.Marker({
        position: schoolPosition,
        map: mapInstance,
        title: 'Mapua Malayan Colleges Mindanao',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 0C10.745 0 0 10.745 0 24C0 37.255 24 56 24 56C24 56 48 37.255 48 24C48 10.745 37.255 0 24 0Z" fill="#D32F2F"/>
              <text x="24" y="32" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">S</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(48, 56),
          anchor: new google.maps.Point(24, 56),
        },
        zIndex: 1000,
      });

      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
      directionsRenderer.setMap(mapInstance);
      directionsRendererRef.current = directionsRenderer;

      const calculateAndDisplayRoute = (origin: { lat: number, lng: number }) => {
        const destination = { lat: 7.063094743511767, lng: 125.5959630834256 };
        
        directionsService.route(
          {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              setIsDirectionsVisible(true);
              if (result.routes[0] && result.routes[0].legs[0]) {
                const leg = result.routes[0].legs[0];
                setRouteInfo({
                  distance: leg.distance?.text || 'N/A',
                  duration: leg.duration?.text || 'N/A',
                });
              }
            } else {
              toast.error(`Could not display directions. Status: ${status}`);
            }
          }
        );
      };

      const bounds = new google.maps.LatLngBounds();
      listingsWithCoords.forEach((listing, index) => {
        const position = { lat: listing.latitude!, lng: listing.longitude! };
        bounds.extend(position);
        
        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          title: listing.title,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="50" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#2563EB"/>
                <circle cx="16" cy="16" r="8" fill="white"/>
                <text x="16" y="20" text-anchor="middle" fill="#2563EB" font-size="12" font-weight="bold">₱</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50)
          }
        });
        
        const infoWindowContent = `
         <div style="max-width: 300px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
           <div style="position: relative; width: 100%; height: 150px; margin-bottom: 12px; border-radius: 8px; overflow: hidden; background-color: #f0f0f0;">
             <img 
               src="${getFeaturedImage(listing.photos)}" 
               alt="${listing.title}"
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.style.display='none'"
             />
           </div>
           <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.4;">
             ${listing.title}
           </h3>
           <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #2563eb;">
             ${formatPrice(listing.price)}<span style="font-size: 14px; font-weight: 400; color: #6b7280;">/month</span>
           </p>
           <button
             id="view-details-${listing.post_id}"
             style="display: block; width: 100%; text-align: center; background: #2563eb; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; border: none; cursor: pointer;"
           >
             View Details
           </button>
           <button
             id="get-directions-${listing.post_id}"
             style="display: block; width: 100%; text-align: center; background: #10B981; color: white; padding: 10px; border-radius: 6px; margin-top: 8px; border: none; cursor: pointer;"
           >
             Directions to School
           </button>
         </div>
       `;

        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent,
            maxWidth: 320,
        });

        marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
        });

        infoWindow.addListener('domready', () => {
          const viewDetailsButton = document.getElementById(`view-details-${listing.post_id}`);
          if (viewDetailsButton) {
            viewDetailsButton.addEventListener('click', () => {
              window.location.href = `/listings/${listing.post_id}`;
            });
          }
          const directionsButton = document.getElementById(`get-directions-${listing.post_id}`);
          if (directionsButton) {
            directionsButton.addEventListener('click', () => {
              calculateAndDisplayRoute({ lat: listing.latitude!, lng: listing.longitude! });
              infoWindow.close();
            });
          }
        });
      });

      if (listingsWithCoords.length > 0) {
        mapInstance.fitBounds(bounds);
      }
      
      clearTimeout(loadingTimeout);
      setIsLoading(false);

    }).catch(e => {
      console.error("Error loading Google Maps:", e);
      setHasError(true);
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    });

    // Cleanup function
    return () => {
      clearTimeout(loadingTimeout);
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [listingsWithCoords]);

  if (listingsWithCoords.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings with location data</h3>
          <p className="text-gray-600 mb-4">
            Found {listings.length} listing{listings.length !== 1 ? 's' : ''}, but {listings.length === 1 ? 'it doesn\'t have' : 'none have'} location coordinates to display on the map.
          </p>
          <div className="text-sm text-gray-500 mb-4">
            <p><strong>For property owners:</strong></p>
            <p>Make sure to add accurate location details when creating listings.</p>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            <p className="text-xs text-gray-400">
              Check browser console for debugging info
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-gray-600 mb-4">
            The map view requires a Google Maps API key to be configured. 
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p><strong>For developers:</strong></p>
            <p>1. Get a Google Maps API key from Google Cloud Console</p>
            <p>2. Add it to your .env.local file as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
            <p>3. Restart the development server</p>
          </div>
          <div className="mt-6">
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {isDirectionsVisible && (
        <div className="absolute bottom-4 left-4 z-30 flex flex-col items-start gap-2">
          <div className="bg-white p-3 rounded-lg shadow-lg border">
            <h4 className="font-semibold text-sm mb-2 text-gray-800">Route Details</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Route className="w-4 h-4 text-blue-600" />
              <span><strong>Distance:</strong> {routeInfo?.distance}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 mt-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span><strong>Duration:</strong> {routeInfo?.duration}</span>
            </div>
          </div>
          <Button
            onClick={clearDirections}
            variant="secondary"
            className="bg-white hover:bg-gray-100 text-gray-800 rounded-full shadow-lg"
          >
            <ClearIcon className="w-4 h-4 mr-2" />
            Clear Directions
          </Button>
        </div>
      )}
      {/* Map Stats - Floating overlay */}
      <div className="absolute top-4 left-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Showing on map</p>
            <p className="text-lg font-semibold text-gray-900">
              {listingsWithCoords.length} of {listings.length} listing{listings.length !== 1 ? 's' : ''}
            </p>
            {listings.length - listingsWithCoords.length > 0 && (
              <p className="text-xs text-gray-500">
                {listings.length - listingsWithCoords.length} listing{listings.length - listingsWithCoords.length !== 1 ? 's' : ''} without location data
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-full bg-gray-100"
          style={{ minHeight: '400px', height: '100%', position: 'relative', zIndex: 1 }}
        />
      </div>
    </div>
  )
} 