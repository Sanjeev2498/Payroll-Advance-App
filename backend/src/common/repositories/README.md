# BaseRepository Pattern

This directory contains the base repository implementation that provides automatic field name translation between camelCase (API/DTO layer) and snake_case (database/Prisma layer).

## Overview

The `BaseRepository` is an abstract class that wraps Prisma operations with automatic field name translation, eliminating the need for manual field mapping throughout the codebase.

## Features

- **Automatic Field Translation**: All Prisma queries and responses are automatically translated between snake_case and camelCase
- **Type-Safe CRUD Operations**: Generic types ensure compile-time type safety
- **Lifecycle Hooks**: Extensible hooks for custom business logic (beforeCreate, afterCreate, beforeUpdate, etc.)
- **Soft Delete Support**: Built-in support for soft deletes via `deleted_at` field
- **Error Handling**: Comprehensive error transformation with meaningful messages
- **Performance Optimized**: Caching and optimized field mapping

## Usage

### Creating a Repository

```typescript
import { BaseRepository } from '../common/repositories';
import { PrismaService } from '../prisma/prisma.service';

export class EmployeeRepository extends BaseRepository<
  employees,              // Prisma model type (snake_case)
  EmployeeDto,           // API DTO type (camelCase)
  CreateEmployeeDto,     // Create DTO type
  UpdateEmployeeDto      // Update DTO type
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'employees', {
      softDelete: true,  // Enable soft delete support
      loggerName: 'EmployeeRepository',
    });
  }

  // Add domain-specific methods
  async findByEmployeeNumber(employeeNumber: string): Promise<EmployeeDto | null> {
    return this.findOne({ employeeNumber });
  }

  // Override lifecycle hooks
  protected async beforeCreate(data: CreateEmployeeDto): Promise<CreateEmployeeDto> {
    // Validate or transform data before creation
    return data;
  }

  protected async afterCreate(result: EmployeeDto): Promise<EmployeeDto> {
    // Perform actions after creation (e.g., send notification)
    return result;
  }
}
```

### Using the Repository in a Service

```typescript
@Injectable()
export class EmployeesService {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async findAll(queryDto: EmployeeQueryDto): Promise<EmployeeDto[]> {
    // Use camelCase everywhere - automatic translation to snake_case
    return this.employeeRepository.findMany(
      {
        companyId: tenantId,
        employmentStatus: queryDto.employmentStatus,
      },
      {
        skip: queryDto.skip,
        take: queryDto.limit,
        orderBy: { hireDate: 'desc' },
      },
    );
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDto> {
    // Automatic field translation
    return this.employeeRepository.create(dto);
  }
}
```

## Available Methods

### Query Methods

- `findOne(where, include?)` - Find a single record
- `findMany(where?, options?)` - Find multiple records with pagination
- `findById(id, include?)` - Find record by ID
- `count(where?)` - Count records matching criteria
- `exists(where)` - Check if record exists

### Mutation Methods

- `create(data)` - Create a new record
- `update(id, data)` - Update an existing record
- `delete(id)` - Delete a record (soft delete if enabled)

### Lifecycle Hooks

Override these protected methods in your repository class:

- `beforeCreate(data)` - Called before creating a record
- `afterCreate(result)` - Called after creating a record
- `beforeUpdate(id, data)` - Called before updating a record
- `afterUpdate(result)` - Called after updating a record
- `beforeDelete(id)` - Called before deleting a record
- `afterDelete(result)` - Called after deleting a record
- `afterFind(result)` - Called after finding record(s)

### Transformation Methods

- `transformToDto(model)` - Transform Prisma model to DTO (override for custom logic)
- `transformFromDto(dto)` - Transform DTO to Prisma model (override for custom logic)

## Error Handling

The repository automatically handles and transforms Prisma errors:

- **P2002**: Unique constraint violation
- **P2025**: Record not found
- **P2003**: Foreign key constraint violation
- **P2014**: Required relation violation
- **P2021**: Table does not exist
- **P2022**: Column does not exist

All errors include meaningful messages with the field name in camelCase for API consumers.

## Testing

Comprehensive unit tests are provided in `base.repository.spec.ts` covering:

- ✅ CRUD operations with field translation
- ✅ Lifecycle hook execution
- ✅ Error handling for all Prisma error codes
- ✅ Soft delete filtering
- ✅ Pagination and sorting
- ✅ Type safety

Run tests with:
```bash
npm test -- base.repository.spec.ts
```

## Benefits

### Before (Manual Mapping)

```typescript
// ❌ Manual field mapping required everywhere
async findAll(queryDto: EmployeeQueryDto) {
  const where: any = {
    company_id: tenantId,  // Manual snake_case
    employee_number: queryDto.employeeNumber,  // Manual mapping
  };
  
  const employees = await this.prisma.employees.findMany({ where });
  
  // ❌ Manual transformation back to camelCase
  return employees.map(emp => ({
    employeeNumber: emp.employee_number,
    firstName: emp.first_name,
    // ... more manual mapping
  }));
}
```

### After (Automatic Mapping)

```typescript
// ✅ Automatic field translation
async findAll(queryDto: EmployeeQueryDto) {
  return await this.employeeRepository.findMany({
    companyId: tenantId,  // ✅ camelCase everywhere
    employeeNumber: queryDto.employeeNumber,  // ✅ Type-safe
  });  // ✅ Returns properly typed EmployeeDto[]
}
```

## Architecture

```
┌─────────────────────────────────────┐
│ Service Layer (camelCase)           │
│ - Uses camelCase DTOs               │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ BaseRepository                      │
│ - Automatic field translation       │
│ - Lifecycle hooks                   │
│ - Error handling                    │
└────────────┬────────────────────────┘
             │ snake_case
             ↓
┌─────────────────────────────────────┐
│ Prisma / Database (snake_case)      │
│ - PostgreSQL with snake_case cols   │
└─────────────────────────────────────┘
```

## Related Files

- `base.repository.ts` - Base repository implementation
- `base.repository.spec.ts` - Comprehensive unit tests
- `../utils/field-mapper.util.ts` - Field name translation utility
- `../types/field-mapping.types.ts` - TypeScript type definitions

## Next Steps

To use this pattern in other modules:

1. Create a repository class extending `BaseRepository`
2. Define the four generic types (Model, DTO, CreateDTO, UpdateDTO)
3. Inject the repository into your service
4. Replace manual Prisma queries with repository methods
5. Remove manual field mapping code

See the design document for complete migration guide.
