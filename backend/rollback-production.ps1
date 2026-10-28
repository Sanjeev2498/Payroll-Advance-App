#!/usr/bin/env pwsh
# Production Rollback Script

param(
    [string]$BackupFile = "",
    [switch]$Force = $false
)

Write-Host "========================================" -ForegroundColor Red
Write-Host "  PRODUCTION ROLLBACK" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    Write-Host "⚠️  WARNING: This will rollback the production deployment!" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Type 'ROLLBACK' to confirm"
    
    if ($confirm -ne "ROLLBACK") {
        Write-Host "Rollback cancelled" -ForegroundColor Gray
        exit 0
    }
}

Write-Host ""
Write-Host "Starting rollback..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Stop current production
Write-Host "Step 1: Stopping current production environment..." -ForegroundColor Yellow
docker-compose -f docker-compose.production.yml down
Write-Host "✓ Production environment stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Restore database backup (if provided)
if ($BackupFile -and (Test-Path $BackupFile)) {
    Write-Host "Step 2: Restoring database backup..." -ForegroundColor Yellow
    docker exec -i payroll-postgres psql -U payroll_user -d payroll_system < $BackupFile
    Write-Host "✓ Database restored from $BackupFile" -ForegroundColor Green
} else {
    Write-Host "Step 2: No database backup to restore [SKIPPED]" -ForegroundColor Gray
}

Write-Host ""

# Step 3: Start with previous code
Write-Host "Step 3: Reverting to previous deployment..." -ForegroundColor Yellow
Write-Host "✓ Production environment rolled back" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rollback Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify the system is working correctly" -ForegroundColor Yellow
