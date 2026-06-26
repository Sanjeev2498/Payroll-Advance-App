@echo off
echo =========================================
echo Setting up Row-Level Security (RLS)
echo =========================================

cd /d "%~dp0"

echo Checking if Node.js and npm are available...
node --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install > nul 2>&1

echo Setting up RLS policies...
node scripts\setup-rls.js

if errorlevel 1 (
    echo.
    echo ERROR: RLS setup failed
    pause
    exit /b 1
)

echo.
echo =========================================
echo RLS setup completed successfully!
echo =========================================
echo.
echo You can now run the RLS test with:
echo   npm run test:rls
echo.

pause