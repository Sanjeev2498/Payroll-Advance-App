/**
 * Comprehensive error codes for API documentation and consistent error handling
 * 
 * Error Code Format: [CATEGORY]_[SPECIFIC_ERROR]
 * HTTP Status Mapping:
 * - 400: VALIDATION_*, INPUT_*, BUSINESS_RULE_*
 * - 401: AUTHENTICATION_*
 * - 403: AUTHORIZATION_*, PERMISSION_*
 * - 404: NOT_FOUND_*
 * - 409: CONFLICT_*, DUPLICATE_*
 * - 422: PROCESSING_*, CALCULATION_*
 * - 429: RATE_LIMIT_*
 * - 500: SYSTEM_*, DATABASE_*, EXTERNAL_*
 */

export const ERROR_CODES = {
  // Authentication Errors (401)
  AUTHENTICATION_FAILED: {
    code: 'AUTHENTICATION_FAILED',
    message: 'Invalid credentials provided',
    statusCode: 401,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    statusCode: 401,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Authentication token is invalid or malformed',
    statusCode: 401,
  },
  TOKEN_MISSING: {
    code: 'TOKEN_MISSING',
    message: 'Authentication token is required',
    statusCode: 401,
  },

  // Authorization Errors (403)
  AUTHORIZATION_FAILED: {
    code: 'AUTHORIZATION_FAILED',
    message: 'Insufficient permissions to access this resource',
    statusCode: 403,
  },
  TENANT_ACCESS_DENIED: {
    code: 'TENANT_ACCESS_DENIED',
    message: 'Access to this tenant data is not permitted',
    statusCode: 403,
  },
  ROLE_PERMISSION_DENIED: {
    code: 'ROLE_PERMISSION_DENIED',
    message: 'User role does not have required permissions',
    statusCode: 403,
  },
  RESOURCE_OWNER_ONLY: {
    code: 'RESOURCE_OWNER_ONLY',
    message: 'Only the resource owner can perform this action',
    statusCode: 403,
  },

  // Validation Errors (400)
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Input validation failed',
    statusCode: 400,
  },
  REQUIRED_FIELD_MISSING: {
    code: 'REQUIRED_FIELD_MISSING',
    message: 'Required field is missing or empty',
    statusCode: 400,
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Field format is invalid',
    statusCode: 400,
  },
  INVALID_DATE_RANGE: {
    code: 'INVALID_DATE_RANGE',
    message: 'Date range is invalid or end date is before start date',
    statusCode: 400,
  },
  FILE_TYPE_NOT_ALLOWED: {
    code: 'FILE_TYPE_NOT_ALLOWED',
    message: 'File type is not allowed for upload',
    statusCode: 400,
  },
  FILE_SIZE_EXCEEDED: {
    code: 'FILE_SIZE_EXCEEDED',
    message: 'File size exceeds maximum allowed limit',
    statusCode: 400,
  },

  // Not Found Errors (404)
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    statusCode: 404,
  },
  CLIENT_NOT_FOUND: {
    code: 'CLIENT_NOT_FOUND',
    message: 'Client not found',
    statusCode: 404,
  },
  SITE_NOT_FOUND: {
    code: 'SITE_NOT_FOUND',
    message: 'Site not found',
    statusCode: 404,
  },
  EMPLOYEE_NOT_FOUND: {
    code: 'EMPLOYEE_NOT_FOUND',
    message: 'Employee not found',
    statusCode: 404,
  },
  ASSIGNMENT_NOT_FOUND: {
    code: 'ASSIGNMENT_NOT_FOUND',
    message: 'Assignment not found',
    statusCode: 404,
  },
  SHIFT_NOT_FOUND: {
    code: 'SHIFT_NOT_FOUND',
    message: 'Shift not found',
    statusCode: 404,
  },
  ATTENDANCE_NOT_FOUND: {
    code: 'ATTENDANCE_NOT_FOUND',
    message: 'Attendance record not found',
    statusCode: 404,
  },
  PAYROLL_NOT_FOUND: {
    code: 'PAYROLL_NOT_FOUND',
    message: 'Payroll run not found',
    statusCode: 404,
  },
  INVOICE_NOT_FOUND: {
    code: 'INVOICE_NOT_FOUND',
    message: 'Invoice not found',
    statusCode: 404,
  },

  // Conflict Errors (409)
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email address is already registered',
    statusCode: 409,
  },
  EMPLOYEE_ID_DUPLICATE: {
    code: 'EMPLOYEE_ID_DUPLICATE',
    message: 'Employee ID already exists',
    statusCode: 409,
  },
  SHIFT_CONFLICT: {
    code: 'SHIFT_CONFLICT',
    message: 'Employee is already assigned to another shift at this time',
    statusCode: 409,
  },
  ATTENDANCE_ALREADY_EXISTS: {
    code: 'ATTENDANCE_ALREADY_EXISTS',
    message: 'Attendance record already exists for this shift',
    statusCode: 409,
  },
  PAYROLL_ALREADY_FINALIZED: {
    code: 'PAYROLL_ALREADY_FINALIZED',
    message: 'Payroll run is already finalized and cannot be modified',
    statusCode: 409,
  },
  INVOICE_ALREADY_PAID: {
    code: 'INVOICE_ALREADY_PAID',
    message: 'Invoice is already marked as paid',
    statusCode: 409,
  },

  // Business Rule Errors (422)
  SKILL_MISMATCH: {
    code: 'SKILL_MISMATCH',
    message: 'Employee skills do not match site requirements',
    statusCode: 422,
  },
  INSUFFICIENT_COVERAGE: {
    code: 'INSUFFICIENT_COVERAGE',
    message: 'Insufficient guard coverage for site requirements',
    statusCode: 422,
  },
  PAYROLL_CALCULATION_ERROR: {
    code: 'PAYROLL_CALCULATION_ERROR',
    message: 'Error occurred during payroll calculation',
    statusCode: 422,
  },
  INVALID_WORK_HOURS: {
    code: 'INVALID_WORK_HOURS',
    message: 'Work hours exceed maximum allowed limits',
    statusCode: 422,
  },
  ATTENDANCE_TIME_INVALID: {
    code: 'ATTENDANCE_TIME_INVALID',
    message: 'Clock-out time cannot be before clock-in time',
    statusCode: 422,
  },
  GPS_VERIFICATION_FAILED: {
    code: 'GPS_VERIFICATION_FAILED',
    message: 'GPS location verification failed for attendance',
    statusCode: 422,
  },

  // Rate Limiting Errors (429)
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Request rate limit exceeded. Please try again later',
    statusCode: 429,
  },
  TOO_MANY_LOGIN_ATTEMPTS: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Account temporarily locked',
    statusCode: 429,
  },

  // System Errors (500)
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again later',
    statusCode: 500,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    statusCode: 500,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service integration failed',
    statusCode: 500,
  },
  ENCRYPTION_ERROR: {
    code: 'ENCRYPTION_ERROR',
    message: 'Data encryption/decryption failed',
    statusCode: 500,
  },
  AUDIT_LOG_ERROR: {
    code: 'AUDIT_LOG_ERROR',
    message: 'Failed to write audit log entry',
    statusCode: 500,
  },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = typeof ERROR_CODES[ErrorCodeKey];

/**
 * Get error details by code
 */
export function getErrorDetails(code: ErrorCodeKey): ErrorCodeValue {
  return ERROR_CODES[code];
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCodeKey,
  customMessage?: string,
  details?: any
) {
  const errorDetails = getErrorDetails(code);
  return {
    success: false,
    error: {
      code: errorDetails.code,
      message: customMessage || errorDetails.message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: 'generated-in-middleware',
    },
  };
}