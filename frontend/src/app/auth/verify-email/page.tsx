'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement email verification API call
      console.log('Verifying email with token:', verificationToken)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setSuccess(true)
      
      // Redirect to login after successful verification
      setTimeout(() => {
        router.push('/auth/login?verified=true')
      }, 3000)
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 
        err?.message || 
        'Email verification failed. The link may be invalid or expired.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerification = async () => {
    setResendLoading(true)
    setError(null)

    try {
      // TODO: Implement resend verification API call
      console.log('Resending verification email')
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      alert('Verification email sent! Please check your inbox.')
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 
        err?.message || 
        'Failed to resend verification email. Please try again.'
      )
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-green-900">Email Verified!</CardTitle>
              <CardDescription>
                Your email address has been successfully verified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Account Activated</h3>
                <p className="text-sm text-green-700">
                  Your account is now active and you can sign in to access your dashboard.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Redirecting you to sign in page in a few seconds...
                </p>
                <Button className="w-full" asChild>
                  <Link href="/auth/login">
                    Continue to Sign In
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
              </div>
              <CardTitle className="text-2xl">Verifying Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">
                This may take a moment...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Email Verification
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Verify your email address to activate your account
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle>
              {token ? 'Verification Failed' : 'Check Your Email'}
            </CardTitle>
            <CardDescription>
              {token 
                ? 'There was a problem verifying your email address'
                : 'Click the verification link in your email to activate your account'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {token ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">Verification Issues</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• The verification link may have expired</li>
                    <li>• The link may have been used already</li>
                    <li>• The token may be invalid</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending...' : 'Send New Verification Email'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Next Steps</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Check your email inbox</li>
                    <li>• Look for an email from WorkforceOS</li>
                    <li>• Click the verification link</li>
                    <li>• Check spam folder if not found</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </div>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Already verified?
              </p>
              <Button variant="ghost" asChild>
                <Link href="/auth/login">
                  Sign In to Your Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Need Help?</h4>
              <p className="mt-1 text-xs text-gray-600">
                If you continue to experience issues with email verification, 
                please contact your administrator or our support team for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}