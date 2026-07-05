'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function DebugLoginPage() {
  const [email, setEmail] = useState('admin@demosecurity.co.in')
  const [password, setPassword] = useState('admin123')
  const [logs, setLogs] = useState<string[]>([])
  
  const { login, isAuthenticated, user, token, loginLoading, loginError } = useAuth()
  const authStore = useAuthStore()
  
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }
  
  const clearLogs = () => {
    setLogs([])
  }
  
  const debugAuthState = () => {
    addLog('=== AUTH STATE DEBUG ===')
    addLog(`isAuthenticated: ${isAuthenticated}`)
    addLog(`user: ${user ? JSON.stringify(user, null, 2) : 'null'}`)
    addLog(`token: ${token ? `${token.substring(0, 50)}...` : 'null'}`)
    addLog(`loginLoading: ${loginLoading}`)
    addLog(`loginError: ${loginError ? JSON.stringify(loginError, null, 2) : 'null'}`)
    
    // Check store directly
    addLog('=== STORE STATE DEBUG ===')
    const storeState = useAuthStore.getState()
    addLog(`store.isAuthenticated: ${storeState.isAuthenticated}`)
    addLog(`store.user: ${storeState.user ? JSON.stringify(storeState.user, null, 2) : 'null'}`)
    addLog(`store.token: ${storeState.token ? `${storeState.token.substring(0, 50)}...` : 'null'}`)
    
    // Check localStorage
    if (typeof window !== 'undefined') {
      addLog('=== LOCALSTORAGE DEBUG ===')
      const authData = localStorage.getItem('auth-storage')
      addLog(`localStorage auth-storage: ${authData ? authData : 'null'}`)
      
      // Check cookies
      addLog('=== COOKIES DEBUG ===')
      addLog(`document.cookie: ${document.cookie}`)
    }
  }
  
  const handleLogin = () => {
    addLog('🚀 Starting login process...')
    addLog(`Email: ${email}`)
    addLog('Password: ***')
    
    login({ email, password })
  }
  
  const clearAuth = () => {
    addLog('🧹 Clearing auth state...')
    useAuthStore.getState().logout()
    
    // Clear cookies too
    if (typeof document !== 'undefined') {
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    }
    
    // Clear localStorage
    localStorage.removeItem('auth-storage')
    
    addLog('✅ Auth state cleared')
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Login Debug Page</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="space-x-2">
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
            
            <button
              onClick={debugAuthState}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Debug State
            </button>
            
            <button
              onClick={clearAuth}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Clear Auth
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Current Status</h3>
            <p>Authenticated: {isAuthenticated ? '✅' : '❌'}</p>
            <p>User: {user ? `${user.firstName} ${user.lastName}` : 'None'}</p>
            <p>Loading: {loginLoading ? '🔄' : '⏹️'}</p>
            {loginError && (
              <p className="text-red-600">Error: {JSON.stringify(loginError.message || loginError)}</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Debug Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}