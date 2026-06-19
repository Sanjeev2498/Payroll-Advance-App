export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  companyId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  isActive: boolean;
}