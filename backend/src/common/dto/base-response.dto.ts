import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data payload',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Error information when request fails',
    required: false,
    example: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input parameters provided',
    },
  })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({
    description: 'Response metadata including request tracking and pagination',
    example: {
      timestamp: '2024-03-10T10:30:00Z',
      requestId: 'req_123456789',
      correlationId: 'corr_987654321',
      version: '1.0.0',
    },
  })
  metadata: {
    timestamp: string;
    requestId: string;
    correlationId?: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

export class PaginatedResponseDto<T> extends BaseResponseDto<T[]> {
  @ApiProperty({
    description: 'Paginated data array',
    isArray: true,
  })
  declare data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8,
      hasNext: true,
      hasPrevious: false,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Always false for error responses',
    example: false,
  })
  success: false;

  @ApiProperty({
    description: 'Error details',
    example: {
      code: 'AUTHENTICATION_FAILED',
      message: 'Invalid credentials provided',
    },
  })
  error: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2024-03-10T10:30:00Z',
      requestId: 'req_123456789',
    },
  })
  metadata: {
    timestamp: string;
    requestId: string;
    correlationId?: string;
  };
}

// Common query parameter DTOs
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    required: false,
  })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  limit?: number = 20;
}

export class SearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'John Doe',
    required: false,
  })
  search?: string;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}