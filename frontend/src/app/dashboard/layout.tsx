'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100 min-h-screen fixed-layout">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden bg-gray-100">
          <Header />
          <main className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6",
            "transition-all duration-300 min-h-0 smooth-scroll no-scroll-gap bg-consistent"
          )}>
            <div className="max-w-7xl mx-auto min-h-full">
              <div className="bg-gray-100 min-h-full">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}