'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SupervisorPortalLayoutProps {
  children: React.ReactNode
}

export default function SupervisorPortalLayout({ children }: SupervisorPortalLayoutProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check if user has supervisor role or above
      const allowedRoles = ['SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN']
      if (!allowedRoles.includes(user.role)) {
        router.push('/dashboard')
        return
      }

      setIsAuthorized(true)
      setIsCheckingAuth(false)
    }
  }, [user, isLoading, router])

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}