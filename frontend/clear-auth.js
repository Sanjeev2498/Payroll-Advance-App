/**
 * Development utility to clear auth storage
 * Run this script in browser console if needed: 
 * localStorage.removeItem('auth-storage'); location.reload();
 */

console.log('Auth storage clearing utility loaded')
console.log('To clear auth storage, run: localStorage.removeItem("auth-storage"); location.reload();')

// Export function for manual use
if (typeof window !== 'undefined') {
  window.clearAuthStorage = function() {
    localStorage.removeItem('auth-storage')
    sessionStorage.removeItem('auth-storage')
    console.log('Auth storage cleared. Reloading page...')
    location.reload()
  }
  console.log('Function available: clearAuthStorage()')
}