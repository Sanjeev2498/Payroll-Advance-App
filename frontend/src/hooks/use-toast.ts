import { toast as sonnerToast } from 'sonner'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export const useToast = () => {
  const toast = ({ title, description, variant = 'default', duration }: ToastProps) => {
    const message = title ? (description ? `${title}: ${description}` : title) : description || ''
    
    switch (variant) {
      case 'destructive':
        return sonnerToast.error(message, { duration })
      case 'success':
        return sonnerToast.success(message, { duration })
      default:
        return sonnerToast(message, { duration })
    }
  }

  return { toast }
}

export { sonnerToast as toast }