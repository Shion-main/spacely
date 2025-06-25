"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/providers/auth-provider'
import { userLoginSchema, userRegistrationSchema, adminLoginSchema, type UserLoginInput, type UserRegistrationInput, type AdminLoginInput } from '@/lib/validations'
import { Eye, EyeOff, Loader2, MapPin, Users, Shield, Star, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const message = searchParams.get('message')
  const error = searchParams.get('error')
  const redirectTo = searchParams.get('redirectTo') || '/'
  const [isRegisterMode, setIsRegisterMode] = useState(mode === 'register')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [scrollProgress, setScrollProgress] = useState(0)
  const { signIn } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Show toast messages for verification status
  useEffect(() => {
    if (message === 'verification_success') {
      toast.success('Email verified successfully! Please sign in.')
    } else if (error === 'verification_failed') {
      toast.error('Email verification failed. Please try again or request a new verification link.')
    }
  }, [message, error])

  // Handle mobile scroll blur effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('.mobile-scroll-container')
      const blurOverlay = document.querySelector('.mobile-blur-overlay')
      
      if (scrollContainer && blurOverlay) {
        const scrollTop = scrollContainer.scrollTop
        const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
        const progress = Math.min(scrollTop / (scrollHeight * 0.3), 1) // Start blur at 30% scroll
        
        setScrollProgress(progress)
        ;(blurOverlay as HTMLElement).style.opacity = progress.toString()
      }
    }

    const scrollContainer = document.querySelector('.mobile-scroll-container')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Login form
  const loginForm = useForm<UserLoginInput>({
    resolver: zodResolver(userLoginSchema),
  })

  // Admin login form
  const adminForm = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
  })

  // Register form with default phone number prefix
  const registerForm = useForm<UserRegistrationInput>({
    resolver: zodResolver(userRegistrationSchema) as Resolver<UserRegistrationInput>,
    defaultValues: {
      role: 'student',
      phone_number: '+63' // Set default prefix
    },
  })

  const watchedRole = registerForm.watch('role')
  const watchedDepartment = registerForm.watch('department_id')

  // Fetch departments and courses for registration
  React.useEffect(() => {
    if (isRegisterMode) {
      const fetchDepartments = async () => {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('is_deleted', false)
          .order('name')
        
        if (!error && data) {
          setDepartments(data)
        }
      }
      fetchDepartments()
    }
  }, [isRegisterMode])

  React.useEffect(() => {
    if (watchedDepartment && isRegisterMode) {
      const fetchCourses = async () => {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('department_id', watchedDepartment)
          .eq('is_deleted', false)
          .order('name')

        if (!error && data) {
          setCourses(data)
        }
      }
      fetchCourses()
    } else {
      setCourses([])
    }
  }, [watchedDepartment, isRegisterMode])

  // Simplified phone number handler
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    // If user deleted the +63 prefix, restore it
    if (!value.startsWith('+63')) {
      value = '+63'
    }
    
    // Get everything after +63
    const numberPart = value.slice(3)
    
    // Remove non-numeric characters after +63
    const cleanNumber = numberPart.replace(/[^0-9]/g, '')
    
    // Limit to 10 digits after +63
    const finalValue = '+63' + cleanNumber.slice(0, 10)
    
    registerForm.setValue('phone_number', finalValue)
  }

  const onLoginSubmit = async (data: UserLoginInput) => {
    setIsLoading(true)
    try {
      const { error, status, profile } = await signIn(data.email, data.password)

      if (status === 'failed') {
        if (error?.message?.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in.')
          // Add resend option in a separate toast
          toast(
            t => (
              <div>
                <span>Need a new verification link? </span>
                <button
                  onClick={async () => {
                    await supabase.auth.resend({
                      type: 'signup',
                      email: data.email,
                      options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                      },
                    })
                    toast.success('Verification email sent!')
                    toast.dismiss(t.id)
                  }}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  Click here to resend
                </button>
              </div>
            ),
            { duration: 6000 }
          )
        } else {
          toast.error(error?.message || 'Invalid email or password.')
        }
        setIsLoading(false)
        return
      }

      if (status === 'blocked') {
        toast.error('Your account has been blocked. Please contact support.')
        setIsLoading(false)
        return
      }

      if (status === 'success') {
        if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
          // Prevent admins from logging in via regular user form
          await supabase.auth.signOut()
          toast.error('Please use the "Admin Login" tab to sign in as an administrator.')
          setIsLoading(false)
          return
        }

        toast.success('Successfully signed in!')
        window.location.href = redirectTo
        return // Redirect will happen, no need to toggle loading
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error)
      toast.error('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const onAdminLoginSubmit = async (data: AdminLoginInput) => {
    try {
      setIsLoading(true)
      console.log('Auth: Submitting admin login via dedicated endpoint:', data)

      // Use dedicated admin login API
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Auth: Admin login failed:', result.error)
        toast.error(result.error || 'Admin login failed')
        return
      }

      console.log('Auth: Admin login successful:', result.user)
      toast.success(`Welcome back, ${result.user.name || 'Admin'}!`)
      
      // Refresh the page to trigger AuthProvider to pick up the new session
      console.log('Auth: Refreshing to establish session...')
      window.location.href = '/admin/dashboard'
      
    } catch (error) {
      console.error('Auth: Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  const onRegisterSubmit = async (data: UserRegistrationInput) => {
    if (!termsAccepted) {
      toast.error('You must accept the Terms and Conditions to continue')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status >= 500) {
          toast.error(result.error || 'Server error. Please try again.')
        } else {
          toast.error(result.error || 'Registration failed. Please check your information.')
        }
        return
      }

      toast.success('Registration successful!')
      setIsRegisterMode(false)
      registerForm.reset()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const WelcomeContent = () => (
    <div className="flex flex-col h-full justify-center space-y-4 lg:space-y-8 px-4">
      {/* Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 lg:space-x-3 mb-3 lg:mb-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white border-opacity-30">
            <span className="text-white font-bold text-lg lg:text-xl">S</span>
          </div>
          <span className="text-2xl lg:text-3xl font-bold text-white">
            SPACELY
          </span>
        </div>
        <h1 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4 leading-tight">
          Discover Affordable
          <span className="block text-blue-200">Budget-Friendly Rentals</span>
        </h1>
        <p className="text-base lg:text-xl text-blue-100 mb-4 lg:mb-8 max-w-sm lg:max-w-md mx-auto leading-relaxed">
          Browse budget-friendly rentals near Mapua Malayan Colleges Mindanao — all listings are student-posted and not officially owned.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 lg:space-y-6">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white">Verified Listings</h3>
            <p className="text-blue-200 text-xs lg:text-sm">All properties reviewed for quality</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white">Student Community</h3>
            <p className="text-blue-200 text-xs lg:text-sm">Connect with fellow students</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white">Near Campus</h3>
            <p className="text-blue-200 text-xs lg:text-sm">Close to Mapua Malayan Colleges Mindanao</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mt-4 lg:mt-8">
        <div className="text-center">
          <div className="text-lg lg:text-2xl font-bold text-white">500+</div>
          <div className="text-blue-200 text-xs lg:text-sm">Listings</div>
        </div>
        <div className="text-center">
          <div className="text-lg lg:text-2xl font-bold text-white">1000+</div>
          <div className="text-blue-200 text-xs lg:text-sm">Students</div>
        </div>
        <div className="text-center">
          <div className="text-lg lg:text-2xl font-bold text-white">4.8★</div>
          <div className="text-blue-200 text-xs lg:text-sm">Rating</div>
        </div>
      </div>
    </div>
  )

  const LoginForm = () => (
    <Card className="w-full max-w-md shadow-2xl border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
        <CardDescription className="text-gray-600">
          Sign in to your SPACELY account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Login Type Toggle */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setIsAdminMode(false)}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                !isAdminMode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Student/Staff
            </button>
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                isAdminMode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {!isAdminMode ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="your.name@mcm.edu.ph"
                {...loginForm.register('email')}
                className={`transition-all duration-200 ${loginForm.formState.errors.email ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1 animate-fade-in">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...loginForm.register('password')}
                  className={`pr-10 transition-all duration-200 ${loginForm.formState.errors.password ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 hover:text-blue-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1 animate-fade-in">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full spacely-btn-primary transition-all duration-200 hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <AdminLoginForm />
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => {
                setIsRegisterMode(true)
                setIsAdminMode(false)
              }}
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200 hover:underline"
            >
              Sign up here
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )

  const AdminLoginForm = () => (
    <form onSubmit={adminForm.handleSubmit(onAdminLoginSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Email
        </label>
        <Input
          type="email"
          placeholder="admin@example.com"
          {...adminForm.register('email')}
          className={`transition-all duration-200 ${adminForm.formState.errors.email ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
        />
        {adminForm.formState.errors.email && (
          <p className="text-sm text-red-600 mt-1 animate-fade-in">{adminForm.formState.errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter admin password"
            {...adminForm.register('password')}
            className={`pr-10 transition-all duration-200 ${adminForm.formState.errors.password ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 hover:text-blue-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
        {adminForm.formState.errors.password && (
          <p className="text-sm text-red-600 mt-1 animate-fade-in">{adminForm.formState.errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 hover:scale-105"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing In...
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Admin Sign In
          </>
        )}
      </Button>
    </form>
  )

  const RegisterForm = () => (
    <Card className="w-full max-w-md lg:max-w-4xl shadow-2xl border-0">
      <CardHeader className="text-center pb-4 lg:pb-6">
        <CardTitle className="text-xl lg:text-2xl font-bold text-gray-900">Create Account</CardTitle>
        <CardDescription className="text-gray-600">
          Join the SPACELY community
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-6 lg:pb-10">
        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
          <input type="hidden" value="student" {...registerForm.register('role')} />
          {/* Mobile/Tablet: Single column, Desktop: Two columns */}
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
            {/* Left Column - Mobile: Full width, Desktop: Left half */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  {...registerForm.register('full_name')}
                  placeholder="Enter your full name"
                  className={`py-2.5 transition-all duration-200 ${registerForm.formState.errors.full_name ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                />
                {registerForm.formState.errors.full_name && (
                  <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  {...registerForm.register('email')}
                  placeholder="your.name@mcm.edu.ph"
                  className={`py-2.5 transition-all duration-200 ${registerForm.formState.errors.email ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Academic Fields - Mobile/Tablet: Stacked, Desktop: Grid */}
              <div className="space-y-4 lg:space-y-0">
                {/* Year Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Level
                  </label>
                  <select
                    {...registerForm.register('year_level')}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <option value="">Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                    <option value="5th">5th Year</option>
                    <option value="6th">6th Year</option>
                  </select>
                </div>

                {/* Department and Course - Mobile/Tablet: Stacked, Desktop: Side by side */}
                <div className={`space-y-4 lg:space-y-0 lg:grid lg:gap-3 ${watchedRole === 'staff' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      {...registerForm.register('department_id', { valueAsNumber: true })}
                      className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.department_id} value={dept.department_id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {watchedRole !== 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course
                      </label>
                      <select
                        {...registerForm.register('course_id', { valueAsNumber: true })}
                        className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option key={course.course_id} value={course.course_id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone and School ID - Mobile/Tablet: Stacked, Desktop: Also in left column */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    {...registerForm.register('phone_number')}
                    placeholder="+63 9XX XXX XXXX"
                    onChange={(e) => {
                      registerForm.register('phone_number').onChange(e)
                      handlePhoneNumberChange(e)
                    }}
                    className={`py-2.5 transition-all duration-200 ${registerForm.formState.errors.phone_number ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  />
                  {registerForm.formState.errors.phone_number && (
                    <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.phone_number.message}</p>
                  )}
                </div>

                {/* School ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School ID
                  </label>
                  <Input
                    {...registerForm.register('id_number')}
                    placeholder="Enter your student ID"
                    maxLength={10}
                    className={`py-2.5 transition-all duration-200 ${registerForm.formState.errors.id_number ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  />
                  {registerForm.formState.errors.id_number && (
                    <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.id_number.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: Continuation of form, Desktop: Right Column */}
            <div className="space-y-4">

              {/* Password Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      {...registerForm.register('password')}
                      placeholder="Create a strong password"
                      className={`py-2.5 pr-10 transition-all duration-200 ${registerForm.formState.errors.password ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 hover:text-blue-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerForm.register('confirm_password')}
                      placeholder="Confirm your password"
                      className={`py-2.5 pr-10 transition-all duration-200 ${registerForm.formState.errors.confirm_password ? 'border-red-300 ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 hover:text-blue-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirm_password && (
                    <p className="text-sm text-red-600 mt-1 animate-fade-in">{registerForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                {/* Password Guidelines */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">
                  <div className="font-medium mb-1">Password Requirements:</div>
                  <div>• At least 8 characters long</div>
                  <div>• Include an uppercase letter</div>
                  <div>• Include a number and special character</div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5 flex-shrink-0"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Terms and Conditions
                  </button>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full spacely-btn-primary transition-all duration-200 hover:scale-105 py-3 font-semibold"
                  disabled={isLoading || !termsAccepted}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => setIsRegisterMode(false)}
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200 hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>

        {/* Terms Dialog */}
        <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Spacely Terms and Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-6 text-gray-700">
              <p>
                Welcome to Spacely! By creating an account and using our services, you agree to the following
                terms and conditions. Please read them carefully.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Eligibility&nbsp;–</strong> You must be at least 18&nbsp;years old and a verified student
                  or staff member of Mapua Malayan Colleges Mindanao to create an account.
                </li>
                <li>
                  <strong>Account Security&nbsp;–</strong> You are responsible for maintaining the confidentiality
                  of your login credentials and for all activities that occur under your account.
                </li>
                <li>
                  <strong>Acceptable Use&nbsp;–</strong> You agree not to upload, post, or share any content that
                  is unlawful, false, misleading, defamatory, or infringing on another person's rights. We reserve
                  the right to remove content that violates these rules.
                </li>
                <li>
                  <strong>Listing Accuracy&nbsp;–</strong> If you post a property listing, you warrant that all
                  information provided is accurate and up-to-date. Misleading listings may be removed without
                  notice.
                </li>
                <li>
                  <strong>Favorites & Reports&nbsp;–</strong> The favorites and report features are provided for
                  personal use. Abuse of these features (e.g., spam-reporting) may lead to account suspension.
                </li>
                <li>
                  <strong>Intellectual Property&nbsp;–</strong> All trademarks, logos, and content on Spacely
                  remain the property of their respective owners. You may not copy or distribute any part of the
                  platform without prior written consent.
                </li>
                <li>
                  <strong>Termination&nbsp;–</strong> We may suspend or terminate your account at any time for
                  violations of these terms or for any behavior that we deem harmful to the community.
                </li>
                <li>
                  <strong>Disclaimer&nbsp;–</strong> Spacely acts only as a venue for listing and discovering
                  rentals. We do not own, manage, or inspect the properties listed. Interactions and agreements
                  between renters and landlords happen independently of Spacely.
                </li>
                <li>
                  <strong>Limitation of Liability&nbsp;–</strong> To the fullest extent permitted by law, Spacely
                  shall not be liable for any indirect, incidental, or consequential damages arising from your use
                  of the platform.
                </li>
                <li>
                  <strong>Changes to Terms&nbsp;–</strong> We may update these terms from time to time. Continued
                  use of the service after any changes constitutes acceptance of the new terms.
                </li>
              </ol>
              <p>
                By clicking "Create Account," you acknowledge that you have read, understood, and agree to be
                bound by these Terms and Conditions.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )

  return (
    <>
      {/* Mobile/Tablet Layout - Overlay Scrolling Experience */}
      <div className="lg:hidden relative h-screen overflow-hidden">
        {/* Welcome Section - Fixed Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-8">
          <WelcomeContent />
        </div>

        {/* Scrollable Container */}
        <div className="relative h-screen overflow-y-scroll mobile-scroll-container">
          {/* Initial Spacer - Shows welcome section */}
          <div className="h-screen flex items-end justify-center p-8">
            {/* Scroll Indicator */}
            <div className="text-center mb-16">
              <div className="text-white text-sm mb-2 drop-shadow-lg">Scroll up to sign in</div>
              <div className="w-6 h-10 border-2 border-white border-opacity-50 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white bg-opacity-70 rounded-full mt-2 animate-bounce"></div>
              </div>
            </div>
          </div>

          {/* Auth Forms Overlay */}
          <div className="min-h-screen bg-white rounded-t-3xl shadow-2xl relative z-10 mobile-forms-overlay">
            <div className="flex items-center justify-center min-h-screen p-8">
              {isRegisterMode ? <RegisterForm /> : <LoginForm />}
            </div>
          </div>
        </div>

        {/* Blur Overlay - appears when forms are visible */}
        <div className="fixed inset-0 bg-blue-900 bg-opacity-20 backdrop-blur-sm mobile-blur-overlay opacity-0 pointer-events-none transition-opacity duration-500"></div>
      </div>

      {/* Desktop Layout - Original Sliding Design */}
      <div className="hidden lg:flex min-h-screen bg-white flex-col lg:flex-row relative overflow-hidden">
        {/* Login Form - Fixed Left */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 ${isRegisterMode ? 'hidden lg:flex' : ''}`}>
          <LoginForm />
        </div>

        {/* Register Form - Fixed Right */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 ${isRegisterMode ? '' : 'hidden lg:flex'}`}>
          <RegisterForm />
        </div>

        {/* Welcome Panel - Sliding Overlay */}
        <div className={`absolute top-0 w-full lg:w-1/2 h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-8 smooth-slide z-10 ${
          isRegisterMode 
            ? 'left-0 transform translate-x-0' 
            : 'left-1/2 transform translate-x-0'
        }`}>
          <WelcomeContent />
        </div>
      </div>
    </>
  )
} 