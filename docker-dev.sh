#!/bin/bash

# Docker Development Environment Management Script
# Provides easy commands to manage the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
}

# Start development environment
start() {
    print_info "Starting PayrollSystem development environment..."
    check_docker
    
    # Create .env.development if it doesn't exist
    if [ ! -f .env.development ]; then
        print_info "Creating .env.development from template..."
        cp .env.example .env.development
        print_warning "Please review and update .env.development with your settings"
    fi
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    until docker-compose exec postgres pg_isready -U payroll_user -d payroll_system_dev > /dev/null 2>&1; do
        print_info "Waiting for PostgreSQL..."
        sleep 2
    done
    
    # Wait for Redis
    until docker-compose exec redis redis-cli -a redis_pass_dev_123 ping > /dev/null 2>&1; do
        print_info "Waiting for Redis..."
        sleep 2
    done
    
    print_success "Development environment is ready!"
    print_info "Services:"
    print_info "  - PostgreSQL: localhost:5432"
    print_info "  - Redis: localhost:6379"
    print_info "  - PgAdmin: http://localhost:8080 (admin@payroll.dev / admin123)"
    print_info "  - Redis Commander: http://localhost:8081 (admin / admin123)"
}

# Stop development environment
stop() {
    print_info "Stopping PayrollSystem development environment..."
    check_docker
    docker-compose down
    print_success "Development environment stopped"
}

# Restart development environment
restart() {
    print_info "Restarting PayrollSystem development environment..."
    stop
    start
}

# Show logs
logs() {
    check_docker
    if [ -n "$1" ]; then
        docker-compose logs -f "$1"
    else
        docker-compose logs -f
    fi
}

# Show status
status() {
    check_docker
    print_info "PayrollSystem development environment status:"
    docker-compose ps
}

# Clean up everything (removes volumes)
clean() {
    print_warning "This will remove all data volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up development environment..."
        check_docker
        docker-compose down -v
        docker-compose rm -f
        print_success "Environment cleaned"
    else
        print_info "Cleanup cancelled"
    fi
}

# Reset database (drops and recreates)
reset_db() {
    print_warning "This will reset the database. All data will be lost. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Resetting database..."
        check_docker
        docker-compose exec postgres psql -U payroll_user -d postgres -c "DROP DATABASE IF EXISTS payroll_system_dev;"
        docker-compose exec postgres psql -U payroll_user -d postgres -c "CREATE DATABASE payroll_system_dev;"
        docker-compose restart postgres
        print_success "Database reset complete"
    else
        print_info "Database reset cancelled"
    fi
}

# Database shell
db_shell() {
    check_docker
    print_info "Connecting to PostgreSQL shell..."
    docker-compose exec postgres psql -U payroll_user -d payroll_system_dev
}

# Redis shell
redis_shell() {
    check_docker
    print_info "Connecting to Redis shell..."
    docker-compose exec redis redis-cli -a redis_pass_dev_123
}

# Show help
help() {
    echo "PayrollSystem Development Environment Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start the development environment"
    echo "  stop        Stop the development environment"
    echo "  restart     Restart the development environment"
    echo "  status      Show service status"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  clean       Remove all containers and volumes (destructive)"
    echo "  reset-db    Reset the database (destructive)"
    echo "  db-shell    Connect to PostgreSQL shell"
    echo "  redis-shell Connect to Redis shell"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start all services"
    echo "  $0 logs postgres      # Show PostgreSQL logs"
    echo "  $0 status             # Show service status"
}

# Main script logic
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    clean)
        clean
        ;;
    reset-db)
        reset_db
        ;;
    db-shell)
        db_shell
        ;;
    redis-shell)
        redis_shell
        ;;
    help)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        help
        exit 1
        ;;
esac