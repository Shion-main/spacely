"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface Profile {
  full_name: string
  phone_number: string
  year_level: string
  email: string
  id_number: string
  departments?: { name: string }
  courses?: { name: string }
}

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('') // store digits only
  const [yearLevel, setYearLevel] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setProfile(data.profile)
        setFullName(data.profile.full_name || '')
        const raw = (data.profile.phone_number || '').replace(/^\+63/, '')
        setPhone(raw)
        setYearLevel(data.profile.year_level || '')
      } catch (err) {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0,10)
    setPhone(digits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password && !oldPassword) {
      toast.error('Please enter your current password')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phone ? '+63' + phone : '',
          year_level: yearLevel,
          password: password || undefined,
          old_password: oldPassword || undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Profile updated')
        router.push('/profile')
      } else {
        toast.error(data.error || 'Update failed')
      }
    } catch (err) {
      toast.error('Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  if (!profile) return <div className="p-8 text-red-500">Could not load profile.</div>

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email (read-only)</label>
              <Input value={profile.email} disabled readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ID Number (read-only)</label>
              <Input value={profile.id_number} disabled readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">+63</span>
                <Input className="pl-12" value={phone} onChange={handlePhoneChange} placeholder="10-digit number" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year Level</label>
              <Select value={yearLevel} onValueChange={setYearLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st</SelectItem>
                  <SelectItem value="2nd">2nd</SelectItem>
                  <SelectItem value="3rd">3rd</SelectItem>
                  <SelectItem value="4th">4th</SelectItem>
                  <SelectItem value="5th">5th</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <Input value={profile.departments?.name || ''} disabled readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              <Input value={profile.courses?.name || ''} disabled readOnly />
              <p className="mt-1 text-right">
                <a href="mailto:spacely.main@gmail.com?subject=Profile%20Change%20Request&body=Hello%20Admin,%20I%20would%20like%20to%20update%20my%20email/ID%20number/department/course." className="text-blue-600 text-sm">Request Change</a>
              </p>
            </div>
            <hr className="my-4" />
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <div className="pt-4 flex gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 