/**
 * Utility functions to clean up corrupted auth data
 */

export function clearAuthStorage() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('auth-storage')
      sessionStorage.removeItem('auth-storage')
      console.log('Auth storage cleared successfully')
    } catch (error) {
      console.error('Failed to clear auth storage:', error)
    }
  }
}

export function debugAuthStorage() {
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('auth-storage')
      console.log('Auth storage data:', authData)
      
      if (authData) {
        const parsed = JSON.parse(authData)
        console.log('Parsed auth data:', parsed)
        
        if (parsed.state?.token) {
          console.log('Token present, length:', parsed.state.token.length)
          const parts = parsed.state.token.split('.')
          console.log('Token parts count:', parts.length)
          
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]))
              console.log('Token payload:', payload)
              console.log('Token expires:', new Date(payload.exp * 1000))
              console.log('Token expired:', Date.now() > payload.exp * 1000)
            } catch (e) {
              console.error('Failed to decode token payload:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to debug auth storage:', error)
    }
  }
}

// Auto-cleanup function that can be called on app startup
export function validateAndCleanupAuthStorage() {
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('auth-storage')
      if (!authData) return

      const parsed = JSON.parse(authData)
      const token = parsed.state?.token

      if (!token) return

      // Check token format
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.log('Invalid token format detected, clearing storage')
        clearAuthStorage()
        return
      }

      // Check if token can be decoded
      try {
        const payload = JSON.parse(atob(parts[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        
        if (currentTime >= payload.exp) {
          console.log('Expired token detected, clearing storage')
          clearAuthStorage()
          return
        }
      } catch (error) {
        console.log('Corrupted token detected, clearing storage')
        clearAuthStorage()
        return
      }

      console.log('Auth storage validation passed')
    } catch (error) {
      console.log('Corrupted auth storage detected, clearing')
      clearAuthStorage()
    }
  }
}