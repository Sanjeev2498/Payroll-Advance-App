@echo off
echo =========================================
echo Applying Row-Level Security (RLS) Policies
echo =========================================

set DATABASE_URL=postgresql://payroll_user:payroll_password@localhost:5432/payroll_system_dev

echo Checking database connection...
psql %DATABASE_URL% -c "SELECT version();" >nul 2>&1

if errorlevel 1 (
    echo ERROR: Cannot connect to database
    echo Please ensure PostgreSQL is running and accessible at:
    echo   Host: localhost
    echo   Port: 5432
    echo   Database: payroll_system_dev
    echo   User: payroll_user
    echo.
    echo You can start the database with:
    echo   docker-compose up -d postgres
    echo.
    pause
    exit /b 1
)

echo Database connection successful!
echo.
echo Applying RLS policies...
psql %DATABASE_URL% -f sql/enable-rls-policies.sql

if errorlevel 1 (
    echo.
    echo ERROR: Failed to apply RLS policies
    pause
    exit /b 1
)

echo.
echo =========================================
echo RLS policies applied successfully!
echo =========================================
echo.
echo Next steps:
echo 1. Verify RLS is working: npm run rls:test
echo 2. Start the backend server: npm run start:dev
echo.

pause