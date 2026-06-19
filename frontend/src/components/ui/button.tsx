import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          
          // Variants
          {
            'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600':
              variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500':
              variant === 'secondary',
            'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500':
              variant === 'outline',
            'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500':
              variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600':
              variant === 'destructive',
          },
          
          // Sizes
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }