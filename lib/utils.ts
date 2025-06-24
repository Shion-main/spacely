import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Filter from 'bad-words'
import validator from 'validator'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Initialize content filter
const filter = new Filter()

// Custom word filter for housing-specific inappropriate content
const housingBlacklist = [
  'scam', 'fake', 'fraud', 'steal', 'cheat', 'lie', 'illegal',
  'drug', 'alcohol', 'party', 'noise', 'dirty', 'unsafe'
]
filter.addWords(...housingBlacklist)

// Text sanitization and validation (server-safe)
export const sanitizeText = (text: string, options: {
  filterProfanity?: boolean
  maxLength?: number
} = {}) => {
  if (!text) return ''
  
  // Basic HTML tag removal and sanitization for server-side
  let sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<') // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Check for profanity if enabled
  if (options.filterProfanity) {
    if (filter.isProfane(sanitized)) {
      throw new Error('Content contains inappropriate language')
    }
  }
  
  // Check length limits
  if (options.maxLength && sanitized.length > options.maxLength) {
    throw new Error(`Content exceeds maximum length of ${options.maxLength} characters`)
  }
  
  return sanitized
}

// Validation functions
export const validators = {
  email: (email: string) => validator.isEmail(email),
  phone: (phone: string) => {
    // Accept +63XXXXXXXXXX (13 chars) or XXXXXXXXXX (10 digits) format
    return /^(\+63[0-9]{10}|[0-9]{10})$/.test(phone)
  },
  url: (url: string) => validator.isURL(url, { protocols: ['http', 'https'] }),
  price: (price: string) => validator.isFloat(price, { min: 0, max: 100000 }),
  coordinates: (lat: string, lng: string) => {
    return validator.isFloat(lat, { min: -90, max: 90 }) && 
           validator.isFloat(lng, { min: -180, max: 180 })
  },
  idNumber: (id: string) => validator.isAlphanumeric(id) && validator.isLength(id, { min: 1, max: 10 }),
  password: (password: string) => {
    return validator.isLength(password, { min: 8 }) &&
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)
  }
}

// Format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format price (alias for formatCurrency)
export const formatPrice = (amount: number) => {
  return `₦${amount.toLocaleString()}`
}

// Get storage URL for Supabase files
export const getStorageUrl = (path: string) => {
  if (!path) return '/images/placeholder.jpg'
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) return path
  
  // Construct Supabase storage URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return '/images/placeholder.jpg'
  
  return `${supabaseUrl}/storage/v1/object/public/listings/${path}`
}

// Format date
export const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

// Format relative time
export const formatRelativeTime = (date: string | Date) => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`
    }
  }

  return 'Just now'
}

// Extract coordinates from Google Maps link
export const extractCoordinatesFromMapsLink = (mapsLink: string): {
  latitude: number | null
  longitude: number | null
} => {
  if (!mapsLink) return { latitude: null, longitude: null }

  // Common Google Maps patterns
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,  // @lat,lng
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // !3dlat!4dlng
    /q=(-?\d+\.\d+),(-?\d+\.\d+)/, // q=lat,lng
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng
    /center=(-?\d+\.\d+),(-?\d+\.\d+)/, // center=lat,lng
  ]

  for (const pattern of patterns) {
    const match = mapsLink.match(pattern)
    if (match) {
      const latitude = parseFloat(match[1])
      const longitude = parseFloat(match[2])
      
      // Validate coordinates are within valid ranges
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        return { latitude, longitude }
      }
    }
  }

  return { latitude: null, longitude: null }
}

// Generate search keywords from post data
export const generateSearchKeywords = (data: {
  description?: string
  city: string
  barangay: string
  street: string
  landlord_name: string
  room_type?: string
  price?: number
}) => {
  const keywords = [
    data.description || '',
    data.city,
    data.barangay,
    data.street,
    data.landlord_name,
    data.room_type || '',
    data.price ? data.price.toString() : '',
  ]

  return keywords
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// File upload helpers
export const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export const isValidImageType = (type: string) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return allowedTypes.includes(type)
}

export const generateFileName = (originalName: string) => {
  const timestamp = Date.now()
  const random = Math.round(Math.random() * 1e9)
  const extension = getFileExtension(originalName)
  return `${timestamp}-${random}.${extension}`
}

// Error handling
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// Rate limiting key generators
export const getRateLimitKey = (ip: string, action: string) => {
  return `rate_limit:${action}:${ip}`
}

// Toast message helpers
export const toastMessages = {
  success: {
    login: 'Successfully logged in!',
    register: 'Account created successfully!',
    postCreated: 'Listing created and submitted for approval!',
    postUpdated: 'Listing updated successfully!',
    postDeleted: 'Listing deleted successfully!',
    favoriteAdded: 'Added to favorites!',
    favoriteRemoved: 'Removed from favorites!',
    ratingAdded: 'Rating submitted successfully!',
    reportSubmitted: 'Report submitted successfully!',
  },
  error: {
    generic: 'Something went wrong. Please try again.',
    unauthorized: 'You are not authorized to perform this action.',
    notFound: 'The requested resource was not found.',
    validation: 'Please check your input and try again.',
    upload: 'Failed to upload file. Please try again.',
    network: 'Network error. Please check your connection.',
  }
} 