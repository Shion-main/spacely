"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Controller, useForm, SubmitHandler } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft, Plus, X, Upload, MapPin, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { z } from 'zod'
import { MapExtractor } from '@/components/listings/map-extractor'
import { MapView } from '@/components/listings/map-view'
import { DAVAO_BARANGAYS } from '@/lib/davao-barangays'
import { Combobox } from '@/components/ui/combobox'

// Validation schema for listing editing
const listingSchema = z.object({
  type_id: z.coerce.number().min(1, 'Please select a rental type'),
  city: z.string().min(1, 'City is required'),
  barangay: z.string().min(1, 'Barangay is required'),
  full_address: z.string().optional(),
  building_name: z.string().optional(),
  unit_number: z.string().optional(),
  price: z.coerce.number().min(1, 'Price must be greater than 0'),
  landlord_name: z.string().min(1, 'Landlord name is required'),
  contact_number: z.string().min(1, 'Contact number is required'),
  social_link: z.string().url('Must be a valid URL'),
  page_link: z.string().url().optional().or(z.literal('')),
  maps_link: z.string().url().optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  number_of_rooms: z.coerce.number().min(1, 'Number of rooms is required'),
  bathroom_type: z.enum(['common', 'own']),
  room_type: z.enum(['bare', 'semi_furnished', 'furnished']),
  has_wifi: z.boolean().default(false),
  has_cctv: z.boolean().default(false),
  is_airconditioned: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_own_electricity: z.boolean().default(false),
  has_own_water: z.boolean().default(false),
  custom_amenities: z.array(z.string()).optional(),
  images: z.array(z.any()).optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

interface RoomType {
  type_id: number;
  type_name: string;
  display_name: string;
}

interface ExistingPhoto {
  file_path: string;
  storage_path: string;
  original_file_path: string; // Store the original database path for deletion
  is_featured: boolean;
  photo_order: number;
}

export default function EditListingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as Resolver<ListingFormData>,
    defaultValues: {
      city: 'Davao City',
      custom_amenities: [],
    },
  });

  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const addAmenity = () => {
    if (!isInitialized) return; // Prevent actions before initialization
    const newAmenities = [...customAmenities, ''];
    setCustomAmenities(newAmenities);
    setValue('custom_amenities', newAmenities.filter(a => a.trim()));
  };
  
  const removeAmenity = (index: number) => {
    if (!isInitialized || !Array.isArray(customAmenities)) {
      console.error('Not initialized or customAmenities is not an array:', { isInitialized, customAmenities });
      return;
    }
    const newAmenities = customAmenities.filter((_, i) => i !== index);
    setCustomAmenities(newAmenities);
    setValue('custom_amenities', newAmenities.filter(a => a.trim()));
  };
  
  const updateAmenity = (index: number, value: string) => {
    if (!isInitialized || !Array.isArray(customAmenities)) {
      console.error('Not initialized or customAmenities is not an array:', { isInitialized, customAmenities });
      return;
    }
    const newAmenities = [...customAmenities];
    newAmenities[index] = value;
    setCustomAmenities(newAmenities);
    setValue('custom_amenities', newAmenities.filter(a => a.trim()));
  };

  useEffect(() => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/listings/edit/${postId}`);
      return;
    }

    const fetchListingData = async () => {
      setIsFetchingData(true);
      try {
        const response = await fetch(`/api/listings/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch listing data');
        const listing = await response.json();
        
        console.log('Fetched listing data:', listing);
        
        // Check if user owns this listing
        if (listing.user_id && listing.user_id !== user.id) {
          toast.error('You can only edit your own listings.');
          router.push('/profile');
          return;
        }
        
        // Handle rooms data (could be array or single object)
        const roomData = Array.isArray(listing.rooms) ? listing.rooms[0] : listing.rooms;
        
        reset({
          ...listing,
          price: Number(listing.price) || 0,
          type_id: listing.type_id || 1,
          city: listing.city || 'Davao City',
          barangay: listing.barangay || '',
          full_address: listing.street || '',
          building_name: listing.building_name || '',
          unit_number: listing.unit_number || '',
          landlord_name: listing.landlord_name || '',
          contact_number: (listing.contact_number || '').replace(/^\+63/, ''),
          social_link: listing.social_link || '',
          page_link: listing.page_link || '',
          maps_link: listing.maps_link || '',
          latitude: listing.latitude || undefined,
          longitude: listing.longitude || undefined,
          number_of_rooms: roomData?.number_of_rooms || 1,
          bathroom_type: roomData?.bathroom_type || 'common',
          room_type: roomData?.room_type || 'bare',
          has_wifi: Array.isArray(listing.amenities) ? listing.amenities.includes('WiFi') : false,
          has_cctv: Array.isArray(listing.amenities) ? listing.amenities.includes('CCTV') : false,
          is_airconditioned: Array.isArray(listing.amenities) ? listing.amenities.includes('Air Conditioning') : false,
          has_parking: Array.isArray(listing.amenities) ? listing.amenities.includes('Parking') : false,
          has_own_electricity: Array.isArray(listing.amenities) ? listing.amenities.includes('Own Electricity Meter') : false,
          has_own_water: Array.isArray(listing.amenities) ? listing.amenities.includes('Own Water Meter') : false,
        });

        // Handle custom amenities - filter out standard amenities to get custom ones
        const standardAmenities = ['WiFi', 'CCTV', 'Air Conditioning', 'Parking', 'Own Electricity Meter', 'Own Water Meter'];

        const customAm = Array.isArray(listing.amenities) 
          ? listing.amenities.filter((amenity: string) => !standardAmenities.includes(amenity))
          : [];

        setCustomAmenities(customAm);
        setValue('custom_amenities', customAm);

        // Handle photos data - store both display URL and original path
        const photos = (listing.photos || []).map((photo: any) => {
          // The file_path comes transformed as a full URL from the API
          // We need to extract the original storage path for deletion
          let originalPath = photo.file_path;
          
          // If file_path is a full URL, extract the storage path from it
          if (photo.file_path && photo.file_path.includes('/storage/v1/object/public/dwelly-listings/')) {
            originalPath = photo.file_path.split('/storage/v1/object/public/dwelly-listings/')[1];
          }
          
          return {
            ...photo,
            original_file_path: originalPath, // This will be the database path like "users/name/listing/photo.jpg"
            display_url: photo.file_path     // This is the full URL for display
          };
        });
        setExistingPhotos(photos);
        
        // Mark as initialized after all data is set
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching listing data:', error);
        toast.error('Could not load your listing.');
        router.push('/profile');
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchListingData();
  }, [user, router, postId, reset, setValue]);

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await fetch('/api/room-types');
        if (response.ok) setRoomTypes(await response.json());
      } catch (error) {
        console.error('Error fetching room types:', error);
      }
    };
    fetchRoomTypes();
  }, []);
  
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + selectedImages.length + existingPhotos.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    const newFiles = [...selectedImages, ...files]
    setSelectedImages(newFiles)
    setValue('images', newFiles)

    // Create previews for new files
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeNewImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setImagePreviews(newPreviews)
    setValue('images', newImages)
  }

  const removeExistingPhoto = (photo: ExistingPhoto) => {
    setExistingPhotos(prev => prev.filter(p => p.file_path !== photo.file_path))
    // Send the original database path for deletion, not the transformed URL
    setPhotosToDelete(prev => [...prev, photo.original_file_path])
  }
  
  const handleLocationExtracted = useCallback((location: any) => {
    if (location.formatted_address) {
      setValue('full_address', location.formatted_address)
    }

    if (location.barangay) {
      const foundBarangay = DAVAO_BARANGAYS.find(
        b => b.toLowerCase() === location.barangay.toLowerCase()
      )
      if (foundBarangay) {
        setValue('barangay', foundBarangay, { shouldValidate: true })
      } else {
        setValue('barangay', location.barangay, { shouldValidate: true })
      }
    }
    
    if (location.coordinates) {
      setValue('latitude', location.coordinates.lat)
      setValue('longitude', location.coordinates.lng)
    }
  }, [setValue])

  const handleCoordinatesExtracted = useCallback((lat: number, lng: number) => {
    setValue('latitude', lat)
    setValue('longitude', lng)
  }, [setValue])

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 10) value = value.substring(0, 10)
    setValue('contact_number', value)
  }

  const onSubmit: SubmitHandler<ListingFormData> = async (data) => {
    setIsLoading(true)
    const toastId = toast.loading('Updating your listing...');

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'images' || key === 'custom_amenities') return;
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // Use current customAmenities state to ensure we have the latest data
    const currentCustomAmenities = Array.isArray(customAmenities) 
      ? customAmenities.filter(amenity => amenity.trim().length > 0)
      : [];
    console.log('Submitting custom amenities:', currentCustomAmenities);
    
    currentCustomAmenities.forEach(amenity => {
      formData.append('custom_amenities[]', amenity);
    });

    selectedImages.forEach(file => {
      formData.append('images', file);
    });

    // Add photos to delete
    photosToDelete.forEach(photoPath => {
      formData.append('photos_to_delete[]', photoPath);
    });

    try {
      const response = await fetch(`/api/listings/${postId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update listing');
      }

      toast.success('Listing update submitted for review.', { id: toastId });
      router.push('/profile?refresh=true');
    } catch (error) {
      console.error('Update listing error:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="ml-4 text-lg text-gray-700">Loading your listing for editing...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <Link href="/profile" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Your Listing</h1>
          <p className="text-gray-600 mt-2">Update the information for your property. Fields marked with * are required.</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Rental Type & Price */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the rental type and pricing for your property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Type *
                </label>
                <Controller
                  name="type_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a type</option>
                      {roomTypes.map(rt => (
                        <option key={rt.type_id} value={rt.type_id}>
                          {rt.display_name}
                        </option>
                      ))}
                    </select>
                  )}
                />
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

              {/* Basic Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Basic Amenities
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_wifi')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">WiFi</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_cctv')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">CCTV</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_airconditioned')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Air Conditioning</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_parking')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Parking</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_own_electricity')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Own Electricity</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_own_water')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Own Water</span>
                  </label>
                </div>
              </div>

              {/* Custom Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Amenities
                </label>
                <div className="space-y-2">
                  {customAmenities.map((amenity, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={amenity}
                        onChange={(e) => updateAmenity(index, e.target.value)}
                        placeholder="e.g., Kitchen, Laundry area"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAmenity(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAmenity}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Amenity
                  </Button>
                </div>
              </div>
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

          {/* Property Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Property Photos
              </CardTitle>
              <CardDescription>
                Manage photos of the rental space (maximum 10 images)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Existing Photos */}
                {existingPhotos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Photos
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.file_path}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(photo)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {photo.is_featured && (
                            <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                              Featured
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Photos */}
                {imagePreviews.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Photos to Upload
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`New Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Area */}
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
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10 images total)</p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 