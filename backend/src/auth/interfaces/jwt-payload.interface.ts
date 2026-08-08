import { UserRole } from '@prisma/client';
import { ClientUserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  companyId: string;
  type: 'access' | 'refresh';
  userType?: 'company_user' | 'client_user'; // Distinguish between user types
  clientId?: string; // For client users, store their client ID
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
  userType?: 'company_user' | 'client_user';
  clientId?: string; // For client users
}

export interface AuthenticatedClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClientUserRole;
  clientId: string;
  isActive: boolean;
  client: {
    id: string;
    name: string;
    companyId: string;
  };
}
