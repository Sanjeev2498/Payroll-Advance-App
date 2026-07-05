# Load environment variables from .env file and run Prisma commands
param(
    [Parameter(Mandatory=$true)]
    [string[]]$Command
)

# Load .env file
Get-Content .env | ForEach-Object { 
    if($_ -match '^([^#][^=]+)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') 
    } 
}

# Execute the prisma command with all arguments
$commandString = $Command -join " "
$fullCommand = "npx prisma $commandString"
Write-Host "Executing: $fullCommand" -ForegroundColor Green
Invoke-Expression $fullCommand