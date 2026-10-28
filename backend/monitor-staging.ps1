# Task 11: Staging Monitoring Script
# Monitors staging environment for errors, performance, and field mapping issues

param(
    [int]$DurationDays = 3,
    [int]$CheckIntervalMinutes = 15,
    [string]$BaseUrl = "http://localhost:3002",
    [string]$LogFile = "staging-monitoring-log.txt"
)

$script:ErrorCount = 0
$script:WarningCount = 0
$script:CheckCount = 0
$StartTime = Get-Date
$EndTime = $StartTime.AddDays($DurationDays)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task 11: Staging Monitoring" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Start Time: $StartTime" -ForegroundColor Green
Write-Host "End Time: $EndTime" -ForegroundColor Green
Write-Host "Duration: $DurationDays days" -ForegroundColor Green
Write-Host "Check Interval: $CheckIntervalMinutes minutes" -ForegroundColor Green
Write-Host "Log File: $LogFile" -ForegroundColor Green
Write-Host ""

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN" { Write-Host $logEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry -ForegroundColor White }
    }
}

function Test-ContainerHealth {
    Write-Log "Checking container health..." "INFO"
    
    $containers = @("payroll-backend-staging", "payroll-postgres-staging", "payroll-redis-staging")
    $allHealthy = $true
    
    foreach ($container in $containers) {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        if ($status -ne "running") {
            Write-Log "Container $container is not running (status: $status)" "ERROR"
            $script:ErrorCount++
            $allHealthy = $false
        } else {
            Write-Log "Container $container is running" "SUCCESS"
        }
    }
    
    return $allHealthy
}

function Test-ApplicationErrors {
    Write-Log "Checking application error logs..." "INFO"
    
    # Check for field mapping errors
    $logs = docker-compose -f docker-compose.staging.yml logs --tail=100 backend-staging 2>&1 | Out-String
    
    # Check for specific error patterns
    $fieldErrors = $logs | Select-String -Pattern "employee_number|first_name|Cannot find" -AllMatches
    if ($fieldErrors.Matches.Count -gt 0) {
        Write-Log "Found $($fieldErrors.Matches.Count) potential field mapping errors" "ERROR"
        $script:ErrorCount++
        return $false
    }
    
    # Check for crashes
    $crashes = $logs | Select-String -Pattern "Error:|ERROR|Exception" -AllMatches
    if ($crashes.Matches.Count -gt 5) {
        Write-Log "Found $($crashes.Matches.Count) errors in logs" "WARN"
        $script:WarningCount++
    }
    
    Write-Log "No critical errors found in application logs" "SUCCESS"
    return $true
}

function Test-DatabaseConnection {
    Write-Log "Testing database connection..." "INFO"
    
    $result = docker exec payroll-postgres-staging pg_isready -U payroll_user 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Database connection: OK" "SUCCESS"
        return $true
    } else {
        Write-Log "Database connection: FAILED" "ERROR"
        $script:ErrorCount++
        return $false
    }
}

function Test-PerformanceMetrics {
    Write-Log "Checking performance metrics..." "INFO"
    
    # Check memory usage
    $memStats = docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" payroll-backend-staging 2>&1
    Write-Log "Backend memory usage: $memStats" "INFO"
    
    # Check CPU usage
    $cpuStats = docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" payroll-backend-staging 2>&1
    Write-Log "Backend CPU usage: $cpuStats" "INFO"
    
    return $true
}

function Get-MonitoringSummary {
    $currentTime = Get-Date
    $elapsed = $currentTime - $StartTime
    $remaining = $EndTime - $currentTime
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Monitoring Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Elapsed Time: $($elapsed.Days) days, $($elapsed.Hours) hours, $($elapsed.Minutes) minutes" -ForegroundColor White
    Write-Host "Remaining Time: $($remaining.Days) days, $($remaining.Hours) hours, $($remaining.Minutes) minutes" -ForegroundColor White
    Write-Host "Total Checks: $script:CheckCount" -ForegroundColor White
    Write-Host "Errors: $script:ErrorCount" -ForegroundColor $(if ($script:ErrorCount -eq 0) { "Green" } else { "Red" })
    Write-Host "Warnings: $script:WarningCount" -ForegroundColor $(if ($script:WarningCount -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
    
    if ($script:ErrorCount -eq 0) {
        Write-Host "✓ Status: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "✗ Status: ISSUES DETECTED" -ForegroundColor Red
    }
}

# Initialize log file
Write-Log "=== Task 11: Staging Monitoring Started ===" "INFO"
Write-Log "Monitoring period: $DurationDays days" "INFO"
Write-Log "Check interval: $CheckIntervalMinutes minutes" "INFO"

# Main monitoring loop
while ((Get-Date) -lt $EndTime) {
    $script:CheckCount++
    Write-Log "=== Check #$script:CheckCount ===" "INFO"
    
    # Run health checks
    $healthOk = Test-ContainerHealth
    $errorsOk = Test-ApplicationErrors
    $dbOk = Test-DatabaseConnection
    $perfOk = Test-PerformanceMetrics
    
    # Display summary
    Get-MonitoringSummary
    
    # Check if we should continue
    $remaining = $EndTime - (Get-Date)
    if ($remaining.TotalMinutes -gt $CheckIntervalMinutes) {
        Write-Host ""
        Write-Host "Next check in $CheckIntervalMinutes minutes..." -ForegroundColor Gray
        Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
        Start-Sleep -Seconds ($CheckIntervalMinutes * 60)
    } else {
        break
    }
}

# Final summary
Write-Log "=== Monitoring Period Complete ===" "INFO"
Get-MonitoringSummary

if ($script:ErrorCount -eq 0) {
    Write-Host ""
    Write-Host "✓ Staging validation PASSED!" -ForegroundColor Green
    Write-Host "Ready to proceed to Task 12 (Production Deployment)" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "✗ Staging validation FAILED" -ForegroundColor Red
    Write-Host "Fix errors before proceeding to production" -ForegroundColor Red
    exit 1
}
