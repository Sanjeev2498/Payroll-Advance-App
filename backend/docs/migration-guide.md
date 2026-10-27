# Migration Guide: Applying Field Mapping Pattern to Other Modules

This guide shows you how to migrate existing modules (companies, assignments, schedules, etc.) from manual field mapping to the automatic field mapping architecture.

## 📋 Overview

**Time per module:** ~3-4 hours  
**Difficulty:** Medium  
**Prerequisites:** Understanding of the field mapping architecture

---

## 🎯 Migration Process

### Phase 1: Preparation (30 minutes)

#### 1. Audit Current Module

Review the module you are migrating:

- **Count Prisma calls** in service files
- **List all DTOs** and their fields
- **Identify field mappings** (look for manual snake_case → camelCase conversions)
- **Check tests** that will need updating

Example audit for `companies` module:

npm run test -- companies.service.spec

#### 2. Create Migration Checklist

- [ ] Repository created
- [ ] Repository tests written
- [ ] Service refactored
- [ ] Service tests updated
- [ ] Integration tests added
- [ ] Build passes
- [ ] All tests pass

---

### Phase 2: Create Repository (1-1.5 hours)

#### 1. Create Repository File

Create `src/[module]/repositories/[module].repository.ts`:

export class CompanyRepository extends BaseRepository<
  companies,                    // Prisma model (snake_case)
  CompanyResponseDto,          // Response DTO (camelCase)
  CreateCompanyDto,            // Create DTO (camelCase)
  UpdateCompanyDto             // Update DTO (camelCase)
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'companies');  // Prisma model name
  }

  // Add domain-specific methods
  async findByName(name: string): Promise<CompanyResponseDto | null> {
    return this.findOne({ 
      where: { companyName: name }  // camelCase - auto-translates
    });
  }

  async findActiveCompanies(): Promise<CompanyResponseDto[]> {
    return this.findMany({
      where: { isActive: true },    // camelCase
      orderBy: { createdAt: 'desc' }
    });
  }
}

#### 2. Create Repository Tests

Create `src/[module]/repositories/[module].repository.spec.ts`:

describe('CompanyRepository', () => {
  let repository: CompanyRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService(),
        },
      ],
    }).compile();

    repository = module.get<CompanyRepository>(CompanyRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should create company with field mapping', async () => {
    const dto: CreateCompanyDto = {
      companyName: 'Test Corp',
      contactEmail: 'test@example.com',
    };

    prismaService.companies.create = jest.fn().mockResolvedValue({
      id: 1,
      company_name: 'Test Corp',      // snake_case from DB
      contact_email: 'test@example.com',
    });

    const result = await repository.create(dto);

    expect(result.companyName).toBe('Test Corp');  // camelCase response
    expect(prismaService.companies.create).toHaveBeenCalledWith({
      data: {
        company_name: 'Test Corp',    // Verify snake_case sent to DB
        contact_email: 'test@example.com',
      },
    });
  });
});

#### 3. Create Integration Tests

Create `src/[module]/repositories/[module].repository.integration.spec.ts`:

describe('CompanyRepository Integration', () => {
  let repository: CompanyRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [CompanyRepository],
    }).compile();

    repository = module.get(CompanyRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.companies.deleteMany({});
  });

  it('should create and retrieve company', async () => {
    const dto: CreateCompanyDto = {
      companyName: 'Integration Test Corp',
      contactEmail: 'integration@test.com',
    };

    const created = await repository.create(dto);
    const found = await repository.findOne({ where: { id: created.id } });

    expect(found?.companyName).toBe('Integration Test Corp');
    expect(found?.contactEmail).toBe('integration@test.com');
  });
});

#### 4. Run Repository Tests

npm run test -- company.repository

Ensure all tests pass before proceeding.

---

### Phase 3: Refactor Service (1-1.5 hours)

#### 1. Update Module Providers

In `src/[module]/[module].module.ts`:

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    CompanyRepository,  // Add repository
  ],
  exports: [CompaniesService],
})
export class CompaniesModule {}

#### 2. Inject Repository into Service

In `src/[module]/[module].service.ts`:

export class CompaniesService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    // Remove: private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    // Before (manual mapping):
    // const company = await this.prisma.companies.create({
    //   data: {
    //     company_name: dto.companyName,
    //     contact_email: dto.contactEmail,
    //   },
    // });
    // return {
    //   companyName: company.company_name,
    //   contactEmail: company.contact_email,
    // };

    // After (automatic mapping):
    return this.companyRepository.create(dto);
  }

  async findAll(): Promise<CompanyResponseDto[]> {
    return this.companyRepository.findMany({});
  }

  async findOne(id: number): Promise<CompanyResponseDto> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    await this.findOne(id);  // Verify exists
    return this.companyRepository.update({ where: { id }, data: dto });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);  // Verify exists
    await this.companyRepository.delete({ where: { id } });
  }
}

#### 3. Update Service Tests

In `src/[module]/[module].service.spec.ts`:

describe('CompaniesService', () => {
  let service: CompaniesService;
  let mockRepository: jest.Mocked<CompanyRepository>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: CompanyRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should create company', async () => {
    const dto: CreateCompanyDto = {
      companyName: 'Test Corp',
      contactEmail: 'test@example.com',
    };

    const expected = { id: 1, ...dto };
    mockRepository.create.mockResolvedValue(expected);

    const result = await service.create(dto);

    expect(result).toEqual(expected);
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
  });
});

#### 4. Run Service Tests

npm run test -- companies.service

---

### Phase 4: Verification (30 minutes)

#### 1. Build the Project

npm run build

Fix any TypeScript errors that appear.

#### 2. Run All Tests

npm run test

Ensure all tests pass, including:
- Repository unit tests
- Repository integration tests
- Service unit tests
- Existing E2E tests

#### 3. Manual Testing

Start the development server and test endpoints:

npm run start:dev

Test with curl or Postman:

# Create
curl -X POST http://localhost:3000/companies \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Test Corp", "contactEmail": "test@example.com"}'

# Get all
curl http://localhost:3000/companies

# Get one
curl http://localhost:3000/companies/1

# Update
curl -X PATCH http://localhost:3000/companies/1 \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Updated Corp"}'

# Delete
curl -X DELETE http://localhost:3000/companies/1

Verify:
- ✅ All responses use camelCase
- ✅ No HTTP 400/500 errors
- ✅ Database shows snake_case

---

## 📝 Module-Specific Considerations

### Companies Module

**Special fields:**
- `companyName` → `company_name`
- `taxId` → `tax_id`
- `isActive` → `is_active`

**Domain methods to add:**
findByTaxId(taxId: string)
findActiveCompanies()

### Assignments Module

**Relations to handle:**
- `employeeId` → `employee_id` (foreign key)
- `roleId` → `role_id` (foreign key)
- `locationId` → `location_id` (foreign key)

**Domain methods to add:**
findByEmployee(employeeId: number)
findByRole(roleId: number)
findActiveAssignments()

### Schedules Module

**Date fields:**
- `startTime` → `start_time` (DateTime)
- `endTime` → `end_time` (DateTime)
- `shiftDate` → `shift_date` (Date)

**Domain methods to add:**
findByDateRange(start: Date, end: Date)
findConflictingShifts(employeeId: number, start: Date, end: Date)

---

## 🚨 Common Pitfalls

### 1. Forgetting to Remove Prisma Imports

**Before:**
import { PrismaService } from '../prisma/prisma.service';

**After:**
// Remove PrismaService from service imports
// Only keep it in repository

### 2. Mixing Field Name Conventions

**Wrong:**
await this.repository.findOne({ where: { employee_number: 'E001' } });

**Correct:**
await this.repository.findOne({ where: { employeeNumber: 'E001' } });

### 3. Forgetting to Update Tests

**Common error:**
expect(prismaService.companies.create).toHaveBeenCalled();

**Fix:**
expect(companyRepository.create).toHaveBeenCalled();

### 4. Not Handling Null Responses

**Wrong:**
async findOne(id: number) {
  return this.repository.findOne({ where: { id } });
}

**Correct:**
async findOne(id: number) {
  const result = await this.repository.findOne({ where: { id } });
  if (!result) {
    throw new NotFoundException('Resource not found');
  }
  return result;
}

---

## ✅ Migration Checklist

Use this checklist for each module:

### Pre-Migration
- [ ] Audit current Prisma calls
- [ ] List all DTOs
- [ ] Backup current code
- [ ] Create feature branch

### Implementation
- [ ] Create repository class
- [ ] Add domain-specific methods
- [ ] Write repository unit tests (pass)
- [ ] Write repository integration tests (pass)
- [ ] Update module providers
- [ ] Refactor service to use repository
- [ ] Update service unit tests (pass)

### Verification
- [ ] Build passes (npm run build)
- [ ] All tests pass (npm run test)
- [ ] Manual testing complete
- [ ] Code review complete
- [ ] Documentation updated

### Deployment
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production

---

## 🎓 Best Practices

1. **One module at a time** - Do not migrate multiple modules simultaneously
2. **Test-driven** - Write tests before refactoring
3. **Incremental commits** - Commit after each phase
4. **Keep PRs small** - One module per PR
5. **Document changes** - Update module documentation

---

## 📞 Support

If you encounter issues during migration:

1. Check the [Troubleshooting Guide](./field-mapping-guide.md#troubleshooting)
2. Review the completed `employees` module as reference
3. Contact the development team

---

## 📚 Reference Implementation

See `src/employees/` module for a complete working example:

- `src/employees/repositories/employee.repository.ts`
- `src/employees/repositories/employee.repository.spec.ts`
- `src/employees/repositories/employee.repository.integration.spec.ts`
- `src/employees/employees.service.ts`
- `src/employees/employees.service.spec.ts`
