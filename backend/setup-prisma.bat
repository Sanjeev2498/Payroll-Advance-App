@echo off
echo 🚀 Setting up Prisma ORM for Security Workforce & Payroll System
echo.

echo 📦 Installing Prisma dependencies...
call npm install prisma @prisma/client --save-dev

echo.
echo 🧪 Testing database connection...
call npm run db:test

if %errorlevel% neq 0 (
    echo ❌ Database connection failed. Make sure Docker containers are running:
    echo    docker-compose up -d postgres
    exit /b 1
)

echo.
echo 🏗️ Applying database migrations...
call npm run prisma:deploy

if %errorlevel% neq 0 (
    echo ❌ Migration failed. Check database connection and try again.
    exit /b 1
)

echo.
echo 🔒 Setting up Row-Level Security policies...
call npm run db:setup

echo.
echo ⚙️ Generating Prisma client...
call npm run prisma:generate

echo.
echo 🌱 Seeding database with sample data...
call npm run db:seed

echo.
echo ✅ Prisma ORM setup completed successfully!
echo.
echo 📋 Available commands:
echo   npm run prisma:studio  - Open database browser
echo   npm run db:test        - Test database connection
echo   npm run start:dev      - Start development server
echo.
echo 🎉 You can now start developing with the database!