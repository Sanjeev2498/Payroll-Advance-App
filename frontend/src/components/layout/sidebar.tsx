'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    name: 'Clients',
    href: '/dashboard/clients',
    icon: '🏢',
  },
  {
    name: 'Sites',
    href: '/dashboard/sites', 
    icon: '📍',
  },
  {
    name: 'Employees',
    href: '/dashboard/employees',
    icon: '👥',
  },
  {
    name: 'Assignments',
    href: '/dashboard/assignments',
    icon: '📋',
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    icon: '⏰',
  },
  {
    name: 'Payroll',
    href: '/dashboard/payroll',
    icon: '💰',
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: '📈',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        {sidebarCollapsed ? (
          <div className="text-2xl">🛡️</div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🛡️</div>
            <span className="text-xl font-bold text-gray-900">WorkforceOS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!sidebarCollapsed && (
          <div className="text-xs text-gray-500 text-center">
            Version 1.0.0
          </div>
        )}
      </div>
    </div>
  )
}