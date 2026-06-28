import { UserRole } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserListResponseDto {
  success: boolean;
  data: UserResponseDto[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class SingleUserResponseDto {
  success: boolean;
  data: UserResponseDto;
  message?: string;
}

export class UserCreatedResponseDto {
  success: boolean;
  data: {
    user: UserResponseDto;
    temporaryPassword?: string; // Only included when admin creates user
  };
  message: string;
}

export class UserStatsDto {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    role: UserRole;
    count: number;
  }[];
  recentLogins: number; // Count of users who logged in within last 30 days
}
