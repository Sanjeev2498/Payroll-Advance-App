# Task 10: Deploy to Staging - Deployment Guide

## 🎯 Prerequisites

- [x] Tasks 1-9 completed
- [x] All tests passing (818/818)
- [x] Build successful (no compilation errors)
- [ ] Staging environment provisioned
- [ ] Database migrations ready
- [ ] Environment variables configured

---

## 📦 Pre-Deployment Checklist

### 1. Code Verification

cd "G:\Payroll System\backend"

# Verify build
npm run build

# Run all tests
npm run test

# Check for TypeScript errors
npx tsc --noEmit

### 2. Database Migrations

# Review pending migrations
npx prisma migrate status

# Generate migration SQL (if needed)
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource staging --script > migration.sql

# Review the migration script
cat migration.sql

### 3. Environment Configuration

**Required environment variables for staging:**

DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/payroll_staging
JWT_SECRET=<staging-jwt-secret>
JWT_EXPIRATION=3600
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://staging-app.example.com
LOG_LEVEL=info

# Encryption keys (if needed)
ENCRYPTION_KEY=<staging-encryption-key>

---

## 🚀 Deployment Steps

### Step 1: Commit and Push Code

git status
git add .
git commit -m "feat: field mapping architecture (Tasks 1-9 complete)"
git push origin main

### Step 2: Deploy to Staging Server

**Option A: Manual Deployment**

# SSH into staging server
ssh user@staging-server.example.com

# Navigate to application directory
cd /var/www/payroll-backend

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Apply database migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Restart application
pm2 restart payroll-backend

**Option B: CI/CD Pipeline**

# Trigger deployment pipeline
# (GitHub Actions, GitLab CI, Jenkins, etc.)

# Monitor deployment logs
# Check CI/CD dashboard for status

### Step 3: Verify Deployment

# Check application health
curl https://staging-api.example.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00Z"}

# Check database connection
curl https://staging-api.example.com/health/db

---

## ✅ Post-Deployment Verification

### 1. Smoke Tests

#### Test 1: Create Employee (camelCase DTO)

curl -X POST https://staging-api.example.com/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staging-token>" \
  -d @- << EOF
{
  "employeeNumber": "E001-STAGING",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "hireDate": "2024-01-01",
  "jobTitle": "Security Officer",
  "employmentStatus": "active"
}
EOF

**Expected:** HTTP 201, response with camelCase fields

#### Test 2: Get Employee

curl https://staging-api.example.com/employees/1 \
  -H "Authorization: Bearer <staging-token>"

**Expected:** HTTP 200, response with camelCase fields

#### Test 3: Verify Database (snake_case)

# SSH into database server or use SQL client
psql -h staging-db.example.com -U user -d payroll_staging

# Check data format
SELECT employee_number, first_name, last_name FROM employees LIMIT 1;

**Expected:** Columns in snake_case, data stored correctly

#### Test 4: Test Error Handling

# Try to create duplicate employee
curl -X POST https://staging-api.example.com/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staging-token>" \
  -d @- << EOF
{
  "employeeNumber": "E001-STAGING",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "hireDate": "2024-01-01"
}
EOF

**Expected:** HTTP 409 Conflict with message "employeeNumber already exists" (camelCase field name)

#### Test 5: Update Employee

curl -X PATCH https://staging-api.example.com/employees/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staging-token>" \
  -d '"jobTitle": "Senior Security Officer"'

**Expected:** HTTP 200, updated employee with camelCase response

#### Test 6: Delete Employee

curl -X DELETE https://staging-api.example.com/employees/1 \
  -H "Authorization: Bearer <staging-token>"

**Expected:** HTTP 200 or 204

### 2. Performance Verification

# Measure field mapping overhead
# Run Apache Bench or similar tool

ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
  https://staging-api.example.com/employees

**Expected:** 
- Response time increase < 5ms
- No memory leaks
- No CPU spikes

### 3. Error Log Verification

# Check application logs
tail -f /var/log/payroll-backend/error.log

**Expected:**
- No field name mismatch errors
- Meaningful error messages (not "API Response Error: {}")
- All field names in errors are camelCase

### 4. Integration Test Suite

# Run integration tests against staging
npm run test:e2e -- --baseUrl=https://staging-api.example.com

**Expected:** All integration tests pass

---

## 📊 Monitoring Setup

### Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Field mapping cache hit rate

**System Metrics:**
- CPU usage
- Memory usage
- Database connection pool
- Active requests

**Business Metrics:**
- Employee CRUD operations
- Authentication success rate
- API endpoint usage

### Monitoring Tools

# Setup monitoring dashboards
# Examples: New Relic, Datadog, Prometheus + Grafana

# Sample Prometheus metrics endpoint
curl https://staging-api.example.com/metrics

---

## 🚨 Rollback Plan

### If Deployment Fails:

**Option 1: Revert Code**

# SSH into staging server
cd /var/www/payroll-backend

# Checkout previous commit
git log --oneline  # Find last known good commit
git checkout <previous-commit-hash>

# Rebuild
npm ci --production
npm run build

# Restart
pm2 restart payroll-backend

**Option 2: Database Rollback**

# If migrations caused issues
npx prisma migrate resolve --rolled-back <migration-name>

# Restore database backup
pg_restore -h staging-db.example.com -U user -d payroll_staging backup.sql

**Option 3: Full Environment Restore**

# Use infrastructure-as-code to restore previous state
# (Terraform, CloudFormation, etc.)

---

## ✅ Task 10 Acceptance Criteria

- [ ] Code deployed to staging environment
- [ ] Database migrations applied successfully
- [ ] All integration tests pass in staging
- [ ] Manual testing checklist completed (6/6 smoke tests)
- [ ] Performance monitoring shows < 5ms overhead
- [ ] Error logs show meaningful error messages
- [ ] No regressions in existing functionality

---

## 📝 Deployment Sign-Off

**Deployed by:** ___________________  
**Date:** ___________________  
**Build version:** ___________________  
**Database migration version:** ___________________  

**Verification results:**
- [ ] Smoke tests: PASSED
- [ ] Performance: PASSED (< 5ms overhead)
- [ ] Error logs: PASSED (meaningful messages)
- [ ] Integration tests: PASSED

**Issues encountered:** ___________________

**Rollback performed:** [ ] Yes [ ] No

---

## 📞 Support Contacts

**Backend Team:** backend-team@example.com  
**DevOps Team:** devops@example.com  
**On-call Engineer:** +1-XXX-XXX-XXXX

---

## 🔗 Related Documentation

- [Field Mapping Guide](../docs/field-mapping-guide.md)
- [Migration Guide](../docs/migration-guide.md)
- [README](../README.md)
- [Deployment Runbook](./deployment-runbook.md)

---

**Next Step:** After 3 days of successful staging validation, proceed to Task 11 (Monitor and Validate in Staging).
