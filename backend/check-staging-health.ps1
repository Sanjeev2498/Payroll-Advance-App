# Staging Health Check Dashboard
# Quick status check for staging environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Staging Environment Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check containers
Write-Host "Container Status:" -ForegroundColor Yellow
docker ps --filter "name=payroll-.*-staging" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""

# Check backend logs for errors
Write-Host "Recent Application Logs (Last 10 lines):" -ForegroundColor Yellow
docker-compose -f docker-compose.staging.yml logs --tail=10 backend-staging 2>&1 | Select-Object -Last 10

Write-Host ""

# Check for field mapping errors
Write-Host "Checking for Field Mapping Errors..." -ForegroundColor Yellow
$logs = docker-compose -f docker-compose.staging.yml logs --tail=100 backend-staging 2>&1 | Out-String
$fieldErrors = $logs | Select-String -Pattern "employee_number|Cannot find|snake_case" -AllMatches

if ($fieldErrors.Matches.Count -eq 0) {
    Write-Host "✓ No field mapping errors found" -ForegroundColor Green
} else {
    Write-Host "✗ Found $($fieldErrors.Matches.Count) potential field mapping issues" -ForegroundColor Red
}

Write-Host ""

# Resource usage
Write-Host "Resource Usage:" -ForegroundColor Yellow
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" payroll-backend-staging payroll-postgres-staging payroll-redis-staging

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
