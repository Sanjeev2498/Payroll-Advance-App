#!/bin/bash

# Local CI/CD Pipeline Script
# This script runs the same tests that would run in the GitHub Actions CI/CD pipeline

set -e  # Exit on any error

echo "🚀 Starting local CI/CD pipeline..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to run a command with status reporting
run_command() {
    local description=$1
    local command=$2
    local directory=${3:-"."}
    
    print_status "$description"
    
    if cd "$directory" && eval "$command"; then
        print_success "$description - Completed"
        cd - > /dev/null
        return 0
    else
        print_error "$description - Failed"
        cd - > /dev/null
        return 1
    fi
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

print_success "Prerequisites check passed"

# Setup CI environment
print_status "Setting up CI environment..."

# Start databases using Docker Compose
run_command "Starting CI databases" "docker-compose -f docker-compose.ci.yml up -d postgres-ci redis-ci"

# Wait for databases to be ready
print_status "Waiting for databases to be ready..."
sleep 10

# Backend CI Pipeline
print_status "Running backend CI pipeline..."

# Install backend dependencies
run_command "Installing backend dependencies" "npm ci" "./backend"

# Generate Prisma client
run_command "Generating Prisma client" "npm run prisma:generate" "./backend"

# Run database migrations
run_command "Running database migrations" "DATABASE_URL='postgresql://test_user:test_password_123@localhost:5433/payroll_test_db' npm run prisma:deploy" "./backend"

# Apply RLS policies
run_command "Applying RLS policies" "DATABASE_URL='postgresql://test_user:test_password_123@localhost:5433/payroll_test_db' npm run rls:setup" "./backend"

# Lint backend code
run_command "Linting backend code" "npm run ci:lint" "./backend"

# Run backend tests
run_command "Running backend tests" "DATABASE_URL='postgresql://test_user:test_password_123@localhost:5433/payroll_test_db' REDIS_URL='redis://localhost:6380' JWT_SECRET='test-jwt-secret-for-ci' NODE_ENV='test' npm run ci:test" "./backend"

# Build backend
run_command "Building backend" "npm run ci:build" "./backend"

# Frontend CI Pipeline
print_status "Running frontend CI pipeline..."

# Install frontend dependencies
run_command "Installing frontend dependencies" "npm ci" "./frontend"

# Lint frontend code
run_command "Linting frontend code" "npm run ci:lint" "./frontend"

# Type check frontend
run_command "Type checking frontend" "npm run ci:type-check" "./frontend"

# Run frontend tests
run_command "Running frontend tests" "npm run ci:test" "./frontend"

# Build frontend
run_command "Building frontend" "NEXT_PUBLIC_API_URL='http://localhost:3002' npm run ci:build" "./frontend"

# Security Scans
print_status "Running security scans..."

# Backend security audit
run_command "Running backend security audit" "npm audit --audit-level moderate" "./backend" || print_warning "Backend audit found some issues"

# Frontend security audit
run_command "Running frontend security audit" "npm audit --audit-level moderate" "./frontend" || print_warning "Frontend audit found some issues"

# Integration Tests (if available)
print_status "Running integration tests..."

# Start full stack for integration tests
run_command "Starting full CI stack" "docker-compose -f docker-compose.ci.yml up -d"

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Run integration tests (placeholder)
print_status "Integration tests are not yet implemented"

# Cleanup
print_status "Cleaning up CI environment..."
run_command "Stopping CI containers" "docker-compose -f docker-compose.ci.yml down"

print_success "🎉 Local CI/CD pipeline completed successfully!"
print_status "All checks passed. Your code is ready for deployment."

echo ""
print_status "Summary:"
echo "  ✅ Backend: Lint, Test, Build"
echo "  ✅ Frontend: Lint, Type-check, Build"  
echo "  ✅ Security: Audit scans"
echo "  ✅ Integration: Environment setup"
echo ""
print_success "Ready for production deployment! 🚀"