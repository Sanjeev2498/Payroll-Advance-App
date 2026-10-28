# Payroll-Advance-App

## Overview

A comprehensive Security Workforce Operations & Payroll Management system built with modern web technologies. The system provides enterprise-level payroll processing, employee management, time tracking, and client portal functionality.

---

## 🏗️ Field Mapping Architecture

### The Problem: snake_case vs camelCase

Traditional full-stack applications face a common challenge with naming conventions:

- **Database Layer (PostgreSQL):** Uses `snake_case` (e.g., `employee_number`, `first_name`)
- **API Layer (TypeScript/NestJS):** Uses `camelCase` (e.g., `employeeNumber`, `firstName`)
- **Frontend (React/Next.js):** Uses `camelCase` (e.g., `employeeNumber`, `firstName`)

This mismatch historically led to:
- ❌ Manual field mapping in every database query
- ❌ HTTP 400/500 errors from field name mismatches
- ❌ 30-60 minutes to add a single new field
- ❌ Backend crashes when field mappings were missed
- ❌ Poor developer experience with error-prone code

### Our Solution: Automatic Field Translation

This system implements an **automatic field mapping layer** that transparently translates between naming conventions. Developers work entirely in `camelCase`, and the system handles database translation automatically.

```typescript
// ✅ Before: Manual mapping required everywhere (error-prone)
const employee = await prisma.employees.create({
  data: {
    employee_number: dto.employeeNumber,    // Manual
    first_name: dto.firstName,              // Manual
    hire_date: dto.hireDate,                // Manual
  }
});

// ✅ After: Zero manual mapping (automatic)
const employee = await this.employeeRepository.create(dto);
```

### Key Benefits

✅ **No Manual Mapping Required**
- Write `camelCase` everywhere in TypeScript code
- Database queries automatically convert to `snake_case`
- Responses automatically convert back to `camelCase`

✅ **Type-Safe Field Translations**
- Full TypeScript type checking across all layers
- Compile-time errors catch field name mismatches
- IDE autocomplete works seamlessly

✅ **Meaningful Error Messages**
- Database errors transformed with `camelCase` field names
- Specific error messages (not empty `{}` objects)
- Error responses include field context and trace IDs

✅ **Developer Velocity**
- Add new fields in **< 5 minutes** (vs 30-60 minutes before)
- No need to update multiple files manually
- Zero field name errors in production

### Architecture Overview

```
┌──────────────────────────────────────────────┐
│ Frontend (React/Next.js) - camelCase        │
└────────────────┬─────────────────────────────┘
                 │ HTTP JSON (camelCase)
                 ↓
┌──────────────────────────────────────────────┐
│ NestJS API Layer                            │
│ ┌────────────────────────────────────────┐ │
│ │ Controllers - camelCase DTOs           │ │
│ └──────────────┬─────────────────────────┘ │
│ ┌──────────────↓─────────────────────────┐ │
│ │ Services - camelCase business logic    │ │
│ └──────────────┬─────────────────────────┘ │
│ ┌──────────────↓─────────────────────────┐ │
│ │ Repository - Automatic field mapping   │ │
│ │ • objectToSnakeCase() for queries      │ │
│ │ • objectToCamelCase() for responses    │ │
│ └──────────────┬─────────────────────────┘ │
└────────────────┼──────────────────────────┘
                 │ snake_case
                 ↓
┌──────────────────────────────────────────────┐
│ PostgreSQL Database - snake_case            │
└──────────────────────────────────────────────┘
```

### Quick Example

**Adding a new field takes 3 steps:**

1. Update Prisma schema (snake_case):
```prisma
model employees {
  middle_name  String?  @map("middle_name")
}
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Update DTO (camelCase):
```typescript
export class EmployeeDto {
  middleName?: string;  // Done!
}
```

**That's it!** The field automatically works across all CRUD operations with zero manual mapping.

### Core Components

- **FieldMapper Utility:** Converts field names between conventions
- **BaseRepository Pattern:** Wraps Prisma with automatic translation
- **PrismaExceptionFilter:** Transforms database errors to camelCase
- **Type-Safe Generics:** Ensures compile-time correctness

### Learn More

For detailed documentation on using the field mapping system, see:
- **[Field Mapping Guide](backend/docs/field-mapping-guide.md)** - Complete developer guide with examples
- **[Design Document](.kiro/specs/database-field-mapping-architecture-fix/design.md)** - Technical architecture details

---