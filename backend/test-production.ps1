#!/usr/bin/env pwsh
# Production Testing Script

param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$AdminToken = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Production Smoke Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $AdminToken) {
    Write-Host "Warning: No admin token provided. Some tests will be skipped." -ForegroundColor Yellow
    Write-Host "Usage: .\test-production.ps1 -AdminToken 'your-token-here'" -ForegroundColor Gray
    Write-Host ""
}

$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Test-ProductionEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Test: $Name" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ PASSED (Status: $($response.StatusCode))" -ForegroundColor Green
            $script:testResults.Passed++
        } else {
            Write-Host "  ✗ FAILED (Expected $ExpectedStatus, got $($response.StatusCode))" -ForegroundColor Red
            $script:testResults.Failed++
        }
    } catch {
        Write-Host "  ✗ FAILED ($($_.Exception.Message))" -ForegroundColor Red
        $script:testResults.Failed++
    }
    
    Write-Host ""
}

# Test 1: Health Check
Test-ProductionEndpoint -Name "Health Check" -Url "$BaseUrl/health"

# Test 2: API Documentation
Test-ProductionEndpoint -Name "API Documentation" -Url "$BaseUrl/api/docs"

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed:  $($testResults.Failed)" -ForegroundColor Red
Write-Host "Skipped: $($testResults.Skipped)" -ForegroundColor Gray
Write-Host ""

if ($testResults.Failed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
    exit 1
}
