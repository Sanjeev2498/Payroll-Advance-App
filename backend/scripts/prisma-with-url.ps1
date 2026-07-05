# Prisma commands with explicit URL for commands that support it
param(
    [Parameter(Mandatory=$true)]
    [string]$Command,
    [string[]]$Args = @()
)

# Load .env file
Get-Content .env | ForEach-Object { 
    if($_ -match '^([^#][^=]+)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') 
    } 
}

$url = $env:DATABASE_URL
if (-not $url) {
    Write-Error "DATABASE_URL not found in environment variables"
    exit 1
}

# Commands that support --url flag
$urlSupportedCommands = @("db", "studio")
$argsString = $Args -join " "

if ($Command -in $urlSupportedCommands) {
    $fullCommand = "npx prisma $Command $argsString --url=`"$url`""
} else {
    # For other commands, just set environment and hope for the best
    $fullCommand = "npx prisma $Command $argsString"
}

Write-Host "Executing: $fullCommand" -ForegroundColor Green
Invoke-Expression $fullCommand