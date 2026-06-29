'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarCollapsed } = useAppStore()

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6",
            "transition-all duration-300"
          )}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}