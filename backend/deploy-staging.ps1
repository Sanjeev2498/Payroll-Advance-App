#!/usr/bin/env pwsh
# Staging Deployment Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task 10: Deploy to Staging" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Pre-deployment checks
Write-Host "Step 1: Pre-deployment checks..." -ForegroundColor Yellow

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if build succeeds
Write-Host "Building application..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Step 2: Build Docker image
Write-Host ""
Write-Host "Step 2: Building Docker image..." -ForegroundColor Yellow
docker build -t payroll-backend:staging .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker image built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Docker image build failed" -ForegroundColor Red
    exit 1
}

# Step 3: Start staging environment
Write-Host ""
Write-Host "Step 3: Starting staging environment..." -ForegroundColor Yellow
docker-compose -f docker-compose.staging.yml up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Staging environment started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start staging environment" -ForegroundColor Red
    exit 1
}

# Step 4: Wait for services to be healthy
Write-Host ""
Write-Host "Step 4: Waiting for services to be healthy..." -ForegroundColor Yellow
Write-Host "This may take 30-60 seconds..." -ForegroundColor Gray

$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    Start-Sleep -Seconds 2
    $attempt++
    
    $postgresHealth = docker inspect --format='{{.State.Health.Status}}' payroll-postgres-staging 2>$null
    $redisHealth = docker inspect --format='{{.State.Health.Status}}' payroll-redis-staging 2>$null
    $backendHealth = docker inspect --format='{{.State.Health.Status}}' payroll-backend-staging 2>$null
    
    if ($postgresHealth -eq "healthy" -and $redisHealth -eq "healthy") {
        Write-Host "✓ Database and Redis are healthy" -ForegroundColor Green
        if ($backendHealth -eq "healthy") {
            Write-Host "✓ Backend is healthy" -ForegroundColor Green
            $healthy = $true
        } else {
            Write-Host "  Waiting for backend... ($attempt/$maxAttempts)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Waiting for services... ($attempt/$maxAttempts)" -ForegroundColor Gray
    }
}

if (-not $healthy) {
    Write-Host "✗ Services did not become healthy in time" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose -f docker-compose.staging.yml logs" -ForegroundColor Yellow
    exit 1
}

# Step 5: Apply database migrations
Write-Host ""
Write-Host "Step 5: Applying database migrations..." -ForegroundColor Yellow
docker exec payroll-backend-staging npx prisma migrate deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database migrations applied" -ForegroundColor Green
} else {
    Write-Host "✗ Database migrations failed" -ForegroundColor Red
    exit 1
}

# Step 6: Run smoke tests
Write-Host ""
Write-Host "Step 6: Running smoke tests..." -ForegroundColor Yellow

# Test 1: Health check
Write-Host "  Test 1: Health check..." -ForegroundColor Gray
$healthResponse = Invoke-WebRequest -Uri "http://localhost:3002/health" -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
if ($healthResponse.StatusCode -eq 200) {
    Write-Host "  ✓ Health check passed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Health check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Staging API: http://localhost:3002" -ForegroundColor Cyan
Write-Host "PostgreSQL: localhost:5433" -ForegroundColor Cyan
Write-Host "Redis: localhost:6380" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run manual tests: .\scripts\test-staging.ps1" -ForegroundColor White
Write-Host "  2. Check logs: docker-compose -f docker-compose.staging.yml logs -f" -ForegroundColor White
Write-Host "  3. Monitor for 3 days (Task 11)" -ForegroundColor White
Write-Host ""
