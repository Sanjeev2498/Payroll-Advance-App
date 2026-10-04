
# cURL error handling examples

# Handle 401 - Token expired
curl -H "Authorization: Bearer expired_token" \
     https://api.example.com/employees
# Response: {"success": false, "error": {"code": "TOKEN_EXPIRED", ...}}

# Handle 403 - Insufficient permissions  
curl -H "Authorization: Bearer valid_token" \
     https://api.example.com/admin/settings
# Response: {"success": false, "error": {"code": "AUTHORIZATION_FAILED", ...}}

# Handle 400 - Validation error
curl -X POST -H "Content-Type: application/json" \
     -d '{"email": "invalid-email"}' \
     https://api.example.com/employees
# Response: {"success": false, "error": {"code": "VALIDATION_ERROR", "details": {"fields": [...]}}}

# Handle 429 - Rate limit exceeded
curl https://api.example.com/employees # (after many requests)
# Response: {"success": false, "error": {"code": "RATE_LIMIT_EXCEEDED", "details": {"retryAfter": 60}}}
      