import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ApiMetadata {
  @ApiProperty({ description: 'Request timestamp in ISO format' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Unique request identifier for tracing' })
  @IsString()
  requestId: string;

  @ApiPropertyOptional({ description: 'API version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Correlation ID for request tracing' })
  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class PaginationMetadata extends ApiMetadata {
  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  @IsBoolean()
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  @IsBoolean()
  hasPrevious: boolean;
}

export class ApiSuccessResponse<T = any> {
  @ApiProperty({ description: 'Indicates successful operation' })
  @IsBoolean()
  success: true;

  @ApiProperty({ description: 'Response data payload' })
  data: T;

  @ApiProperty({ description: 'Response metadata', type: ApiMetadata })
  @ValidateNested()
  @Type(() => ApiMetadata)
  metadata: ApiMetadata;
}

export class ApiPaginatedResponse<T = any> {
  @ApiProperty({ description: 'Indicates successful operation' })
  @IsBoolean()
  success: true;

  @ApiProperty({ description: 'Response data payload' })
  data: T[];

  @ApiProperty({ description: 'Response metadata with pagination', type: PaginationMetadata })
  @ValidateNested()
  @Type(() => PaginationMetadata)
  metadata: PaginationMetadata;
}

export class ErrorDetail {
  @ApiProperty({ description: 'Field name that caused the error' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Field-specific error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Field-specific error code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Invalid value that caused the error' })
  @IsOptional()
  value?: any;
}

export class ApiErrorInfo {
  @ApiProperty({ description: 'Machine-readable error code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Human-readable error message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Field-specific error details', type: [ErrorDetail] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ErrorDetail)
  details?: ErrorDetail[];

  @ApiPropertyOptional({ description: 'Request trace ID for debugging' })
  @IsOptional()
  @IsString()
  traceId?: string;
}

export class ApiErrorResponse {
  @ApiProperty({ description: 'Indicates failed operation' })
  @IsBoolean()
  success: false;

  @ApiProperty({ description: 'Error information', type: ApiErrorInfo })
  @ValidateNested()
  @Type(() => ApiErrorInfo)
  error: ApiErrorInfo;

  @ApiProperty({ description: 'Response metadata', type: ApiMetadata })
  @ValidateNested()
  @Type(() => ApiMetadata)
  metadata: ApiMetadata;
}

// Standard error codes
export enum ApiErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication & Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Integration errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Multi-tenant errors
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
}

// Standard HTTP status codes mapping
export const HTTP_STATUS_CODES = {
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INVALID_INPUT]: 400,
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.TOKEN_EXPIRED]: 401,
  [ApiErrorCode.INVALID_CREDENTIALS]: 401,
  [ApiErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: 403,
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.TIMEOUT_ERROR]: 408,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ApiErrorCode.NETWORK_ERROR]: 502,
  [ApiErrorCode.TENANT_NOT_FOUND]: 404,
  [ApiErrorCode.TENANT_ACCESS_DENIED]: 403,
} as const;