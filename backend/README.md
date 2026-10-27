# Security Workforce Operations & Payroll Management SaaS

Backend API built with NestJS, Prisma, and PostgreSQL.

## 📚 Table of Contents

- [Features](#features)
- [Field Mapping Architecture](#field-mapping-architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Deployment](#deployment)

---

## ✨ Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Employee Management**: CRUD operations with automatic field mapping
- **Company Management**: Multi-tenant company administration
- **Assignment Tracking**: Employee-role-location assignments with scheduling
- **Payroll Processing**: Salary calculations and payroll management
- **Shift Scheduling**: Work schedule management with conflict detection
- **Audit Logging**: Comprehensive audit trails for compliance

---

## 🔄 Field Mapping Architecture

This system implements **automatic field name translation** between the API layer (camelCase) and database layer (snake_case).

### The Problem We Solved

**Before:** Manual field mapping in 20+ files caused:
- 🐛 Recurring HTTP 400/500 errors
- ⏱️ 30-60 minutes to add a single field
- 💥 Field name mismatches breaking functionality

**After:** Zero manual mapping - just use camelCase everywhere in your code.

### Benefits

- ✅ **< 5 minutes** to add new fields
- ✅ **Zero field name errors**
- ✅ **Type-safe** operations
- ✅ **Consistent** API responses

### Quick Start for Developers

**1. Add a new field to Prisma schema (snake_case):**
employee_number String @db.VarChar(50)

**2. Use it in your DTO (camelCase):**
employeeNumber: string;

**3. That is it! Field mapping is automatic.**

### Architecture Overview

API Layer (camelCase) - Controllers, Services, Repositories
             ↓
      FieldMapper (automatic translation)
             ↓
Database Layer (snake_case) - Prisma Client, PostgreSQL

**Key Components:**

- **FieldMapper**: Bidirectional translation utility
- **BaseRepository**: Abstract repository with automatic mapping
- **PrismaExceptionFilter**: Translates error messages to camelCase

📖 **Full Documentation:** [Field Mapping Guide](./docs/field-mapping-guide.md)  
📖 **Migration Guide:** [docs/migration-guide.md](./docs/migration-guide.md)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
   npm install

2. Set up environment variables:
   cp .env.example .env

3. Run database migrations:
   npx prisma migrate deploy
   npx prisma generate

4. Start the development server:
   npm run start:dev

The API will be available at http://localhost:3000.

---

## 💻 Development

### Project Structure

src/
├── common/                 # Shared utilities and base classes
│   ├── repositories/       # BaseRepository with field mapping
│   ├── filters/            # Exception filters (Prisma, Global)
│   ├── utils/              # FieldMapper utility
│   └── types/              # Shared TypeScript types
├── employees/              # Employee module (✅ Fully migrated)
├── companies/              # Company module
├── assignments/            # Assignment module
├── schedules/              # Schedule module
└── auth/                   # Authentication module

### Adding a New Module

To apply the field mapping pattern to a new module:

1. Create a repository extending BaseRepository
2. Define camelCase DTOs
3. Inject the repository into your service
4. Use repository methods (no Prisma calls in services)

📖 See [Migration Guide](./docs/migration-guide.md) for detailed steps.

### Available Scripts

npm run start:dev      # Development server with hot reload
npm run build          # Build for production
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run test:cov       # Run tests with coverage
npm run lint           # Lint code
npm run format         # Format code with Prettier

---

## 🧪 Testing

### Running Tests

npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report

### Test Coverage

- **FieldMapper**: 42/42 tests passing (100% coverage)
- **BaseRepository**: 33/33 tests passing
- **EmployeeRepository**: 42/42 tests passing (36 unit + 6 integration)
- **PrismaExceptionFilter**: 12/12 tests passing
- **Overall**: 818 tests passing

---

## 📖 Documentation

- **[Field Mapping Guide](./docs/field-mapping-guide.md)** - Complete architecture guide
- **[Migration Guide](./docs/migration-guide.md)** - Apply pattern to other modules
- **[Troubleshooting](./docs/field-mapping-guide.md#troubleshooting)** - Common issues

---

## 🚢 Deployment

### Build for Production

npm run build

### Environment Variables

Required variables:
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret key for JWT tokens
- NODE_ENV: Set to production

### Health Check

curl http://localhost:3000/health

---

## 🤝 Contributing

1. Follow the field mapping pattern (use repositories, not direct Prisma calls)
2. Write unit tests for new features
3. Update documentation when adding new modules
4. Run npm run lint before committing

---

## 📝 License

Proprietary - All rights reserved

---

## 🆘 Support

For issues related to field mapping, see the [Troubleshooting Guide](./docs/field-mapping-guide.md#troubleshooting).

For other issues, contact the development team.
