import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
  @ApiProperty({ description: 'User ID', example: 'usr_123456789' })
  id: string;

  @ApiProperty({ description: 'User email', example: 'john.doe@company.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'User role', example: 'COMPANY_ADMIN' })
  role: string;

  @ApiProperty({ description: 'Company ID', example: 'cmp_987654321' })
  companyId: string;

  @ApiProperty({ description: 'Tenant ID', example: 'cmp_987654321' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant name', example: 'Acme Security Services' })
  tenantName: string;

  @ApiProperty({ description: 'User status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-03-10T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Update timestamp', example: '2024-03-10T10:30:00Z' })
  updatedAt: string;
}

export class TokensDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Request success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Authentication response data',
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/UserDataDto' },
      tokens: { $ref: '#/components/schemas/TokensDto' },
    },
  })
  data: {
    user: UserDataDto;
    tokens: TokensDto;
  };

  @ApiProperty({ description: 'Response message', example: 'Login successful' })
  message: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}
