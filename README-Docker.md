# Docker Development Environment

This document describes how to set up and use the Docker development environment for the Security Workforce & Payroll Management System.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- At least 4GB of available RAM
- At least 2GB of free disk space

## Quick Start

### Linux/macOS
```bash
# Make the script executable
chmod +x docker-dev.sh

# Start the development environment
./docker-dev.sh start
```

### Windows
```cmd
# Start the development environment
docker-dev.bat start
```

## Services

The Docker Compose setup includes the following services:

### Core Services

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| PostgreSQL | 5432 | Main database | `payroll_user` / `payroll_pass_dev_123` |
| Redis | 6379 | Cache & sessions | Password: `redis_pass_dev_123` |

### Management Tools

| Service | URL | Purpose | Credentials |
|---------|-----|---------|-------------|
| PgAdmin | http://localhost:8080 | Database management | `admin@payroll.dev` / `admin123` |
| Redis Commander | http://localhost:8081 | Redis management | `admin` / `admin123` |

## Environment Configuration

The environment uses `.env.development` file for configuration. This file is automatically created from `.env.example` when you first start the services.

### Key Configuration Variables

```bash
# Database
DATABASE_URL="postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=redis_pass_dev_123

# Application
NODE_ENV=development
PORT=3000
API_PORT=3001
```

## Database Setup

The PostgreSQL database is automatically configured with:

- **Extensions**: uuid-ossp, pg_trgm, btree_gin, btree_gist, pgcrypto
- **Database**: `payroll_system_dev`
- **User**: `payroll_user` with full privileges
- **Row-Level Security**: Helper function `set_tenant_id()` for multi-tenant support

### Database Schema

The database schema will be managed by Prisma migrations. Once the backend is set up, you can apply migrations:

```bash
# Navigate to backend directory (when created)
cd backend

# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate
```

## Management Commands

### Linux/macOS (`./docker-dev.sh`)

```bash
./docker-dev.sh start         # Start all services
./docker-dev.sh stop          # Stop all services
./docker-dev.sh restart       # Restart all services
./docker-dev.sh status        # Show service status
./docker-dev.sh logs          # Show all logs
./docker-dev.sh logs postgres # Show PostgreSQL logs only
./docker-dev.sh clean         # Remove all containers and volumes (destructive)
./docker-dev.sh reset-db      # Reset database (destructive)
./docker-dev.sh db-shell      # Connect to PostgreSQL shell
./docker-dev.sh redis-shell   # Connect to Redis shell
```

### Windows (`docker-dev.bat`)

```cmd
docker-dev.bat start         # Start all services
docker-dev.bat stop          # Stop all services
docker-dev.bat restart       # Restart all services
docker-dev.bat status        # Show service status
docker-dev.bat logs          # Show all logs
docker-dev.bat logs postgres # Show PostgreSQL logs only
docker-dev.bat clean         # Remove all containers and volumes (destructive)
docker-dev.bat reset-db      # Reset database (destructive)
docker-dev.bat db-shell      # Connect to PostgreSQL shell
docker-dev.bat redis-shell   # Connect to Redis shell
```

## Manual Docker Commands

If you prefer using Docker Compose directly:

```bash
# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Connect to PostgreSQL
docker-compose exec postgres psql -U payroll_user -d payroll_system_dev

# Connect to Redis
docker-compose exec redis redis-cli -a redis_pass_dev_123
```

## Troubleshooting

### Services Won't Start

1. **Check Docker is running**: Ensure Docker Desktop is started and running
2. **Port conflicts**: Make sure ports 5432, 6379, 8080, and 8081 are not in use
3. **Insufficient resources**: Ensure Docker has enough memory allocated (4GB minimum)

```bash
# Check if ports are in use (Linux/macOS)
lsof -i :5432
lsof -i :6379

# Check if ports are in use (Windows)
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

### Database Connection Issues

1. **Check PostgreSQL is ready**:
```bash
docker-compose exec postgres pg_isready -U payroll_user -d payroll_system_dev
```

2. **Check database exists**:
```bash
docker-compose exec postgres psql -U payroll_user -d postgres -c "\l"
```

3. **Recreate database**:
```bash
./docker-dev.sh reset-db  # Linux/macOS
docker-dev.bat reset-db   # Windows
```

### Redis Connection Issues

1. **Check Redis is responding**:
```bash
docker-compose exec redis redis-cli -a redis_pass_dev_123 ping
```

2. **Check Redis memory usage**:
```bash
docker-compose exec redis redis-cli -a redis_pass_dev_123 info memory
```

### Performance Issues

1. **Check resource usage**:
```bash
docker stats
```

2. **Increase Docker Desktop memory allocation**:
   - Go to Docker Desktop Settings
   - Navigate to Resources → Advanced
   - Increase Memory to 6GB or more

### Data Persistence

- **PostgreSQL data**: Stored in Docker volume `postgres_data`
- **Redis data**: Stored in Docker volume `redis_data`
- **PgAdmin settings**: Stored in Docker volume `pgadmin_data`

To completely reset all data:
```bash
./docker-dev.sh clean  # Linux/macOS
docker-dev.bat clean   # Windows
```

## Security Notes

⚠️ **Important**: This configuration is for development only!

- Default passwords are weak and publicly visible
- Services are exposed without authentication
- SSL/TLS is not configured
- Use environment-specific configurations for production

## Integration with Backend

When setting up the backend application:

1. **Environment Variables**: Use the database and Redis URLs from `.env.development`
2. **Prisma Configuration**: Point to `DATABASE_URL` from environment
3. **Redis Client**: Configure with `REDIS_URL` and `REDIS_PASSWORD`
4. **Health Checks**: Verify database and Redis connections on startup

Example backend configuration:
```typescript
// database.config.ts
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  // Additional Prisma options
};

// redis.config.ts  
export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
};
```

## Next Steps

1. **Backend Setup**: Create NestJS backend application (Task 1.1)
2. **Frontend Setup**: Create Next.js frontend application (Task 1.2)  
3. **Database Schema**: Implement Prisma models and migrations (Task 2.1)
4. **Testing**: Set up test database configuration

The Docker environment is now ready to support the full application development workflow.