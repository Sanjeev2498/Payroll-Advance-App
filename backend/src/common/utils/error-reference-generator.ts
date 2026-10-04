import { ERROR_CODES } from '../constants/error-codes';

/**
 * Error Reference Generator
 * Creates comprehensive error documentation for API consumers
 */

interface ErrorCodeDetails {
  code: string;
  message: string;
  description: string;
  commonCauses: string[];
  resolution: string;
  httpStatus: number;
  category: string;
}

export class ErrorReferenceGenerator {
  private static readonly ERROR_DETAILS: Record<string, Omit<ErrorCodeDetails, 'code' | 'message' | 'httpStatus'>> = {
    // Authentication Errors (401)
    AUTHENTICATION_FAILED: {
      description: 'User provided invalid login credentials (username/email and password combination)',
      commonCauses: [
        'Incorrect username or password',
        'Account does not exist',
        'Password has been changed recently',
        'Username/email typo',
      ],
      resolution: 'Verify credentials and try again. Use password reset if needed.',
      category: 'Authentication',
    },
    TOKEN_EXPIRED: {
      description: 'The JWT authentication token has exceeded its validity period',
      commonCauses: [
        'Token has naturally expired (default 1 hour)',
        'System time synchronization issues',
        'Long-running client session without refresh',
      ],
      resolution: 'Use refresh token to obtain new access token or re-authenticate.',
      category: 'Authentication',
    },
    TOKEN_INVALID: {
      description: 'The provided JWT token is malformed, corrupted, or has invalid signature',
      commonCauses: [
        'Token tampering or modification',
        'Incorrect JWT secret configuration',
        'Token corruption during transmission',
        'Invalid token format',
      ],
      resolution: 'Obtain a fresh token through authentication.',
      category: 'Authentication',
    },
    TOKEN_MISSING: {
      description: 'No authentication token was provided in the request',
      commonCauses: [
        'Authorization header not included',
        'Incorrect header format (missing "Bearer " prefix)',
        'Client not configured to send auth headers',
      ],
      resolution: 'Include valid JWT token in Authorization header as "Bearer <token>".',
      category: 'Authentication',
    },

    // Authorization Errors (403)
    AUTHORIZATION_FAILED: {
      description: 'User lacks the necessary permissions to perform the requested action',
      commonCauses: [
        'User role does not have required permission',
        'Permission was revoked or changed',
        'Attempting to access higher-level functionality',
        'Role hierarchy restrictions',
      ],
      resolution: 'Contact administrator to verify role and permissions, or use an account with appropriate access level.',
      category: 'Authorization',
    },
    TENANT_ACCESS_DENIED: {
      description: 'User attempted to access data outside their assigned tenant/organization',
      commonCauses: [
        'Cross-tenant data access attempt',
        'Incorrect tenant context in request',
        'User account moved between tenants',
        'Multi-tenant API misuse',
      ],
      resolution: 'Ensure requests target resources within your organization. Verify tenant context.',
      category: 'Authorization',
    },
    ROLE_PERMISSION_DENIED: {
      description: 'Specific role-based permission check failed for the current user',
      commonCauses: [
        'User role changed since login',
        'Permission removed from role configuration',
        'Temporary permission suspension',
        'Role hierarchy enforcement',
      ],
      resolution: 'Re-authenticate to refresh permissions, or contact administrator for role verification.',
      category: 'Authorization',
    },
    RESOURCE_OWNER_ONLY: {
      description: 'Action can only be performed by the resource owner',
      commonCauses: [
        'Attempting to modify another user\'s personal data',
        'Accessing private resources without ownership',
        'Insufficient delegation permissions',
      ],
      resolution: 'Only the resource owner or users with elevated permissions can perform this action.',
      category: 'Authorization',
    },

    // Validation Errors (400)
    VALIDATION_ERROR: {
      description: 'One or more input fields failed validation rules',
      commonCauses: [
        'Missing required fields',
        'Invalid data formats',
        'Field length violations',
        'Data type mismatches',
        'Custom validation rule failures',
      ],
      resolution: 'Review validation errors in response details and correct input data.',
      category: 'Validation',
    },
    REQUIRED_FIELD_MISSING: {
      description: 'A mandatory field was not provided or was empty',
      commonCauses: [
        'Form submitted with empty required fields',
        'API client omitting required parameters',
        'Null or undefined values sent for required fields',
      ],
      resolution: 'Provide valid values for all required fields indicated in the error details.',
      category: 'Validation',
    },
    INVALID_FORMAT: {
      description: 'Field value does not match the expected format or pattern',
      commonCauses: [
        'Email address format errors',
        'Phone number format violations',
        'Date/time format issues',
        'ID format mismatches (UUIDs, custom patterns)',
      ],
      resolution: 'Ensure field values match the documented format requirements.',
      category: 'Validation',
    },
    INVALID_DATE_RANGE: {
      description: 'Date range validation failed (end date before start date, or invalid date values)',
      commonCauses: [
        'End date is before start date',
        'Invalid date format',
        'Date values outside acceptable range',
        'Timezone conversion issues',
      ],
      resolution: 'Ensure end date is after start date and all dates are valid.',
      category: 'Validation',
    },

    // File Upload Errors (400)
    FILE_TYPE_NOT_ALLOWED: {
      description: 'Uploaded file type is not permitted for this endpoint',
      commonCauses: [
        'File extension not in allowed list',
        'MIME type validation failure',
        'Malicious file detection',
        'Security policy restrictions',
      ],
      resolution: 'Upload files with allowed extensions (typically: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG).',
      category: 'File Upload',
    },
    FILE_SIZE_EXCEEDED: {
      description: 'Uploaded file exceeds the maximum allowed size limit',
      commonCauses: [
        'File larger than system limit (typically 10MB)',
        'Multiple files exceeding combined limit',
        'Uncompressed large documents or images',
      ],
      resolution: 'Reduce file size through compression or splitting, or use alternative file formats.',
      category: 'File Upload',
    },

    // Resource Not Found Errors (404)
    USER_NOT_FOUND: {
      description: 'Requested user account does not exist in the system',
      commonCauses: [
        'Incorrect user ID or email provided',
        'User account was deleted',
        'Tenant isolation preventing access',
        'Typo in user identifier',
      ],
      resolution: 'Verify user identifier and ensure user exists in current tenant context.',
      category: 'Resource Not Found',
    },
    CLIENT_NOT_FOUND: {
      description: 'Specified client organization does not exist',
      commonCauses: [
        'Client was deleted or archived',
        'Incorrect client ID provided',
        'Access to client restricted by permissions',
      ],
      resolution: 'Verify client ID and check client status with administrator.',
      category: 'Resource Not Found',
    },
    SITE_NOT_FOUND: {
      description: 'Requested security site location does not exist',
      commonCauses: [
        'Site was deactivated or removed',
        'Site transferred to different client',
        'Incorrect site identifier',
      ],
      resolution: 'Confirm site ID and check if site is still active.',
      category: 'Resource Not Found',
    },
    EMPLOYEE_NOT_FOUND: {
      description: 'Employee record does not exist in the system',
      commonCauses: [
        'Employee was terminated and archived',
        'Incorrect employee ID',
        'Employee moved to different tenant',
      ],
      resolution: 'Verify employee ID and employment status.',
      category: 'Resource Not Found',
    },
    ASSIGNMENT_NOT_FOUND: {
      description: 'Assignment record does not exist in the system',
      commonCauses: [
        'Assignment was cancelled or removed',
        'Incorrect assignment ID',
        'Assignment moved to different period',
        'Temporary assignment expired',
      ],
      resolution: 'Verify assignment ID and check assignment status.',
      category: 'Resource Not Found',
    },
    SHIFT_NOT_FOUND: {
      description: 'Shift record does not exist in the system',
      commonCauses: [
        'Shift was cancelled or deleted',
        'Incorrect shift ID',
        'Shift schedule was modified',
        'Past shift record archived',
      ],
      resolution: 'Verify shift ID and check current shift schedule.',
      category: 'Resource Not Found',
    },
    ATTENDANCE_NOT_FOUND: {
      description: 'Attendance record does not exist for the specified parameters',
      commonCauses: [
        'No attendance recorded for the date/employee',
        'Attendance record was deleted',
        'Incorrect date or employee ID',
        'Attendance not yet submitted',
      ],
      resolution: 'Verify attendance parameters and check if attendance was recorded.',
      category: 'Resource Not Found',
    },
    PAYROLL_NOT_FOUND: {
      description: 'Payroll run does not exist for the specified period',
      commonCauses: [
        'Payroll not yet generated for period',
        'Incorrect payroll run ID',
        'Payroll was cancelled or deleted',
        'Wrong pay period specified',
      ],
      resolution: 'Verify payroll run ID and pay period dates.',
      category: 'Resource Not Found',
    },
    INVOICE_NOT_FOUND: {
      description: 'Invoice record does not exist in the system',
      commonCauses: [
        'Invoice was voided or deleted',
        'Incorrect invoice ID or number',
        'Invoice not yet generated',
        'Wrong client or period specified',
      ],
      resolution: 'Verify invoice ID and check invoice generation status.',
      category: 'Resource Not Found',
    },

    // Conflict Errors (409)
    EMAIL_ALREADY_EXISTS: {
      description: 'Email address is already registered in the system',
      commonCauses: [
        'User attempting to register with existing email',
        'Email used by archived or deactivated account',
        'Multiple registration attempts',
        'Email case sensitivity ignored by system',
      ],
      resolution: 'Use a different email address or recover existing account.',
      category: 'Conflict',
    },
    EMPLOYEE_ID_DUPLICATE: {
      description: 'Employee ID already exists in the system',
      commonCauses: [
        'Attempting to create employee with existing ID',
        'ID format collision with existing employee',
        'Manual ID assignment conflicts',
        'Import process with duplicate IDs',
      ],
      resolution: 'Use a unique employee ID or update existing employee record.',
      category: 'Conflict',
    },
    SHIFT_CONFLICT: {
      description: 'Employee is already assigned to another shift at this time',
      commonCauses: [
        'Overlapping shift assignments',
        'Double-booking employee for same time slot',
        'Schedule import conflicts',
        'Manual scheduling errors',
      ],
      resolution: 'Resolve scheduling conflict by adjusting shift times or reassigning employee.',
      category: 'Conflict',
    },
    ATTENDANCE_ALREADY_EXISTS: {
      description: 'Attendance record already exists for this shift',
      commonCauses: [
        'Duplicate attendance submission',
        'Multiple check-in attempts',
        'System synchronization issues',
        'Manual attendance override conflicts',
      ],
      resolution: 'Update existing attendance record instead of creating new one.',
      category: 'Conflict',
    },
    PAYROLL_ALREADY_FINALIZED: {
      description: 'Payroll run is already finalized and cannot be modified',
      commonCauses: [
        'Attempting to edit finalized payroll',
        'Payroll processing already completed',
        'Approval workflow already finished',
        'Payment batch already submitted',
      ],
      resolution: 'Create adjustment in next payroll period or request payroll reopening.',
      category: 'Conflict',
    },
    INVOICE_ALREADY_PAID: {
      description: 'Invoice is already marked as paid',
      commonCauses: [
        'Multiple payment processing attempts',
        'Invoice status not updated properly',
        'Payment recorded in different system',
        'Manual payment entry conflicts',
      ],
      resolution: 'Verify payment status or create credit note if payment reversal needed.',
      category: 'Conflict',
    },

    // Business Logic Errors (422)
    SKILL_MISMATCH: {
      description: 'Employee skills do not meet the requirements for the assigned site or shift',
      commonCauses: [
        'Site requires certifications employee lacks',
        'Specialized security clearance needed',
        'Training requirements not met',
        'Equipment certification missing',
      ],
      resolution: 'Update employee skills/certifications or assign to appropriate site.',
      category: 'Business Logic',
    },
    INSUFFICIENT_COVERAGE: {
      description: 'Not enough qualified guards assigned to meet site security requirements',
      commonCauses: [
        'Minimum guard count not met',
        'Required skill mix not available',
        'Shift coverage gaps',
        'Last-minute schedule changes',
      ],
      resolution: 'Add more qualified employees to the shift or adjust site requirements.',
      category: 'Business Logic',
    },
    PAYROLL_CALCULATION_ERROR: {
      description: 'Error occurred during automated payroll processing',
      commonCauses: [
        'Invalid time tracking data',
        'Missing rate information',
        'Overtime calculation conflicts',
        'Tax calculation errors',
      ],
      resolution: 'Review employee time records and rate settings, then recalculate payroll.',
      category: 'Business Logic',
    },
    INVALID_WORK_HOURS: {
      description: 'Work hours exceed maximum allowed limits',
      commonCauses: [
        'Employee logged more than daily limit',
        'Weekly work hour limits exceeded',
        'Overtime rules violation',
        'Consecutive shift restrictions broken',
      ],
      resolution: 'Adjust work hours to comply with labor regulations and company policies.',
      category: 'Business Logic',
    },
    ATTENDANCE_TIME_INVALID: {
      description: 'Clock-out time cannot be before clock-in time',
      commonCauses: [
        'Incorrect clock-out time entry',
        'System time zone issues',
        'Manual time adjustment errors',
        'Cross-day shift scheduling problems',
      ],
      resolution: 'Correct the attendance times to ensure clock-in is before clock-out.',
      category: 'Business Logic',
    },
    GPS_VERIFICATION_FAILED: {
      description: 'GPS location verification failed for attendance',
      commonCauses: [
        'Employee not at designated work location',
        'GPS signal accuracy issues',
        'Location services disabled',
        'Geofence boundaries too restrictive',
      ],
      resolution: 'Ensure employee is at correct location or adjust geofence settings.',
      category: 'Business Logic',
    },

    // System Errors (500)
    INTERNAL_SERVER_ERROR: {
      description: 'Unexpected system error occurred during request processing',
      commonCauses: [
        'Application bug or exception',
        'Resource exhaustion (memory, CPU)',
        'Configuration errors',
        'Unexpected data conditions',
      ],
      resolution: 'Try request again later. If problem persists, contact technical support with error ID.',
      category: 'System Error',
    },
    DATABASE_ERROR: {
      description: 'Database operation failed due to system or connectivity issues',
      commonCauses: [
        'Database server connectivity issues',
        'Query timeout or deadlock',
        'Database maintenance or backup',
        'Connection pool exhaustion',
      ],
      resolution: 'Retry request after brief delay. Check system status or contact support if persistent.',
      category: 'System Error',
    },
    EXTERNAL_SERVICE_ERROR: {
      description: 'Integration with external service (payment, email, etc.) failed',
      commonCauses: [
        'Third-party service downtime',
        'Network connectivity issues',
        'API rate limits exceeded',
        'Service authentication problems',
      ],
      resolution: 'Check service status and retry. May need to use alternative methods temporarily.',
      category: 'System Error',
    },
    ENCRYPTION_ERROR: {
      description: 'Data encryption or decryption process failed',
      commonCauses: [
        'Invalid encryption keys',
        'Corrupted encrypted data',
        'Key rotation conflicts',
        'Encryption algorithm issues',
      ],
      resolution: 'Verify encryption configuration and retry. Contact support if persistent.',
      category: 'System Error',
    },
    AUDIT_LOG_ERROR: {
      description: 'Failed to write audit log entry for the operation',
      commonCauses: [
        'Audit system unavailable',
        'Log storage capacity exceeded',
        'Audit configuration errors',
        'Database write failures',
      ],
      resolution: 'Operation may have succeeded but not logged. Check system status.',
      category: 'System Error',
    },

    // Rate Limiting Errors (429)
    RATE_LIMIT_EXCEEDED: {
      description: 'Request rate limit exceeded for the current user or IP address',
      commonCauses: [
        'Too many requests in short time period',
        'Burst traffic exceeding limits',
        'Client-side retry loops',
        'Shared IP address limits',
      ],
      resolution: 'Wait for rate limit window to reset or implement exponential backoff.',
      category: 'Rate Limiting',
    },
    TOO_MANY_LOGIN_ATTEMPTS: {
      description: 'Account temporarily locked due to excessive failed login attempts',
      commonCauses: [
        'Multiple incorrect password attempts',
        'Brute force attack prevention',
        'Automated login scripts',
        'User forgetting password',
      ],
      resolution: 'Wait for lockout period to expire or use password reset functionality.',
      category: 'Rate Limiting',
    },
  };

  /**
   * Generate comprehensive error reference documentation
   */
  static generateErrorReference(): Record<string, {
    statusCode: number;
    category: string;
    codes: Record<string, ErrorCodeDetails>;
  }> {
    const reference: Record<string, {
      statusCode: number;
      category: string;
      codes: Record<string, ErrorCodeDetails>;
    }> = {};

    // Group errors by HTTP status code
    Object.entries(ERROR_CODES).forEach(([key, errorCode]) => {
      const statusCode = errorCode.statusCode;
      const details = this.ERROR_DETAILS[key];

      if (!details) return;

      const statusKey = `${statusCode}`;
      
      if (!reference[statusKey]) {
        reference[statusKey] = {
          statusCode,
          category: this.getStatusCategory(statusCode),
          codes: {},
        };
      }

      reference[statusKey].codes[key] = {
        code: errorCode.code,
        message: errorCode.message,
        httpStatus: statusCode,
        ...details,
      };
    });

    return reference;
  }

  /**
   * Generate Markdown documentation for error codes
   */
  static generateMarkdownDocumentation(): string {
    const reference = this.generateErrorReference();
    let markdown = '# API Error Code Reference\n\n';

    markdown += 'This document provides a comprehensive reference for all error codes that may be returned by the Payroll System API.\n\n';
    
    markdown += '## Error Response Format\n\n';
    markdown += 'All API errors follow a consistent response format:\n\n';
    markdown += '```json\n';
    markdown += '{\n';
    markdown += '  "success": false,\n';
    markdown += '  "error": {\n';
    markdown += '    "code": "ERROR_CODE_NAME",\n';
    markdown += '    "message": "Human-readable error message",\n';
    markdown += '    "details": {\n';
    markdown += '      // Additional error-specific information\n';
    markdown += '    }\n';
    markdown += '  },\n';
    markdown += '  "metadata": {\n';
    markdown += '    "timestamp": "2024-01-15T10:30:00Z",\n';
    markdown += '    "requestId": "req-123456789"\n';
    markdown += '  }\n';
    markdown += '}\n';
    markdown += '```\n\n';

    // Sort by HTTP status code
    const sortedStatuses = Object.keys(reference).sort((a, b) => parseInt(a) - parseInt(b));

    sortedStatuses.forEach(statusCode => {
      const statusInfo = reference[statusCode];
      markdown += `## HTTP ${statusCode} - ${statusInfo.category}\n\n`;

      Object.entries(statusInfo.codes).forEach(([errorKey, errorDetails]) => {
        markdown += `### ${errorDetails.code}\n\n`;
        markdown += `**Message:** ${errorDetails.message}\n\n`;
        markdown += `**Description:** ${errorDetails.description}\n\n`;
        
        markdown += '**Common Causes:**\n';
        errorDetails.commonCauses.forEach(cause => {
          markdown += `- ${cause}\n`;
        });
        markdown += '\n';

        markdown += `**Resolution:** ${errorDetails.resolution}\n\n`;
        markdown += '---\n\n';
      });
    });

    return markdown;
  }

  /**
   * Generate JSON reference for programmatic use
   */
  static generateJSONReference(): string {
    const reference = this.generateErrorReference();
    return JSON.stringify(reference, null, 2);
  }

  /**
   * Get category name for HTTP status code
   */
  private static getStatusCategory(statusCode: number): string {
    switch (Math.floor(statusCode / 100)) {
      case 4:
        if (statusCode === 401) return 'Authentication Errors';
        if (statusCode === 403) return 'Authorization Errors';
        if (statusCode === 404) return 'Resource Not Found Errors';
        if (statusCode === 409) return 'Conflict Errors';
        if (statusCode === 422) return 'Business Logic Errors';
        if (statusCode === 429) return 'Rate Limiting Errors';
        return 'Client Errors';
      case 5:
        return 'Server Errors';
      default:
        return 'Unknown Errors';
    }
  }

  /**
   * Get errors by category for documentation organization
   */
  static getErrorsByCategory(): Record<string, ErrorCodeDetails[]> {
    const reference = this.generateErrorReference();
    const categories: Record<string, ErrorCodeDetails[]> = {};

    Object.values(reference).forEach(statusGroup => {
      Object.values(statusGroup.codes).forEach(errorDetails => {
        if (!categories[errorDetails.category]) {
          categories[errorDetails.category] = [];
        }
        categories[errorDetails.category].push(errorDetails);
      });
    });

    return categories;
  }

  /**
   * Generate API client error handling examples
   */
  static generateClientExamples(): Record<string, string> {
    return {
      javascript: `
// JavaScript/TypeScript error handling example
async function handleApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    return response.data;
  } catch (error) {
    if (error.response) {
      const { statusCode, error: errorDetails } = error.response.data;
      
      switch (errorDetails.code) {
        case 'TOKEN_EXPIRED':
          // Refresh token and retry
          await refreshAuthToken();
          return handleApiCall(apiFunction);
          
        case 'AUTHORIZATION_FAILED':
          // Redirect to unauthorized page
          window.location.href = '/unauthorized';
          break;
          
        case 'VALIDATION_ERROR':
          // Display field-specific errors
          displayValidationErrors(errorDetails.details.fields);
          break;
          
        case 'RATE_LIMIT_EXCEEDED':
          // Wait and retry
          const retryAfter = errorDetails.details.retryAfter;
          setTimeout(() => handleApiCall(apiFunction), retryAfter * 1000);
          break;
          
        default:
          // Log error and show generic message
          console.error('API Error:', errorDetails);
          showErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
    throw error;
  }
}
      `,
      python: `
# Python error handling example
import requests
import time
from typing import Dict, Any

class APIClient:
    def handle_api_call(self, api_function):
        try:
            response = api_function()
            response.raise_for_status()
            return response.json()
        except requests.HTTPError as e:
            error_data = e.response.json()
            error_code = error_data.get('error', {}).get('code')
            
            if error_code == 'TOKEN_EXPIRED':
                self.refresh_auth_token()
                return self.handle_api_call(api_function)
            elif error_code == 'AUTHORIZATION_FAILED':
                raise PermissionError("Insufficient permissions")
            elif error_code == 'VALIDATION_ERROR':
                raise ValueError(f"Validation failed: {error_data}")
            elif error_code == 'RATE_LIMIT_EXCEEDED':
                retry_after = error_data.get('error', {}).get('details', {}).get('retryAfter', 60)
                time.sleep(retry_after)
                return self.handle_api_call(api_function)
            else:
                raise Exception(f"API Error: {error_data}")
      `,
      curl: `
# cURL error handling examples

# Handle 401 - Token expired
curl -H "Authorization: Bearer expired_token" \\
     https://api.example.com/employees
# Response: {"success": false, "error": {"code": "TOKEN_EXPIRED", ...}}

# Handle 403 - Insufficient permissions  
curl -H "Authorization: Bearer valid_token" \\
     https://api.example.com/admin/settings
# Response: {"success": false, "error": {"code": "AUTHORIZATION_FAILED", ...}}

# Handle 400 - Validation error
curl -X POST -H "Content-Type: application/json" \\
     -d '{"email": "invalid-email"}' \\
     https://api.example.com/employees
# Response: {"success": false, "error": {"code": "VALIDATION_ERROR", "details": {"fields": [...]}}}

# Handle 429 - Rate limit exceeded
curl https://api.example.com/employees # (after many requests)
# Response: {"success": false, "error": {"code": "RATE_LIMIT_EXCEEDED", "details": {"retryAfter": 60}}}
      `,
    };
  }
}