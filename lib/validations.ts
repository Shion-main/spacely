import { z } from 'zod'

// User validation schemas
export const userRegistrationSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  
  id_number: z.string()
    .min(10, 'ID number must be exactly 10 characters')
    .max(10, 'ID number must be exactly 10 characters')
    .regex(/^[0-9]+$/, 'ID number can only contain numbers'),
  
  role: z.enum(['student', 'staff'], {
    required_error: 'Role is required',
  }),
  
  year_level: z.enum(['1st', '2nd', '3rd', '4th', '5th', '6th']).optional(),
  
  department_id: z.union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return typeof val === 'string' ? Number(val) : val;
    })
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: "Please select a valid department"
    }),
  
  course_id: z.union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return typeof val === 'string' ? Number(val) : val;
    })
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: "Please select a valid course"
    }),
  
  email: z.string()
    .min(1, 'Institutional email is required')
    .email('Please enter a valid email address')
    .transform((email) => email.toLowerCase())
    .refine((email) => {
      // Allow admin emails to bypass the domain restriction
      if (email === 'admin@dwelly.com' || email === 'admin@spacely.com' || email === 'admin@example.com' || email === 'spacely.main@gmail.com') {
        return true
      }
      return email.endsWith('@mcm.edu.ph')
    }, {
      message: 'Please use your Mapua Malayan Colleges Mindanao email address (@mcm.edu.ph)'
    }),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine((password) => /[a-z]/.test(password), {
      message: 'Password must contain at least one lowercase letter (a-z)'
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: 'Password must contain at least one uppercase letter (A-Z)'
    })
    .refine((password) => /[0-9]/.test(password), {
      message: 'Password must contain at least one number (0-9)'
    })
    .refine((password) => /[@$!%*?&]/.test(password), {
      message: 'Password must contain at least one special character (@$!%*?&)'
    })
    .refine((password) => !/\s/.test(password), {
      message: 'Password cannot contain spaces'
    }),
  
  confirm_password: z.string(),
  
  phone_number: z.string()
    .regex(/^\+63[0-9]{10}$/, 'Phone number must be in format +63XXXXXXXXXX (10 digits after +63)')
    .transform((value) => {
      // If user enters just 10 digits, prepend +63
      if (/^[0-9]{10}$/.test(value)) {
        return `+63${value}`
      }
      return value
    }),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const userLoginSchema = z.object({
  email: z.string()
    .min(1, 'Institutional email is required')
    .email('Please enter a valid email address')
    .transform((email) => email.toLowerCase())
    .refine((email) => {
      // Allow admin emails to bypass the domain restriction
      if (email === 'admin@dwelly.com' || email === 'admin@spacely.com' || email === 'admin@example.com' || email === 'spacely.main@gmail.com') {
        return true
      }
      return email.endsWith('@mcm.edu.ph')
    }, {
      message: 'Please use your Mapua Malayan Colleges Mindanao email address (@mcm.edu.ph)'
    }),
  
  password: z.string()
    .min(1, 'Password is required'),
})

// Admin login schema (no domain restriction)
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const userUpdateSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  
  phone_number: z.string()
    .regex(/^(\+63[0-9]{10}|[0-9]{10})$/, 'Invalid phone number format')
    .optional(),
  
  year_level: z.enum(['1st', '2nd', '3rd', '4th', '5th', '6th']).optional(),
  
  department_id: z.number().positive().optional(),
  
  course_id: z.number().positive().optional(),
})

// Post/Listing validation schemas
export const postCreateSchema = z.object({
  type_id: z.number()
    .positive('Please select a room type'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City name is too long'),
  
  barangay: z.string()
    .min(1, 'Barangay is required')
    .max(100, 'Barangay name is too long'),
  
  street: z.string()
    .max(100, 'Street name is too long')
    .optional()
    .or(z.literal('')),
  
  building_name: z.string()
    .max(100, 'Building name is too long')
    .optional(),
  
  unit_number: z.string()
    .max(50, 'Unit number is too long')
    .optional(),
  
  landlord_name: z.string()
    .min(1, 'Landlord name is required')
    .max(100, 'Landlord name is too long'),
  
  contact_number: z.string()
    .min(10, 'Phone number must be exactly 10 digits')
    .max(10, 'Phone number must be exactly 10 digits')
    .regex(/^[0-9]{10}$/, 'Phone number must contain exactly 10 digits')
    .transform(value => `+63${value}`),
  
  social_link: z.string()
    .url('Please enter a valid URL')
    .min(1, 'Social media link is required'),
  
  page_link: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  
  maps_link: z.string()
    .url('Please enter a valid Google Maps link')
    .optional()
    .or(z.literal('')),
  
  price: z.number()
    .min(500, 'Price must be at least ₱500')
    .max(100000, 'Price must be less than ₱100,000'),
  
  // Room details
  number_of_rooms: z.number()
    .min(1, 'Number of rooms must be at least 1')
    .max(20, 'Number of rooms cannot exceed 20'),
  
  bathroom_type: z.enum(['common', 'own'], {
    required_error: 'Please select bathroom type',
  }),
  
  room_type: z.enum(['bare', 'semi_furnished', 'furnished'], {
    required_error: 'Please select room type',
  }),
  
  // Amenities (simple array approach)
  amenities: z.array(z.string().min(1).max(100)).default([]),
})

export const postUpdateSchema = postCreateSchema.partial()

// Search and filter schemas
export const searchSchema = z.object({
  search: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  barangay: z.string().max(100).optional(),
  type: z.string().optional(),
  min_price: z.string().regex(/^\d+$/).optional(),
  max_price: z.string().regex(/^\d+$/).optional(),
  rooms: z.string().regex(/^\d+$/).optional(),
  bathroom: z.enum(['common', 'own']).optional(),
  room_type: z.enum(['bare', 'semi_furnished', 'furnished']).optional(),
  sort: z.enum(['newest', 'oldest', 'price_low', 'price_high', 'rating']).default('newest'),
  page: z.string().regex(/^\d+$/).default('1'),
  limit: z.string().regex(/^\d+$/).default('12'),
})

// Rating and review schemas
export const ratingSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  stars: z.number().min(1).max(5),
  comment: z.string()
    .max(500, 'Comment must be less than 500 characters')
    .optional(),
})

// Report schema
export const reportSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  type: z.enum(['occupied', 'scam', 'other'], {
    required_error: 'Please select a report type',
  }),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
})

// Admin schemas
export const adminApprovalSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  action: z.enum(['approve', 'reject'], {
    required_error: 'Action is required',
  }),
  rejection_reason: z.string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must be less than 500 characters')
    .optional(),
})

export const adminUserActionSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  action: z.enum(['block', 'unblock'], {
    required_error: 'Action is required',
  }),
})

// File upload schema
export const fileUploadSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, 'At least one image is required')
    .max(6, 'Maximum 6 images allowed')
    .refine(
      (files) => files.every(file => file.size <= 5 * 1024 * 1024),
      'Each file must be less than 5MB'
    )
    .refine(
      (files) => files.every(file => 
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
      ),
      'Only JPEG, PNG and WebP images are allowed'
    ),
})

// Notification schema
export const notificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  type: z.enum(['approval', 'rejection', 'report', 'rating', 'favorite', 'system']),
  message: z.string().min(1).max(500),
  post_id: z.string().uuid().optional(),
})

// Contact schema
export const contactSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  contact_type: z.enum(['phone', 'social', 'email']),
  contact_value: z.string().min(1).max(255),
})

// Type exports for use in components
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type PostCreateInput = z.infer<typeof postCreateSchema>
export type PostUpdateInput = z.infer<typeof postUpdateSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type RatingInput = z.infer<typeof ratingSchema>
export type ReportInput = z.infer<typeof reportSchema>
export type AdminApprovalInput = z.infer<typeof adminApprovalSchema>
export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type NotificationInput = z.infer<typeof notificationSchema>
export type ContactInput = z.infer<typeof contactSchema> 