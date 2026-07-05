export interface TokenPayload {
  sub: string
  email: string
  role: string
  tenantId: string
  iat: number
  exp: number
}

export function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

export function decodeJWTPayload(token: string): TokenPayload | null {
  try {
    if (!isValidJWTFormat(token)) {
      return null
    }

    const payloadBase64 = token.split('.')[1]
    const payloadJson = atob(payloadBase64)
    const payload = JSON.parse(payloadJson)

    // Validate required fields
    if (!payload.sub || !payload.exp || typeof payload.exp !== 'number') {
      return null
    }

    return payload as TokenPayload
  } catch (error) {
    console.error('Failed to decode JWT payload:', error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token)
  if (!payload) {
    return true
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return currentTime >= payload.exp
}

export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWTPayload(token)
  return payload ? payload.exp * 1000 : null
}