'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useAuthPermissions } from '@/components/auth/protected-route'
import { RoleGuard } from '@/components/auth/role-guard'
import { Badge } from '@/components/ui/badge'

interface NavigationItem {
  name: string
  href: string
  icon: string
  requiredRoles?: string[]
  badge?: string
  description?: string
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    description: 'Overview and metrics',
  },
  {
    name: 'Clients',
    href: '/dashboard/clients',
    icon: '🏢',
    description: 'Client management',
  },
  {
    name: 'Sites',
    href: '/dashboard/sites', 
    icon: '📍',
    description: 'Site operations',
  },
  {
    name: 'Employees',
    href: '/dashboard/employees',
    icon: '👥',
    description: 'Workforce management',
  },
  {
    name: 'Assignments',
    href: '/dashboard/assignments',
    icon: '📋',
    description: 'Work assignments',
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    icon: '⏰',
    description: 'Time tracking',
  },
  {
    name: 'Payroll',
    href: '/dashboard/payroll',
    icon: '💰',
    requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'],
    description: 'Salary processing',
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: '📈',
    requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'],
    description: 'Analytics & reports',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: '⚙️',
    requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    description: 'System configuration',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed } = useAppStore()
  const { user } = useAuthPermissions()

  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    
    const content = (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200',
          isActive
            ? 'bg-blue-100 text-blue-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
        title={sidebarCollapsed ? `${item.name} - ${item.description}` : undefined}
      >
        <span className={cn(
          "text-lg mr-3 transition-transform duration-200",
          isActive && "scale-110"
        )}>
          {item.icon}
        </span>
        
        {!sidebarCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="truncate">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        )}
        
        {isActive && (
          <div className="w-1 h-8 bg-blue-600 rounded-full ml-auto" />
        )}
      </Link>
    )

    if (item.requiredRoles) {
      return (
        <RoleGuard roles={item.requiredRoles}>
          {content}
        </RoleGuard>
      )
    }

    return content
  }

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-gray-200 px-4",
        sidebarCollapsed ? "justify-center" : "justify-start"
      )}>
        {sidebarCollapsed ? (
          <div className="text-2xl">🛡️</div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🛡️</div>
            <div>
              <span className="text-xl font-bold text-gray-900">WorkforceOS</span>
              <p className="text-xs text-gray-500">Security Workforce Management</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavigationItem key={item.name} item={item} />
        ))}
      </nav>

      {/* User Info & Footer */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-medium text-gray-900 truncate">
              {user.tenantName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              Company ID: {user.tenantId.slice(0, 8)}...
            </div>
          </div>
        )}
        
        {!sidebarCollapsed && (
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div>Version 1.0.0</div>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}