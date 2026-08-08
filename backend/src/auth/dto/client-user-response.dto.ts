import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientUserRole } from '@prisma/client';

export class ClientUserResponseDto {
  @ApiProperty({
    description: 'Client user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  clientId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'security.manager@clientcompany.com',
  })
  email: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Smith',
  })
  lastName: string;

  @ApiProperty({
    description: 'Client user role',
    enum: ClientUserRole,
    example: ClientUserRole.SECURITY_MANAGER,
  })
  role: ClientUserRole;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1-555-0123',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Security Operations Manager',
  })
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Security',
  })
  department?: string;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastLoginAt?: string;

  @ApiPropertyOptional({
    description: 'Invitation sent timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  invitedAt?: string;

  @ApiPropertyOptional({
    description: 'Account activation timestamp',
    example: '2024-01-15T11:00:00Z',
  })
  activatedAt?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Client information',
  })
  client?: {
    id: string;
    name: string;
    companyId: string;
  };
}

export class ClientUserListResponseDto {
  @ApiProperty({
    description: 'Array of client users',
    type: [ClientUserResponseDto],
  })
  users: ClientUserResponseDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class ClientUserLoginResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data',
  })
  data: {
    user: ClientUserResponseDto;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Login successful',
  })
  message: string;
}

export class ClientUserInvitationResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data',
  })
  data: {
    clientUser: ClientUserResponseDto;
    invitationToken: string;
    invitationSent: boolean;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Client user invited successfully',
  })
  message: string;
}

export class ClientUserStatisticsDto {
  @ApiProperty({
    description: 'Total number of client users',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of active client users',
    example: 135,
  })
  active: number;

  @ApiProperty({
    description: 'Number of inactive client users',
    example: 15,
  })
  inactive: number;

  @ApiProperty({
    description: 'Distribution by role',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        role: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      { role: 'SECURITY_MANAGER', count: 45 },
      { role: 'FACILITY_MANAGER', count: 40 },
      { role: 'FINANCE_MANAGER', count: 30 },
      { role: 'REGIONAL_MANAGER', count: 20 },
      { role: 'HR_MANAGER', count: 15 },
    ],
  })
  byRole: { role: string; count: number }[];

  @ApiProperty({
    description: 'Distribution by client',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        count: { type: 'number' },
      },
    },
  })
  byClient: { clientId: string; count: number }[];

  @ApiProperty({
    description: 'Number of pending activations',
    example: 12,
  })
  pendingActivations: number;

  @ApiProperty({
    description: 'Number of recently active users',
    example: 85,
  })
  recentlyActive: number;
}

export class ClientUserRolePermissionsDto {
  @ApiProperty({
    description: 'Client user role',
    enum: ClientUserRole,
    example: ClientUserRole.SECURITY_MANAGER,
  })
  role: ClientUserRole;

  @ApiProperty({
    description: 'List of permissions for this role',
    type: [String],
    example: [
      'client_portal:view_dashboard',
      'client_portal:view_attendance_dashboard',
      'client_portal:view_incidents',
    ],
  })
  permissions: string[];

  @ApiProperty({
    description: 'Role description',
    example: 'Oversees attendance, incidents, staffing, and security protocols',
  })
  description: string;

  @ApiProperty({
    description: 'Permissions summary',
    example: {
      dashboard: true,
      deployments: true,
      attendance: true,
      billing: false,
      incidents: true,
      reporting: true,
      multiSite: false,
    },
  })
  summary: {
    dashboard: boolean;
    deployments: boolean;
    attendance: boolean;
    billing: boolean;
    incidents: boolean;
    reporting: boolean;
    multiSite: boolean;
  };
}

export class BulkUpdateResultDto {
  @ApiProperty({
    description: 'Number of successfully updated users',
    example: 8,
  })
  updated: number;

  @ApiProperty({
    description: 'Number of failed updates',
    example: 2,
  })
  failed: number;

  @ApiProperty({
    description: 'Error details for failed updates',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        error: { type: 'string' },
      },
    },
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', error: 'User not found' },
    ],
  })
  errors: { id: string; error: string }[];
}