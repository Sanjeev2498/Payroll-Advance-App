'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useAuthPermissions } from '@/components/auth/protected-route'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, updateProfile, updateProfileLoading, updateProfileError } = useAuth()
  const { hasRole } = useAuthPermissions()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile(data)
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      // TODO: Implement password change API call
      console.log('Password change data:', data)
      setSuccessMessage('Password updated successfully')
      passwordForm.reset()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Password update failed:', error)
    }
  }

  const getUserInitials = () => {
    if (!user) return 'U'
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'COMPANY_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'SUPERVISOR':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarImage 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${getUserInitials()}`} 
                  alt={`${user?.firstName} ${user?.lastName}`}
                />
                <AvatarFallback className="bg-blue-500 text-white text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">
                {user?.firstName} {user?.lastName}
              </CardTitle>
              <CardDescription>
                {user?.email}
              </CardDescription>
              <div className="flex justify-center mt-2">
                <Badge 
                  variant="outline" 
                  className={getRoleBadgeColor(user?.role || '')}
                >
                  {user?.role?.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Information</Label>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>User ID:</span>
                    <span className="font-mono text-xs">{user?.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Company:</span>
                    <span className="truncate">{user?.company?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                  {user?.lastLoginAt && (
                    <div className="flex justify-between">
                      <span>Last Login:</span>
                      <span>{new Date(user.lastLoginAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {hasRole(['SUPER_ADMIN', 'COMPANY_ADMIN']) && (
                <div className="pt-4 border-t border-gray-200">
                  <Label className="text-sm font-medium text-blue-600">Admin Access</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    You have administrative privileges for this workspace
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Settings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex space-x-1 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Change Password
                </button>
              </div>
            </CardHeader>
            
            <CardContent>
              {activeTab === 'profile' && (
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  {updateProfileError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                      {updateProfileError?.message || 'Failed to update profile'}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" required>
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        error={!!profileForm.formState.errors.firstName}
                        {...profileForm.register('firstName')}
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-sm text-red-600">{profileForm.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" required>
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        error={!!profileForm.formState.errors.lastName}
                        {...profileForm.register('lastName')}
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-sm text-red-600">{profileForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" required>
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      error={!!profileForm.formState.errors.email}
                      {...profileForm.register('email')}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      error={!!profileForm.formState.errors.phone}
                      {...profileForm.register('phone')}
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button
                      type="submit"
                      disabled={updateProfileLoading}
                    >
                      {updateProfileLoading ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" required>
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      error={!!passwordForm.formState.errors.currentPassword}
                      {...passwordForm.register('currentPassword')}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" required>
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      error={!!passwordForm.formState.errors.newPassword}
                      {...passwordForm.register('newPassword')}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Must be at least 8 characters with letters and numbers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" required>
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      error={!!passwordForm.formState.errors.confirmPassword}
                      {...passwordForm.register('confirmPassword')}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Password Security Tips</h4>
                        <ul className="mt-1 text-xs text-blue-700 space-y-1">
                          <li>• Use a mix of letters, numbers, and symbols</li>
                          <li>• Avoid common words or personal information</li>
                          <li>• Consider using a password manager</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button type="submit">
                      Update Password
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}