'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const handleLogout = () => {
    logout()
    window.location.href = '/auth/login'
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="p-2"
        >
          {sidebarCollapsed ? '☰' : '←'}
        </Button>
        
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Workforce Operations Dashboard
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="p-2">
          🔔
        </Button>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-500">
              {user?.role} • {user?.tenantName}
            </div>
          </div>
          
          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}