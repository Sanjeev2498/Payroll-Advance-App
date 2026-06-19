# Database Setup Guide

This document explains how to set up the PostgreSQL database with Prisma ORM for the Security Workforce & Payroll Management System.

## Prerequisites

1. **Docker & Docker Compose** - For running PostgreSQL and Redis
2. **Node.js & npm** - For running the application and database scripts
3. **Prisma CLI** - Included in devDependencies

## Quick Start

### 1. Start Docker Containers

From the project root directory:

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d postgres redis

# Check container status
docker-compose ps
```

### 2. Install Dependencies

In the backend directory:

```bash
cd backend
npm install
```

### 3. Test Database Connection

```bash
# Test if PostgreSQL is accessible
npm run db:test
```

### 4. Run Database Migrations

```bash
# Apply schema migrations to create tables
npm run prisma:deploy
```

### 5. Setup Row-Level Security

```bash
# Configure multi-tenant RLS policies
npm run db:setup
```

### 6. Generate Prisma Client

```bash
# Generate TypeScript client for database access
npm run prisma:generate
```

### 7. Seed Sample Data (Optional)

```bash
# Add demo company, users, and test data
npm run db:seed
```

## Database Schema Overview

### Core Entities

- **Company** - Multi-tenant root entity
- **User** - System users with role-based access
- **Client** - External organizations hiring workforce
- **Site** - Physical locations where workforce is deployed
- **Employee** - Workers employed by the company
- **Assignment** - Employee-to-Site relationships
- **Shift** - Scheduled work periods
- **Attendance** - Clock-in/out records
- **PayrollRun** - Batch salary processing
- **PayrollItem** - Individual salary components
- **Invoice** - Client billing documents

### Multi-Tenant Architecture

The system uses **Row-Level Security (RLS)** for data isolation:

- Each tenant (Company) has isolated data access
- Database policies automatically filter queries by `company_id`
- Tenant context is set per request using PostgreSQL session variables
- No shared data between tenants without explicit authorization

## Environment Configuration

Create `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev?schema=public"

# Application
NODE_ENV="development"
PORT=3001

# JWT Security
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Cache
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="redis_pass_dev_123"

# Security
BCRYPT_ROUNDS=12
```

## Available Scripts

### Database Management

```bash
# Test database connection and status
npm run db:test

# Set up RLS policies and extensions
npm run db:setup

# Seed sample data for development
npm run db:seed
```

### Prisma Operations

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (development)
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:deploy

# Open Prisma Studio (database browser)
npm run prisma:studio

# Reset database and re-run migrations
npm run prisma:reset
```

## Development Workflow

### Making Schema Changes

1. **Modify** `prisma/schema.prisma`
2. **Create migration**: `npm run prisma:migrate`
3. **Update RLS policies** in `scripts/setup-database.js` if needed
4. **Run setup**: `npm run db:setup`
5. **Regenerate client**: `npm run prisma:generate`

### Adding New Entities

1. Add model to `prisma/schema.prisma`
2. Include proper indexes and relationships
3. Add tenant isolation if needed (`company_id` field)
4. Update RLS policies in setup script
5. Create migration and apply changes

## Troubleshooting

### Connection Issues

```bash
# Check if containers are running
docker-compose ps

# View container logs
docker-compose logs postgres

# Restart containers
docker-compose restart postgres
```

### Migration Problems

```bash
# Reset and start fresh
npm run prisma:reset

# Manual migration status
npx prisma migrate status

# Force reset (⚠️ DESTRUCTIVE)
npx prisma migrate reset --force
```

### RLS Policy Issues

```bash
# Check current policies
npm run db:test

# Re-run setup script
npm run db:setup

# Manual policy inspection (in psql)
\dp+ tablename
```

## Production Considerations

### Security

- Use strong passwords for database users
- Enable SSL connections in production
- Restrict database access to application servers only
- Regular security updates for PostgreSQL

### Performance

- Monitor query performance with `EXPLAIN ANALYZE`
- Consider read replicas for reporting workloads
- Implement connection pooling (PgBouncer)
- Regular `VACUUM` and `ANALYZE` operations

### Backup Strategy

- Automated daily backups
- Point-in-time recovery capability
- Test backup restoration procedures
- Off-site backup storage

## Support

For database-related issues:

1. Check container logs: `docker-compose logs postgres`
2. Test connection: `npm run db:test`
3. Verify migrations: `npx prisma migrate status`
4. Check RLS policies: Review setup script output

For schema questions, refer to the [Design Document](../.kiro/specs/security-workforce-payroll-system/design.md).