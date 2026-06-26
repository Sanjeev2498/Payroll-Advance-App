#!/bin/bash

echo "🚀 Setting up Prisma ORM for Security Workforce & Payroll System"
echo ""

echo "📦 Installing Prisma dependencies..."
npm install prisma @prisma/client --save-dev

echo ""
echo "🧪 Testing database connection..."
npm run db:test

if [ $? -ne 0 ]; then
    echo "❌ Database connection failed. Make sure Docker containers are running:"
    echo "   docker-compose up -d postgres"
    exit 1
fi

echo ""
echo "🏗️ Applying database migrations..."
npm run prisma:deploy

if [ $? -ne 0 ]; then
    echo "❌ Migration failed. Check database connection and try again."
    exit 1
fi

echo ""
echo "🔒 Setting up Row-Level Security policies..."
npm run db:setup

echo ""
echo "⚙️ Generating Prisma client..."
npm run prisma:generate

echo ""
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo ""
echo "✅ Prisma ORM setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  npm run prisma:studio  - Open database browser"
echo "  npm run db:test        - Test database connection"
echo "  npm run start:dev      - Start development server"
echo ""
echo "🎉 You can now start developing with the database!"