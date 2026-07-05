import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard']

// Define public routes that don't require authentication
const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password']

function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

function isTokenExpired(token: string): boolean {
  try {
    if (!isValidJWTFormat(token)) {
      return true
    }
    const payloadBase64 = token.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    const currentTime = Math.floor(Date.now() / 1000)
    return currentTime >= payload.exp
  } catch {
    return true
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('🔍 Proxy - Processing path:', pathname)
  
  // Get token from cookies or headers
  let token = request.cookies.get('auth-token')?.value || 
             request.headers.get('authorization')?.replace('Bearer ', '')
  
  console.log('🔍 Proxy - Token from cookie/header:', token ? 'FOUND' : 'NOT_FOUND')
  
  // Validate token if present
  let hasValidToken = false
  if (token) {
    hasValidToken = isValidJWTFormat(token) && !isTokenExpired(token)
    console.log('🔍 Proxy - Token valid:', hasValidToken)
  }

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  console.log('🔍 Proxy - Route classification:', {
    isProtectedRoute,
    isPublicRoute,
    hasValidToken
  })

  // If accessing protected route without valid token, redirect to login
  if (isProtectedRoute && !hasValidToken) {
    console.log('🔄 Proxy - Redirecting to login (no valid token for protected route)')
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing login page with valid token, redirect to dashboard
  if (pathname === '/auth/login' && hasValidToken) {
    console.log('🔄 Proxy - Redirecting to dashboard (already authenticated)')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect root path to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    if (hasValidToken) {
      console.log('🔄 Proxy - Redirecting root to dashboard (authenticated)')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      console.log('🔄 Proxy - Redirecting root to login (not authenticated)')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  console.log('🔍 Proxy - Allowing request to continue')
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (png, jpg, jpeg, gif, svg, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)',
  ],
}