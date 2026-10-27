#!/usr/bin/env pwsh
# Staging Test Script - Manual Testing Checklist for Task 10

param(
    [string]$BaseUrl = "http://localhost:3002",
    [string]$AdminToken = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task 10: Staging Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $AdminToken) {
    Write-Host "Warning: No admin token provided. Authentication tests will be skipped." -ForegroundColor Yellow
    Write-Host "Usage: .\scripts\test-staging.ps1 -AdminToken 'your-token-here'" -ForegroundColor Gray
    Write-Host ""
}

$headers = @{
    "Content-Type" = "application/json"
}

if ($AdminToken) {
    $headers["Authorization"] = "Bearer $AdminToken"
}

$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validation = $null
    )
    
    Write-Host "Test: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            if ($Validation) {
                $content = $response.Content | ConvertFrom-Json
                $validationResult = & $Validation $content
                if ($validationResult) {
                    Write-Host "  ✓ PASSED" -ForegroundColor Green
                    $script:testResults.Passed++
                } else {
                    Write-Host "  ✗ FAILED (validation failed)" -ForegroundColor Red
                    $script:testResults.Failed++
                }
            } else {
                Write-Host "  ✓ PASSED" -ForegroundColor Green
                $script:testResults.Passed++
            }
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
Test-Endpoint -Name "Health Check" `
    -Method "GET" `
    -Url "$BaseUrl/health" `
    -ExpectedStatus 200 `
    -Validation { param($data) return $data.status -eq "ok" }

# Test 2: Database Health Check
Test-Endpoint -Name "Database Health Check" `
    -Method "GET" `
    -Url "$BaseUrl/health/db" `
    -ExpectedStatus 200

# Test 3: Create Employee (camelCase DTO)
if ($AdminToken) {
    $testEmployee = @{
        employeeNumber = "E-STAGING-001"
        firstName = "John"
        lastName = "Doe"
        email = "john.doe.staging@example.com"
        hireDate = "2024-01-01"
        jobTitle = "Security Officer"
        employmentStatus = "active"
    }
    
    Test-Endpoint -Name "Create Employee (camelCase DTO)" `
        -Method "POST" `
        -Url "$BaseUrl/employees" `
        -Body $testEmployee `
        -ExpectedStatus 201 `
        -Validation {
            param($data)
            return $data.employeeNumber -eq "E-STAGING-001" -and
                   $data.firstName -eq "John" -and
                   $data.PSObject.Properties.Name -notcontains "employee_number"
        }
    
    # Test 4: Get Employee (verify camelCase response)
    Test-Endpoint -Name "Get Employee by ID (camelCase response)" `
        -Method "GET" `
        -Url "$BaseUrl/employees/1" `
        -ExpectedStatus 200 `
        -Validation {
            param($data)
            $hasCamelCase = $data.PSObject.Properties.Name -contains "employeeNumber"
            $hasSnakeCase = $data.PSObject.Properties.Name -contains "employee_number"
            return $hasCamelCase -and -not $hasSnakeCase
        }
    
    # Test 5: List Employees with filters
    Test-Endpoint -Name "List Employees with filters" `
        -Method "GET" `
        -Url "$BaseUrl/employees?employmentStatus=active" `
        -ExpectedStatus 200 `
        -Validation {
            param($data)
            return $data -is [array] -and $data.Count -gt 0
        }
    
    # Test 6: Update Employee
    $updateData = @{
        jobTitle = "Senior Security Officer"
    }
    
    Test-Endpoint -Name "Update Employee (partial DTO)" `
        -Method "PATCH" `
        -Url "$BaseUrl/employees/1" `
        -Body $updateData `
        -ExpectedStatus 200 `
        -Validation {
            param($data)
            return $data.jobTitle -eq "Senior Security Officer"
        }
    
    # Test 7: Get Employee Stats
    Test-Endpoint -Name "Get Employee Stats" `
        -Method "GET" `
        -Url "$BaseUrl/employees/stats" `
        -ExpectedStatus 200 `
        -Validation {
            param($data)
            return $data.PSObject.Properties.Name -contains "totalCount"
        }
    
    # Test 8: Test Duplicate Employee Number Error (should be 409 with camelCase field name)
    Test-Endpoint -Name "Duplicate Employee Number Error (409 with camelCase)" `
        -Method "POST" `
        -Url "$BaseUrl/employees" `
        -Body $testEmployee `
        -ExpectedStatus 409
    
    # Test 9: Test Invalid Employee ID Error (should be 404)
    Test-Endpoint -Name "Invalid Employee ID Error (404)" `
        -Method "GET" `
        -Url "$BaseUrl/employees/99999" `
        -ExpectedStatus 404
    
    # Test 10: Delete Employee (soft delete)
    Test-Endpoint -Name "Delete Employee (soft delete)" `
        -Method "DELETE" `
        -Url "$BaseUrl/employees/1" `
        -ExpectedStatus 200
    
} else {
    Write-Host "Skipping authenticated tests (no token provided)" -ForegroundColor Gray
    $testResults.Skipped = 7
}

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
    Write-Host "✗ Some tests failed. Check logs for details." -ForegroundColor Red
    Write-Host "View logs: docker-compose -f docker-compose.staging.yml logs backend-staging" -ForegroundColor Yellow
    exit 1
}
