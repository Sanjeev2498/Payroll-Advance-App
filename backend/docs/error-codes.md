# API Error Code Reference

This document provides a comprehensive reference for all error codes that may be returned by the Payroll System API.

## Error Response Format

All API errors follow a consistent response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_NAME",
    "message": "Human-readable error message",
    "details": {
      // Additional error-specific information
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123456789"
  }
}
```

## HTTP 400 - Client Errors

### VALIDATION_ERROR

**Message:** Input validation failed

**Description:** One or more input fields failed validation rules

**Common Causes:**
- Missing required fields
- Invalid data formats
- Field length violations
- Data type mismatches
- Custom validation rule failures

**Resolution:** Review validation errors in response details and correct input data.

---

### REQUIRED_FIELD_MISSING

**Message:** Required field is missing or empty

**Description:** A mandatory field was not provided or was empty

**Common Causes:**
- Form submitted with empty required fields
- API client omitting required parameters
- Null or undefined values sent for required fields

**Resolution:** Provide valid values for all required fields indicated in the error details.

---

### INVALID_FORMAT

**Message:** Field format is invalid

**Description:** Field value does not match the expected format or pattern

**Common Causes:**
- Email address format errors
- Phone number format violations
- Date/time format issues
- ID format mismatches (UUIDs, custom patterns)

**Resolution:** Ensure field values match the documented format requirements.

---

### INVALID_DATE_RANGE

**Message:** Date range is invalid or end date is before start date

**Description:** Date range validation failed (end date before start date, or invalid date values)

**Common Causes:**
- End date is before start date
- Invalid date format
- Date values outside acceptable range
- Timezone conversion issues

**Resolution:** Ensure end date is after start date and all dates are valid.

---

### FILE_TYPE_NOT_ALLOWED

**Message:** File type is not allowed for upload

**Description:** Uploaded file type is not permitted for this endpoint

**Common Causes:**
- File extension not in allowed list
- MIME type validation failure
- Malicious file detection
- Security policy restrictions

**Resolution:** Upload files with allowed extensions (typically: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG).

---

### FILE_SIZE_EXCEEDED

**Message:** File size exceeds maximum allowed limit

**Description:** Uploaded file exceeds the maximum allowed size limit

**Common Causes:**
- File larger than system limit (typically 10MB)
- Multiple files exceeding combined limit
- Uncompressed large documents or images

**Resolution:** Reduce file size through compression or splitting, or use alternative file formats.

---

## HTTP 401 - Authentication Errors

### AUTHENTICATION_FAILED

**Message:** Invalid credentials provided

**Description:** User provided invalid login credentials (username/email and password combination)

**Common Causes:**
- Incorrect username or password
- Account does not exist
- Password has been changed recently
- Username/email typo

**Resolution:** Verify credentials and try again. Use password reset if needed.

---

### TOKEN_EXPIRED

**Message:** Authentication token has expired

**Description:** The JWT authentication token has exceeded its validity period

**Common Causes:**
- Token has naturally expired (default 1 hour)
- System time synchronization issues
- Long-running client session without refresh

**Resolution:** Use refresh token to obtain new access token or re-authenticate.

---

### TOKEN_INVALID

**Message:** Authentication token is invalid or malformed

**Description:** The provided JWT token is malformed, corrupted, or has invalid signature

**Common Causes:**
- Token tampering or modification
- Incorrect JWT secret configuration
- Token corruption during transmission
- Invalid token format

**Resolution:** Obtain a fresh token through authentication.

---

### TOKEN_MISSING

**Message:** Authentication token is required

**Description:** No authentication token was provided in the request

**Common Causes:**
- Authorization header not included
- Incorrect header format (missing "Bearer " prefix)
- Client not configured to send auth headers

**Resolution:** Include valid JWT token in Authorization header as "Bearer <token>".

---

## HTTP 403 - Authorization Errors

### AUTHORIZATION_FAILED

**Message:** Insufficient permissions to access this resource

**Description:** User lacks the necessary permissions to perform the requested action

**Common Causes:**
- User role does not have required permission
- Permission was revoked or changed
- Attempting to access higher-level functionality
- Role hierarchy restrictions

**Resolution:** Contact administrator to verify role and permissions, or use an account with appropriate access level.

---

### TENANT_ACCESS_DENIED

**Message:** Access to this tenant data is not permitted

**Description:** User attempted to access data outside their assigned tenant/organization

**Common Causes:**
- Cross-tenant data access attempt
- Incorrect tenant context in request
- User account moved between tenants
- Multi-tenant API misuse

**Resolution:** Ensure requests target resources within your organization. Verify tenant context.

---

### ROLE_PERMISSION_DENIED

**Message:** User role does not have required permissions

**Description:** Specific role-based permission check failed for the current user

**Common Causes:**
- User role changed since login
- Permission removed from role configuration
- Temporary permission suspension
- Role hierarchy enforcement

**Resolution:** Re-authenticate to refresh permissions, or contact administrator for role verification.

---

### RESOURCE_OWNER_ONLY

**Message:** Only the resource owner can perform this action

**Description:** Action can only be performed by the resource owner

**Common Causes:**
- Attempting to modify another user's personal data
- Accessing private resources without ownership
- Insufficient delegation permissions

**Resolution:** Only the resource owner or users with elevated permissions can perform this action.

---

## HTTP 404 - Resource Not Found Errors

### USER_NOT_FOUND

**Message:** User not found

**Description:** Requested user account does not exist in the system

**Common Causes:**
- Incorrect user ID or email provided
- User account was deleted
- Tenant isolation preventing access
- Typo in user identifier

**Resolution:** Verify user identifier and ensure user exists in current tenant context.

---

### CLIENT_NOT_FOUND

**Message:** Client not found

**Description:** Specified client organization does not exist

**Common Causes:**
- Client was deleted or archived
- Incorrect client ID provided
- Access to client restricted by permissions

**Resolution:** Verify client ID and check client status with administrator.

---

### SITE_NOT_FOUND

**Message:** Site not found

**Description:** Requested security site location does not exist

**Common Causes:**
- Site was deactivated or removed
- Site transferred to different client
- Incorrect site identifier

**Resolution:** Confirm site ID and check if site is still active.

---

### EMPLOYEE_NOT_FOUND

**Message:** Employee not found

**Description:** Employee record does not exist in the system

**Common Causes:**
- Employee was terminated and archived
- Incorrect employee ID
- Employee moved to different tenant

**Resolution:** Verify employee ID and employment status.

---

### ASSIGNMENT_NOT_FOUND

**Message:** Assignment not found

**Description:** Assignment record does not exist in the system

**Common Causes:**
- Assignment was cancelled or removed
- Incorrect assignment ID
- Assignment moved to different period
- Temporary assignment expired

**Resolution:** Verify assignment ID and check assignment status.

---

### SHIFT_NOT_FOUND

**Message:** Shift not found

**Description:** Shift record does not exist in the system

**Common Causes:**
- Shift was cancelled or deleted
- Incorrect shift ID
- Shift schedule was modified
- Past shift record archived

**Resolution:** Verify shift ID and check current shift schedule.

---

### ATTENDANCE_NOT_FOUND

**Message:** Attendance record not found

**Description:** Attendance record does not exist for the specified parameters

**Common Causes:**
- No attendance recorded for the date/employee
- Attendance record was deleted
- Incorrect date or employee ID
- Attendance not yet submitted

**Resolution:** Verify attendance parameters and check if attendance was recorded.

---

### PAYROLL_NOT_FOUND

**Message:** Payroll run not found

**Description:** Payroll run does not exist for the specified period

**Common Causes:**
- Payroll not yet generated for period
- Incorrect payroll run ID
- Payroll was cancelled or deleted
- Wrong pay period specified

**Resolution:** Verify payroll run ID and pay period dates.

---

### INVOICE_NOT_FOUND

**Message:** Invoice not found

**Description:** Invoice record does not exist in the system

**Common Causes:**
- Invoice was voided or deleted
- Incorrect invoice ID or number
- Invoice not yet generated
- Wrong client or period specified

**Resolution:** Verify invoice ID and check invoice generation status.

---

## HTTP 409 - Conflict Errors

### EMAIL_ALREADY_EXISTS

**Message:** Email address is already registered

**Description:** Email address is already registered in the system

**Common Causes:**
- User attempting to register with existing email
- Email used by archived or deactivated account
- Multiple registration attempts
- Email case sensitivity ignored by system

**Resolution:** Use a different email address or recover existing account.

---

### EMPLOYEE_ID_DUPLICATE

**Message:** Employee ID already exists

**Description:** Employee ID already exists in the system

**Common Causes:**
- Attempting to create employee with existing ID
- ID format collision with existing employee
- Manual ID assignment conflicts
- Import process with duplicate IDs

**Resolution:** Use a unique employee ID or update existing employee record.

---

### SHIFT_CONFLICT

**Message:** Employee is already assigned to another shift at this time

**Description:** Employee is already assigned to another shift at this time

**Common Causes:**
- Overlapping shift assignments
- Double-booking employee for same time slot
- Schedule import conflicts
- Manual scheduling errors

**Resolution:** Resolve scheduling conflict by adjusting shift times or reassigning employee.

---

### ATTENDANCE_ALREADY_EXISTS

**Message:** Attendance record already exists for this shift

**Description:** Attendance record already exists for this shift

**Common Causes:**
- Duplicate attendance submission
- Multiple check-in attempts
- System synchronization issues
- Manual attendance override conflicts

**Resolution:** Update existing attendance record instead of creating new one.

---

### PAYROLL_ALREADY_FINALIZED

**Message:** Payroll run is already finalized and cannot be modified

**Description:** Payroll run is already finalized and cannot be modified

**Common Causes:**
- Attempting to edit finalized payroll
- Payroll processing already completed
- Approval workflow already finished
- Payment batch already submitted

**Resolution:** Create adjustment in next payroll period or request payroll reopening.

---

### INVOICE_ALREADY_PAID

**Message:** Invoice is already marked as paid

**Description:** Invoice is already marked as paid

**Common Causes:**
- Multiple payment processing attempts
- Invoice status not updated properly
- Payment recorded in different system
- Manual payment entry conflicts

**Resolution:** Verify payment status or create credit note if payment reversal needed.

---

## HTTP 422 - Business Logic Errors

### SKILL_MISMATCH

**Message:** Employee skills do not match site requirements

**Description:** Employee skills do not meet the requirements for the assigned site or shift

**Common Causes:**
- Site requires certifications employee lacks
- Specialized security clearance needed
- Training requirements not met
- Equipment certification missing

**Resolution:** Update employee skills/certifications or assign to appropriate site.

---

### INSUFFICIENT_COVERAGE

**Message:** Insufficient guard coverage for site requirements

**Description:** Not enough qualified guards assigned to meet site security requirements

**Common Causes:**
- Minimum guard count not met
- Required skill mix not available
- Shift coverage gaps
- Last-minute schedule changes

**Resolution:** Add more qualified employees to the shift or adjust site requirements.

---

### PAYROLL_CALCULATION_ERROR

**Message:** Error occurred during payroll calculation

**Description:** Error occurred during automated payroll processing

**Common Causes:**
- Invalid time tracking data
- Missing rate information
- Overtime calculation conflicts
- Tax calculation errors

**Resolution:** Review employee time records and rate settings, then recalculate payroll.

---

### INVALID_WORK_HOURS

**Message:** Work hours exceed maximum allowed limits

**Description:** Work hours exceed maximum allowed limits

**Common Causes:**
- Employee logged more than daily limit
- Weekly work hour limits exceeded
- Overtime rules violation
- Consecutive shift restrictions broken

**Resolution:** Adjust work hours to comply with labor regulations and company policies.

---

### ATTENDANCE_TIME_INVALID

**Message:** Clock-out time cannot be before clock-in time

**Description:** Clock-out time cannot be before clock-in time

**Common Causes:**
- Incorrect clock-out time entry
- System time zone issues
- Manual time adjustment errors
- Cross-day shift scheduling problems

**Resolution:** Correct the attendance times to ensure clock-in is before clock-out.

---

### GPS_VERIFICATION_FAILED

**Message:** GPS location verification failed for attendance

**Description:** GPS location verification failed for attendance

**Common Causes:**
- Employee not at designated work location
- GPS signal accuracy issues
- Location services disabled
- Geofence boundaries too restrictive

**Resolution:** Ensure employee is at correct location or adjust geofence settings.

---

## HTTP 429 - Rate Limiting Errors

### RATE_LIMIT_EXCEEDED

**Message:** Request rate limit exceeded. Please try again later

**Description:** Request rate limit exceeded for the current user or IP address

**Common Causes:**
- Too many requests in short time period
- Burst traffic exceeding limits
- Client-side retry loops
- Shared IP address limits

**Resolution:** Wait for rate limit window to reset or implement exponential backoff.

---

### TOO_MANY_LOGIN_ATTEMPTS

**Message:** Too many login attempts. Account temporarily locked

**Description:** Account temporarily locked due to excessive failed login attempts

**Common Causes:**
- Multiple incorrect password attempts
- Brute force attack prevention
- Automated login scripts
- User forgetting password

**Resolution:** Wait for lockout period to expire or use password reset functionality.

---

## HTTP 500 - Server Errors

### INTERNAL_SERVER_ERROR

**Message:** An unexpected error occurred. Please try again later

**Description:** Unexpected system error occurred during request processing

**Common Causes:**
- Application bug or exception
- Resource exhaustion (memory, CPU)
- Configuration errors
- Unexpected data conditions

**Resolution:** Try request again later. If problem persists, contact technical support with error ID.

---

### DATABASE_ERROR

**Message:** Database operation failed

**Description:** Database operation failed due to system or connectivity issues

**Common Causes:**
- Database server connectivity issues
- Query timeout or deadlock
- Database maintenance or backup
- Connection pool exhaustion

**Resolution:** Retry request after brief delay. Check system status or contact support if persistent.

---

### EXTERNAL_SERVICE_ERROR

**Message:** External service integration failed

**Description:** Integration with external service (payment, email, etc.) failed

**Common Causes:**
- Third-party service downtime
- Network connectivity issues
- API rate limits exceeded
- Service authentication problems

**Resolution:** Check service status and retry. May need to use alternative methods temporarily.

---

### ENCRYPTION_ERROR

**Message:** Data encryption/decryption failed

**Description:** Data encryption or decryption process failed

**Common Causes:**
- Invalid encryption keys
- Corrupted encrypted data
- Key rotation conflicts
- Encryption algorithm issues

**Resolution:** Verify encryption configuration and retry. Contact support if persistent.

---

### AUDIT_LOG_ERROR

**Message:** Failed to write audit log entry

**Description:** Failed to write audit log entry for the operation

**Common Causes:**
- Audit system unavailable
- Log storage capacity exceeded
- Audit configuration errors
- Database write failures

**Resolution:** Operation may have succeeded but not logged. Check system status.

---

