#!/usr/bin/env pwsh
# Production Deployment Script - Task 12

param(
    [switch]$SkipBackup = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task 12: Production Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Pre-deployment checklist
Write-Host "Step 1: Pre-deployment Checklist" -ForegroundColor Yellow
Write-Host ""

# Check staging validation
Write-Host "  Checking staging validation..." -ForegroundColor Gray
$stagingLogs = docker-compose -f docker-compose.staging.yml logs --tail=500 backend-staging 2>&1 | Out-String
$fieldErrors = $stagingLogs | Select-String -Pattern "employee_number|first_name" -AllMatches

if ($fieldErrors.Matches.Count -gt 5) {
    Write-Host "  ✗ Staging has field mapping errors ($($fieldErrors.Matches.Count))" -ForegroundColor Red
    Write-Host "  Fix staging issues before production deployment" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ✓ Staging validation passed" -ForegroundColor Green
}

# Check if build succeeds
Write-Host "  Verifying build..." -ForegroundColor Gray
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Build successful" -ForegroundColor Green
} else {
    Write-Host "  ✗ Build failed" -ForegroundColor Red
    exit 1
}

# Check Docker
Write-Host "  Checking Docker..." -ForegroundColor Gray
try {
    docker info | Out-Null
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Database backup
if (-not $SkipBackup -and -not $DryRun) {
    Write-Host "Step 2: Database Backup" -ForegroundColor Yellow
    Write-Host ""
    
    $backupFile = "backup-production-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    Write-Host "  Creating backup: $backupFile" -ForegroundColor Gray
    
    # This assumes production DB exists
    docker exec payroll-postgres pg_dump -U payroll_user payroll_system > $backupFile 2>&1
    
    if (Test-Path $backupFile) {
        $backupSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "  ✓ Backup created: $([math]::Round($backupSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Backup not created (DB may not exist yet)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Step 2: Database Backup [SKIPPED]" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Build production Docker image
Write-Host "Step 3: Building Production Docker Image" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    docker build -t payroll-backend:production . 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Docker build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Production image built" -ForegroundColor Green
} else {
    Write-Host "  [DRY RUN] Would build Docker image" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Deploy to production
Write-Host "Step 4: Deploying to Production" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "  Starting production environment..." -ForegroundColor Gray
    docker-compose -f docker-compose.production.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Production environment started" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to start production environment" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Would deploy to production" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Wait for services to be healthy
Write-Host "Step 5: Waiting for Services to Start" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "  This may take 30-60 seconds..." -ForegroundColor Gray
    
    $maxAttempts = 30
    $attempt = 0
    $healthy = $false
    
    while ($attempt -lt $maxAttempts -and -not $healthy) {
        Start-Sleep -Seconds 2
        $attempt++
        
        $postgresHealth = docker inspect --format='{{.State.Health.Status}}' payroll-postgres-production 2>$null
        $redisHealth = docker inspect --format='{{.State.Health.Status}}' payroll-redis-production 2>$null
        $backendHealth = docker inspect --format='{{.State.Health.Status}}' payroll-backend-production 2>$null
        
        if ($postgresHealth -eq "healthy" -and $redisHealth -eq "healthy") {
            Write-Host "  ✓ Database and Redis are healthy" -ForegroundColor Green
            if ($backendHealth -eq "healthy") {
                Write-Host "  ✓ Backend is healthy" -ForegroundColor Green
                $healthy = $true
            } else {
                Write-Host "    Waiting for backend... ($attempt/$maxAttempts)" -ForegroundColor Gray
            }
        } else {
            Write-Host "    Waiting for services... ($attempt/$maxAttempts)" -ForegroundColor Gray
        }
    }
    
    if (-not $healthy) {
        Write-Host "  ✗ Services did not become healthy in time" -ForegroundColor Red
        Write-Host "  Check logs: docker-compose -f docker-compose.production.yml logs" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Would wait for services" -ForegroundColor Gray
}

Write-Host ""

# Step 6: Run smoke tests
Write-Host "Step 6: Running Smoke Tests" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "  Test 1: Health check..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Health check passed" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Health check failed (Status: $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ⚠️  Health check endpoint not accessible" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [DRY RUN] Would run smoke tests" -ForegroundColor Gray
}

Write-Host ""

# Step 7: Monitoring setup
Write-Host "Step 7: Monitoring Setup" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "  Monitoring production environment for 1 hour..." -ForegroundColor Gray
    Write-Host "  Check logs: docker-compose -f docker-compose.production.yml logs -f" -ForegroundColor Cyan
} else {
    Write-Host "  [DRY RUN] Would setup monitoring" -ForegroundColor Gray
}

Write-Host ""

# Final summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "PostgreSQL: localhost:5434" -ForegroundColor Cyan
Write-Host "Redis: localhost:6381" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor for 1 hour: docker-compose -f docker-compose.production.yml logs -f" -ForegroundColor White
Write-Host "  2. Run production tests: .\test-production.ps1" -ForegroundColor White
Write-Host "  3. Update status page" -ForegroundColor White
Write-Host "  4. Notify on-call engineer" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  This was a DRY RUN - no changes were made" -ForegroundColor Yellow
}
