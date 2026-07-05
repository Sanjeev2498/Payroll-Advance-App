'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useAuthPermissions } from '@/components/auth/protected-route'
import { Badge } from '@/components/ui/badge'

interface NavigationItem {
  name: string
  href: string
  icon: string
  description?: string
  badge?: string
  roles: string[]
  priority: number // Lower number = higher priority
}

// Define navigation items with role-based access and priority
const allNavigation: NavigationItem[] = [
  // Core items - available to all roles
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    description: 'Overview and metrics',
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE'],
    priority: 1,
  },
  
  // Employee-focused items
  {
    name: 'My Schedule',
    href: '/dashboard/my-schedule',
    icon: '📅',
    description: 'Your work schedule',
    roles: ['EMPLOYEE', 'SUPERVISOR'],
    priority: 2,
  },
  {
    name: 'Clock In/Out',
    href: '/dashboard/attendance/clock',
    icon: '⏰',
    description: 'Time tracking',
    roles: ['EMPLOYEE', 'SUPERVISOR'],
    priority: 3,
  },
  {
    name: 'My Profile',
    href: '/dashboard/profile',
    icon: '👤',
    description: 'Personal information',
    roles: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 10,
  },
  
  // Supervisor-focused items
  {
    name: 'Team Attendance',
    href: '/dashboard/attendance',
    icon: '⏰',
    description: 'Monitor team attendance',
    roles: ['SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 4,
  },
  {
    name: 'Site Management',
    href: '/dashboard/sites',
    icon: '📍',
    description: 'Manage assigned sites',
    roles: ['SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 5,
  },
  
  // Manager/HR-focused items
  {
    name: 'Deployment Ops',
    href: '/dashboard/deployment',
    icon: '🎯',
    description: 'Workforce deployment',
    roles: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 5.5,
  },
  {
    name: 'Clients',
    href: '/dashboard/clients',
    icon: '🏢',
    description: 'Client management',
    roles: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 6,
  },
  {
    name: 'Employees',
    href: '/dashboard/employees',
    icon: '👥',
    description: 'Workforce management',
    roles: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 7,
  },
  {
    name: 'Assignments',
    href: '/dashboard/assignments',
    icon: '📋',
    description: 'Work assignments',
    roles: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 8,
  },
  
  // Admin-focused items
  {
    name: 'Payroll',
    href: '/dashboard/payroll',
    icon: '💰',
    description: 'Salary processing',
    roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 9,
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: '📈',
    description: 'Analytics & reports',
    roles: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 11,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: '⚙️',
    description: 'System configuration',
    roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 12,
  },
]

export function RoleSpecificSidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed } = useAppStore()
  const { user, hasRole } = useAuthPermissions()

  // Filter and sort navigation items based on user role
  const availableNavigation = allNavigation
    .filter(item => hasRole(item.roles))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8) // Limit to 8 items for clean UI

  // Group navigation items for better organization
  const groupedNavigation = {
    primary: availableNavigation.slice(0, 4),
    secondary: availableNavigation.slice(4, 8),
  }

  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    
    return (
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
  }

  const getRoleDisplayInfo = () => {
    const role = user?.role || ''
    switch (role) {
      case 'EMPLOYEE':
        return { 
          title: 'Employee Portal',
          subtitle: 'Manage your work activities',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'SUPERVISOR':
        return { 
          title: 'Supervisor Dashboard',
          subtitle: 'Monitor team operations',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'MANAGER':
        return { 
          title: 'Management Console',
          subtitle: 'Workforce operations',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }
      case 'COMPANY_ADMIN':
        return { 
          title: 'Admin Console',
          subtitle: 'Company administration',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'SUPER_ADMIN':
        return { 
          title: 'Super Admin',
          subtitle: 'System administration',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200'
        }
      default:
        return { 
          title: 'WorkforceOS',
          subtitle: 'Security workforce management',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const roleInfo = getRoleDisplayInfo()

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo and Role-specific Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-gray-200 px-4",
        sidebarCollapsed ? "justify-center" : "justify-start"
      )}>
        {sidebarCollapsed ? (
          <div className="text-2xl">🛡️</div>
        ) : (
          <div className="flex items-center space-x-3 w-full">
            <div className="text-2xl">🛡️</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {roleInfo.title}
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {roleInfo.subtitle}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Role Indicator */}
      {!sidebarCollapsed && (
        <div className={cn(
          "mx-4 mt-4 p-3 rounded-lg border",
          roleInfo.bgColor,
          roleInfo.borderColor
        )}>
          <div className="flex items-center space-x-2">
            <div className={cn("w-2 h-2 rounded-full", roleInfo.color.replace('text-', 'bg-'))} />
            <span className={cn("text-sm font-medium", roleInfo.color)}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* Primary Navigation */}
        <div className="space-y-1">
          {groupedNavigation.primary.map((item) => (
            <NavigationItem key={item.name} item={item} />
          ))}
        </div>

        {/* Secondary Navigation with divider */}
        {groupedNavigation.secondary.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="px-2 py-2">
                <hr className="border-gray-200" />
              </div>
            )}
            <div className="space-y-1">
              {groupedNavigation.secondary.map((item) => (
                <NavigationItem key={item.name} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer with Company Info */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-medium text-gray-900 truncate">
              {user.tenantName || user.companyId || 'Company Name'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              ID: {(user.tenantId || user.companyId || 'unknown').slice(0, 8)}...
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