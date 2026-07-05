'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthPermissions } from '@/components/auth/protected-route'
import { Badge } from '@/components/ui/badge'

interface NavigationItem {
  name: string
  href: string
  icon: string
  description?: string
  badge?: string
  roles: string[]
  priority: number
}

// Same navigation structure as role-specific sidebar
const allNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    description: 'Overview and metrics',
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE'],
    priority: 1,
  },
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
    name: 'Team Attendance',
    href: '/dashboard/attendance',
    icon: '⏰',
    description: 'Monitor team attendance',
    roles: ['SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 4,
  },
  {
    name: 'Sites',
    href: '/dashboard/sites',
    icon: '📍',
    description: 'Site operations',
    roles: ['SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 5,
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
  {
    name: 'Payroll',
    href: '/dashboard/payroll',
    icon: '💰',
    description: 'Salary processing',
    roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 9,
  },
  {
    name: 'My Profile',
    href: '/dashboard/profile',
    icon: '👤',
    description: 'Personal information',
    roles: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    priority: 10,
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

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { user, hasRole } = useAuthPermissions()

  // Filter and sort navigation items based on user role
  const availableNavigation = allNavigation
    .filter(item => hasRole(item.roles))
    .sort((a, b) => a.priority - b.priority)

  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    
    return (
      <Link
        href={item.href}
        onClick={onClose} // Close sidebar on navigation
        className={cn(
          'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all duration-200',
          isActive
            ? 'bg-blue-100 text-blue-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <span className={cn(
          "text-xl mr-4 transition-transform duration-200",
          isActive && "scale-110"
        )}>
          {item.icon}
        </span>
        
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
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {item.description}
            </p>
          )}
        </div>
        
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
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                    <span className="sr-only">Close sidebar</span>
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </Transition.Child>
              
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center">
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
                </div>

                {/* Role Indicator */}
                <div className={cn(
                  "p-3 rounded-lg border",
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
                
                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {availableNavigation.map((item) => (
                          <li key={item.name}>
                            <NavigationItem item={item} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>

                {/* User Info & Footer */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  {user && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.tenantName || 'Company Name'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        ID: {user.tenantId.slice(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 text-center space-y-1">
                    <div>Version 1.0.0</div>
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}