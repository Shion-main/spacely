"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft, Plus, X, Upload, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { z } from 'zod'
import { MapExtractor } from '@/components/listings/map-extractor'
import { MapView } from '@/components/listings/map-view'
import { DAVAO_BARANGAYS } from '@/lib/davao-barangays'
import { Combobox } from '@/components/ui/combobox'

// Validation schema for listing creation
const listingSchema = z.object({
  type_id: z.number().min(1, 'Please select a rental type'),
  city: z.string().min(1, 'City is required'),
  barangay: z.string().min(1, 'Barangay is required'),
  full_address: z.string().optional(),
  building_name: z.string().optional(),
  unit_number: z.string().optional(),
  price: z.number().min(1, 'Price must be greater than 0'),
  landlord_name: z.string().min(1, 'Landlord name is required'),
  contact_number: z.string().min(1, 'Contact number is required'),
  social_link: z.string().url('Must be a valid URL'),
  page_link: z.string().url().optional().or(z.literal('')),
  maps_link: z.string().url().optional().or(z.literal('')),
  // Coordinates
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Room details
  number_of_rooms: z.number().min(1, 'Number of rooms is required'),
  bathroom_type: z.enum(['common', 'own']),
  room_type: z.enum(['bare', 'semi_furnished', 'furnished']),
  // Combined amenities
  amenities: z.array(z.string()).optional(),
  // Images
  images: z.array(z.any()).min(1, 'At least one image is required')
})

type ListingFormData = z.infer<typeof listingSchema>

interface RoomType {
  type_id: number
  type_name: string
  display_name: string
}

export default function CreateListingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const { user, profile } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      city: 'Davao City',
      full_address: '',
      amenities: [],
      images: []
    }
  })

  // Get the current amenities array from the form state
  const amenities = watch('amenities') || []

  // Handle standard amenity checkboxes
  const handleAmenityChange = (amenityName: string, checked: boolean) => {
    const currentAmenities = watch('amenities') || []
    const newAmenities = checked
      ? [...currentAmenities, amenityName]
      : currentAmenities.filter(a => a !== amenityName)
    setValue('amenities', newAmenities, { shouldValidate: true })
  }

  // Handle custom amenities
  const [customAmenities, setCustomAmenities] = useState<string[]>([])
  
  const addCustomAmenity = () => {
    setCustomAmenities([...customAmenities, ''])
  }
  
  const removeCustomAmenity = (index: number) => {
    const customValue = customAmenities[index]
    const newCustomAmenities = customAmenities.filter((_, i) => i !== index)
    setCustomAmenities(newCustomAmenities)

    // Also remove it from the main form state if it was added
    const currentAmenities = watch('amenities') || []
    setValue('amenities', currentAmenities.filter(a => a !== customValue), { shouldValidate: true })
  }
  
  const updateCustomAmenity = (index: number, value: string) => {
    const oldCustomValue = customAmenities[index]
    const newCustomAmenities = [...customAmenities]
    newCustomAmenities[index] = value
    setCustomAmenities(newCustomAmenities)

    // Update the main form state
    const currentAmenities = watch('amenities') || []
    const newAmenities = currentAmenities.filter(a => a !== oldCustomValue)
    if (value.trim()) {
      newAmenities.push(value.trim())
    }
    setValue('amenities', newAmenities, { shouldValidate: true })
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirectTo=/listings/create')
      return
    }
  }, [user, router])

  // Fetch room types
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await fetch('/api/room-types')
        if (response.ok) {
          const data = await response.json()
          setRoomTypes(data)
        }
      } catch (error) {
        console.error('Error fetching room types:', error)
      }
    }
    fetchRoomTypes()
  }, [])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + selectedImages.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    setSelectedImages(prev => [...prev, ...files])
    setValue('images', [...selectedImages, ...files])

    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setImagePreviews(newPreviews)
    setValue('images', newImages)
  }

  // Handle location extraction from map
  const handleLocationExtracted = useCallback((location: any) => {
    if (location.formatted_address) {
      setValue('full_address', location.formatted_address)
    }

    if (location.barangay) {
      // Find the barangay from our list (case-insensitive) to ensure casing matches
      const foundBarangay = DAVAO_BARANGAYS.find(
        b => b.toLowerCase() === location.barangay.toLowerCase()
      )
      if (foundBarangay) {
        setValue('barangay', foundBarangay, { shouldValidate: true })
      } else {
        // If not in the list, still set it but it might not be a perfect match
        setValue('barangay', location.barangay, { shouldValidate: true })
      }
    }
    
    // Set coordinates
    if (location.coordinates) {
      setValue('latitude', location.coordinates.lat)
      setValue('longitude', location.coordinates.lng)
    }
  }, [setValue])

  const handleCoordinatesExtracted = useCallback((lat: number, lng: number) => {
    setValue('latitude', lat)
    setValue('longitude', lng)
  }, [setValue])

  // Update the phone number input handler
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    // Remove any existing +63 prefix
    value = value.replace(/^\+63/, '')
    
    // Remove any non-numeric characters
    value = value.replace(/[^0-9]/g, '')
    
    // Limit to 10 digits
    value = value.slice(0, 10)
    
    setValue('contact_number', value)
  }

  const onSubmit = async (data: ListingFormData) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      
      // Add form data
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'images') return // Handle separately
        if (key === 'amenities') {
          const amenityValues = (value as string[]).filter(a => a && a.trim())
          if (amenityValues.length > 0) {
            formData.append(key, JSON.stringify(amenityValues))
          }
          return
        }
        formData.append(key, value?.toString() || '')
      })

      // Add images
      selectedImages.forEach((image, index) => {
        formData.append(`image_${index}`, image)
      })

      const response = await fetch('/api/listings', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create listing')
      }

      const result = await response.json()
      toast.success('Listing created successfully! It will be reviewed before being published.')
      router.push('/')

    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto py-8">
        <div className="flex items-center mb-6">
          <Link href="/" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold ml-4">Create New Listing</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Main card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide basic details about the rental space
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Type *
                </label>
                <select
                  {...register('type_id', { valueAsNumber: true })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select rental type</option>
                  {roomTypes.map(type => (
                    <option key={type.type_id} value={type.type_id}>
                      {type.display_name}
                    </option>
                  ))}
                </select>
                {errors.type_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.type_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent (₱) *
                </label>
                <Input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="5000"
                  className={errors.price ? 'border-red-300' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location Details
              </CardTitle>
              <CardDescription>
                Provide the exact location of the rental space. You can use a Google Maps link to autofill the details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Controller
                name="maps_link"
                control={control}
                render={({ field }) => (
                  <MapExtractor
                    onLocationExtracted={handleLocationExtracted}
                    onCoordinatesExtracted={handleCoordinatesExtracted}
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* Hidden Coordinate Inputs */}
              <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
              <input type="hidden" {...register('longitude', { valueAsNumber: true })} />

              <MapView 
                initialLat={watch('latitude')} 
                initialLng={watch('longitude')} 
                onLocationSelect={handleCoordinatesExtracted}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>
                Address details are auto-filled from the map link but can be manually adjusted. Please ensure the barangay is correct.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="full_address">Full Address</label>
                <Input
                  id="full_address"
                  {...register('full_address')}
                  placeholder="e.g., 123 Sample St, Barangay Buhangin"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="barangay">Barangay</label>
                <Controller
                  name="barangay"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={DAVAO_BARANGAYS.map(b => ({ label: b, value: b }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search and select a barangay..."
                      searchPlaceholder="Search barangay..."
                      emptyPlaceholder="No barangay found."
                    />
                  )}
                />
                {errors.barangay && <p className="text-red-500 text-sm">{errors.barangay.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="building_name">Building/Apartment Name (optional)</label>
                  <Input id="building_name" {...register('building_name')} placeholder="e.g., Spacely Towers" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit_number">Unit/Room Number (optional)</label>
                  <Input id="unit_number" {...register('unit_number')} placeholder="e.g., Unit 4B" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Details */}
          <Card>
            <CardHeader>
              <CardTitle>Room & Amenities</CardTitle>
              <CardDescription>
                Specify room details and available amenities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    {...register('number_of_rooms', { valueAsNumber: true })}
                    className={errors.number_of_rooms ? 'border-red-300' : ''}
                  />
                  {errors.number_of_rooms && (
                    <p className="text-sm text-red-600 mt-1">{errors.number_of_rooms.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathroom Type *
                  </label>
                  <select
                    {...register('bathroom_type')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select bathroom type</option>
                    <option value="own">Own Bathroom</option>
                    <option value="common">Shared Bathroom</option>
                  </select>
                  {errors.bathroom_type && (
                    <p className="text-sm text-red-600 mt-1">{errors.bathroom_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Furnishing *
                  </label>
                  <select
                    {...register('room_type')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select furnishing type</option>
                    <option value="bare">Bare/Unfurnished</option>
                    <option value="semi_furnished">Semi-Furnished</option>
                    <option value="furnished">Fully Furnished</option>
                  </select>
                  {errors.room_type && (
                    <p className="text-sm text-red-600 mt-1">{errors.room_type.message}</p>
                  )}
                </div>
              </div>

              {/* Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>Select the standard amenities available. Add any other unique features in the custom amenities section below.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['WiFi', 'CCTV', 'Air Conditioning', 'Parking', 'Own Electricity Meter', 'Own Water Meter'].map(amenity => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={amenity}
                          checked={amenities.includes(amenity)}
                          onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={amenity} className="text-sm font-medium text-gray-700">
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Amenities</CardTitle>
                  <CardDescription>Add any other amenities or features not listed above.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customAmenities.map((amenity, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={amenity}
                          onChange={(e) => updateCustomAmenity(index, e.target.value)}
                          placeholder={`e.g., Pet-friendly, Study Area`}
                          className="flex-grow"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomAmenity(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomAmenity} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" /> Add Amenity
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Provide contact details for interested students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landlord/Contact Name *
                  </label>
                  <Input
                    {...register('landlord_name')}
                    placeholder="John Doe"
                    className={errors.landlord_name ? 'border-red-300' : ''}
                  />
                  {errors.landlord_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.landlord_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">+63</span>
                    </div>
                    <Input
                      {...register('contact_number')}
                      onChange={handlePhoneNumberChange}
                      className="pl-12"
                      placeholder="9XXXXXXXXX"
                      maxLength={10}
                    />
                  </div>
                  {errors.contact_number && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contact_number.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Media Link (Required) *
                </label>
                <Input
                  type="url"
                  {...register('social_link')}
                  placeholder="https://facebook.com/contactpage or https://instagram.com/contactaccount"
                  className={errors.social_link ? 'border-red-300' : ''}
                />
                {errors.social_link && (
                  <p className="text-sm text-red-600 mt-1">{errors.social_link.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website/Page Link (Optional)
                </label>
                <Input
                  type="url"
                  {...register('page_link')}
                  placeholder="https://contactwebsite.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rental Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Rental Images
              </CardTitle>
              <CardDescription>
                Upload photos of the rental space (minimum 1, maximum 10 images)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10 images)</p>
                    </div>
                  </label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.images && (
                  <p className="text-sm text-red-600">{errors.images.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Listing...' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 