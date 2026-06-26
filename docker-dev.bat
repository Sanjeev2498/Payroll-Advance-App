@echo off
REM Docker Development Environment Management Script for Windows
REM Provides easy commands to manage the development environment

setlocal enabledelayedexpansion

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    exit /b 1
)

REM Parse command
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

if "%COMMAND%"=="start" goto start
if "%COMMAND%"=="stop" goto stop
if "%COMMAND%"=="restart" goto restart
if "%COMMAND%"=="status" goto status
if "%COMMAND%"=="logs" goto logs
if "%COMMAND%"=="clean" goto clean
if "%COMMAND%"=="reset-db" goto reset_db
if "%COMMAND%"=="db-shell" goto db_shell
if "%COMMAND%"=="redis-shell" goto redis_shell
if "%COMMAND%"=="help" goto help

echo [ERROR] Unknown command: %COMMAND%
goto help

:start
echo [INFO] Starting PayrollSystem development environment...

REM Create .env.development if it doesn't exist
if not exist ".env.development" (
    echo [INFO] Creating .env.development from template...
    copy ".env.example" ".env.development" >nul
    echo [WARNING] Please review and update .env.development with your settings
)

REM Start services
docker-compose up -d

echo [INFO] Waiting for services to be ready...

REM Wait for PostgreSQL
:wait_postgres
docker-compose exec postgres pg_isready -U payroll_user -d payroll_system_dev >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Waiting for PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)

REM Wait for Redis
:wait_redis
docker-compose exec redis redis-cli -a redis_pass_dev_123 ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Waiting for Redis...
    timeout /t 2 /nobreak >nul
    goto wait_redis
)

echo [SUCCESS] Development environment is ready!
echo [INFO] Services:
echo [INFO]   - PostgreSQL: localhost:5432
echo [INFO]   - Redis: localhost:6379
echo [INFO]   - PgAdmin: http://localhost:8080 (admin@payroll.dev / admin123)
echo [INFO]   - Redis Commander: http://localhost:8081 (admin / admin123)
goto end

:stop
echo [INFO] Stopping PayrollSystem development environment...
docker-compose down
echo [SUCCESS] Development environment stopped
goto end

:restart
echo [INFO] Restarting PayrollSystem development environment...
call :stop
call :start
goto end

:status
echo [INFO] PayrollSystem development environment status:
docker-compose ps
goto end

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:clean
echo [WARNING] This will remove all data volumes. Are you sure? (y/N)
set /p response=
if /i "%response%"=="y" (
    echo [INFO] Cleaning up development environment...
    docker-compose down -v
    docker-compose rm -f
    echo [SUCCESS] Environment cleaned
) else (
    echo [INFO] Cleanup cancelled
)
goto end

:reset_db
echo [WARNING] This will reset the database. All data will be lost. Are you sure? (y/N)
set /p response=
if /i "%response%"=="y" (
    echo [INFO] Resetting database...
    docker-compose exec postgres psql -U payroll_user -d postgres -c "DROP DATABASE IF EXISTS payroll_system_dev;"
    docker-compose exec postgres psql -U payroll_user -d postgres -c "CREATE DATABASE payroll_system_dev;"
    docker-compose restart postgres
    echo [SUCCESS] Database reset complete
) else (
    echo [INFO] Database reset cancelled
)
goto end

:db_shell
echo [INFO] Connecting to PostgreSQL shell...
docker-compose exec postgres psql -U payroll_user -d payroll_system_dev
goto end

:redis_shell
echo [INFO] Connecting to Redis shell...
docker-compose exec redis redis-cli -a redis_pass_dev_123
goto end

:help
echo PayrollSystem Development Environment Manager
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   start       Start the development environment
echo   stop        Stop the development environment
echo   restart     Restart the development environment
echo   status      Show service status
echo   logs [svc]  Show logs (optionally for specific service)
echo   clean       Remove all containers and volumes (destructive)
echo   reset-db    Reset the database (destructive)
echo   db-shell    Connect to PostgreSQL shell
echo   redis-shell Connect to Redis shell
echo   help        Show this help message
echo.
echo Examples:
echo   %0 start              # Start all services
echo   %0 logs postgres      # Show PostgreSQL logs
echo   %0 status             # Show service status

:end
endlocal