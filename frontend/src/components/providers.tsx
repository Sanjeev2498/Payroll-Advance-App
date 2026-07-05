'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { AuthProvider } from '@/components/auth/auth-provider'
import { validateAndCleanupAuthStorage } from '@/lib/utils/auth-cleanup'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry if unauthorized
              if (error?.response?.status === 401) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      })
  )

  // Clean up any corrupted auth data on app startup
  useEffect(() => {
    validateAndCleanupAuthStorage()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  )
}