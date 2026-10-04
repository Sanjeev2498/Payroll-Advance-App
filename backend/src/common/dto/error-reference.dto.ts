import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ERROR_CODES } from '../constants/error-codes';

/**
 * Comprehensive error code reference for API documentation
 */

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error details object',
    type: 'object',
    additionalProperties: true,
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'object', additionalProperties: true },
    },
  })
  error: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({
    description: 'Response metadata',
    type: 'object',
    additionalProperties: true,
    properties: {
      timestamp: { type: 'string' },
      requestId: { type: 'string' },
    },
  })
  metadata: {
    timestamp: string;
    requestId: string;
  };
}

export class ValidationErrorDetailsDto {
  @ApiProperty({
    description: 'Field that failed validation',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Validation rule that was violated',
    example: 'isEmail',
  })
  rule: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Email must be a valid email address',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Current value that failed validation',
    example: 'invalid-email',
  })
  value?: any;
}

export class AuthenticationErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Authentication error details',
    examples: {
      invalidCredentials: {
        value: {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials provided',
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      tokenExpired: {
        value: {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
            details: {
              expiredAt: '2024-01-15T09:30:00Z',
              currentTime: '2024-01-15T10:30:00Z',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      tokenInvalid: {
        value: {
          success: false,
          error: {
            code: 'TOKEN_INVALID',
            message: 'Authentication token is invalid or malformed',
            details: {
              reason: 'JWT signature verification failed',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'AUTHENTICATION_FAILED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'TOKEN_MISSING';
    message: string;
    details?: any;
  };
}

export class AuthorizationErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Authorization error details',
    examples: {
      insufficientPermissions: {
        value: {
          success: false,
          error: {
            code: 'AUTHORIZATION_FAILED',
            message: 'Insufficient permissions to access this resource',
            details: {
              requiredPermission: 'CREATE_PAYROLL',
              userRole: 'EMPLOYEE',
              userPermissions: ['READ_ATTENDANCE', 'CREATE_ATTENDANCE'],
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      tenantAccessDenied: {
        value: {
          success: false,
          error: {
            code: 'TENANT_ACCESS_DENIED',
            message: 'Access to this tenant data is not permitted',
            details: {
              userTenantId: 'tenant-123',
              resourceTenantId: 'tenant-456',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      resourceOwnerOnly: {
        value: {
          success: false,
          error: {
            code: 'RESOURCE_OWNER_ONLY',
            message: 'Only the resource owner can perform this action',
            details: {
              resourceId: 'employee-456',
              resourceOwnerId: 'user-456',
              currentUserId: 'user-123',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'AUTHORIZATION_FAILED' | 'TENANT_ACCESS_DENIED' | 'ROLE_PERMISSION_DENIED' | 'RESOURCE_OWNER_ONLY';
    message: string;
    details?: any;
  };
}

export class ValidationErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Validation error details',
    examples: {
      fieldValidation: {
        value: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: {
              fields: [
                {
                  field: 'email',
                  rule: 'isEmail',
                  message: 'Email must be a valid email address',
                  value: 'invalid-email',
                },
                {
                  field: 'password',
                  rule: 'minLength',
                  message: 'Password must be at least 8 characters long',
                },
              ],
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      requiredField: {
        value: {
          success: false,
          error: {
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Required field is missing or empty',
            details: {
              field: 'firstName',
              expectedType: 'string',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      invalidFormat: {
        value: {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Field format is invalid',
            details: {
              field: 'phoneNumber',
              expectedFormat: '+1-XXX-XXX-XXXX',
              providedValue: '123-456-7890',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'VALIDATION_ERROR' | 'REQUIRED_FIELD_MISSING' | 'INVALID_FORMAT' | 'INVALID_DATE_RANGE' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_SIZE_EXCEEDED';
    message: string;
    details?: {
      fields?: ValidationErrorDetailsDto[];
      field?: string;
      expectedType?: string;
      expectedFormat?: string;
      providedValue?: any;
    };
  };
}

export class NotFoundErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Resource not found error details',
    examples: {
      userNotFound: {
        value: {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: {
              resourceType: 'User',
              resourceId: 'usr-123456789',
              searchCriteria: { email: 'john.doe@example.com' },
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      employeeNotFound: {
        value: {
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
            details: {
              resourceType: 'Employee',
              resourceId: 'emp-987654321',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'USER_NOT_FOUND' | 'CLIENT_NOT_FOUND' | 'SITE_NOT_FOUND' | 'EMPLOYEE_NOT_FOUND' | 'ASSIGNMENT_NOT_FOUND' | 'SHIFT_NOT_FOUND' | 'ATTENDANCE_NOT_FOUND' | 'PAYROLL_NOT_FOUND' | 'INVOICE_NOT_FOUND';
    message: string;
    details?: {
      resourceType: string;
      resourceId: string;
      searchCriteria?: any;
    };
  };
}

export class ConflictErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Resource conflict error details',
    examples: {
      emailExists: {
        value: {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address is already registered',
            details: {
              conflictingField: 'email',
              conflictingValue: 'john.doe@example.com',
              existingResourceId: 'usr-123456789',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      shiftConflict: {
        value: {
          success: false,
          error: {
            code: 'SHIFT_CONFLICT',
            message: 'Employee is already assigned to another shift at this time',
            details: {
              employeeId: 'emp-987654321',
              conflictingShiftId: 'shift-111222333',
              requestedTimeSlot: {
                startTime: '2024-01-15T08:00:00Z',
                endTime: '2024-01-15T16:00:00Z',
              },
              existingTimeSlot: {
                startTime: '2024-01-15T07:00:00Z',
                endTime: '2024-01-15T15:00:00Z',
              },
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'EMAIL_ALREADY_EXISTS' | 'EMPLOYEE_ID_DUPLICATE' | 'SHIFT_CONFLICT' | 'ATTENDANCE_ALREADY_EXISTS' | 'PAYROLL_ALREADY_FINALIZED' | 'INVOICE_ALREADY_PAID';
    message: string;
    details?: any;
  };
}

export class BusinessRuleErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Business rule violation error details',
    examples: {
      skillMismatch: {
        value: {
          success: false,
          error: {
            code: 'SKILL_MISMATCH',
            message: 'Employee skills do not match site requirements',
            details: {
              employeeId: 'emp-987654321',
              employeeSkills: ['Security Guard', 'CPR Certified'],
              siteId: 'site-111222333',
              requiredSkills: ['Security Guard', 'Armed Guard', 'K9 Handler'],
              missingSkills: ['Armed Guard', 'K9 Handler'],
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      payrollCalculationError: {
        value: {
          success: false,
          error: {
            code: 'PAYROLL_CALCULATION_ERROR',
            message: 'Error occurred during payroll calculation',
            details: {
              employeeId: 'emp-987654321',
              payPeriod: '2024-01-01 to 2024-01-15',
              errorType: 'overtime_calculation_error',
              totalHours: 90,
              regularHours: 80,
              overtimeHours: 10,
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'SKILL_MISMATCH' | 'INSUFFICIENT_COVERAGE' | 'PAYROLL_CALCULATION_ERROR' | 'INVALID_WORK_HOURS' | 'ATTENDANCE_TIME_INVALID' | 'GPS_VERIFICATION_FAILED';
    message: string;
    details?: any;
  };
}

export class RateLimitErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Rate limiting error details',
    examples: {
      rateLimitExceeded: {
        value: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Request rate limit exceeded. Please try again later',
            details: {
              limit: 100,
              window: '1 hour',
              retryAfter: 1800, // seconds
              resetTime: '2024-01-15T11:30:00Z',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      loginAttemptsExceeded: {
        value: {
          success: false,
          error: {
            code: 'TOO_MANY_LOGIN_ATTEMPTS',
            message: 'Too many login attempts. Account temporarily locked',
            details: {
              lockoutDuration: 1800, // seconds
              unlockTime: '2024-01-15T11:00:00Z',
              attemptsCount: 5,
              maxAttempts: 5,
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'RATE_LIMIT_EXCEEDED' | 'TOO_MANY_LOGIN_ATTEMPTS';
    message: string;
    details?: {
      limit?: number;
      window?: string;
      retryAfter?: number;
      resetTime?: string;
      lockoutDuration?: number;
      unlockTime?: string;
      attemptsCount?: number;
      maxAttempts?: number;
    };
  };
}

export class SystemErrorDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'System error details',
    examples: {
      internalServerError: {
        value: {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred. Please try again later',
            details: {
              errorId: 'err-abc123def456',
              component: 'PayrollService',
              operation: 'calculatePay',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      databaseError: {
        value: {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: {
              operation: 'SELECT',
              table: 'employees',
              constraint: 'timeout',
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
      externalServiceError: {
        value: {
          success: false,
          error: {
            code: 'EXTERNAL_SERVICE_ERROR',
            message: 'External service integration failed',
            details: {
              service: 'PaymentProcessor',
              endpoint: '/api/v1/payments',
              statusCode: 503,
              retryable: true,
            },
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00Z',
            requestId: 'req-123456789',
          },
        },
      },
    },
  })
  declare error: {
    code: 'INTERNAL_SERVER_ERROR' | 'DATABASE_ERROR' | 'EXTERNAL_SERVICE_ERROR' | 'ENCRYPTION_ERROR' | 'AUDIT_LOG_ERROR';
    message: string;
    details?: any;
  };
}

// Error code reference for documentation
export class ErrorCodeReferenceDto {
  @ApiProperty({
    description: 'Complete error code reference organized by HTTP status code',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        category: { type: 'string' },
        codes: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              description: { type: 'string' },
              commonCauses: { type: 'array', items: { type: 'string' } },
              resolution: { type: 'string' },
            },
          },
        },
      },
    },
  })
  errorReference: Record<string, {
    statusCode: number;
    category: string;
    codes: Record<string, {
      code: string;
      message: string;
      description: string;
      commonCauses: string[];
      resolution: string;
    }>;
  }>;
}