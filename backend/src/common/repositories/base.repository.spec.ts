import { Test, TestingModule } from '@nestjs/testing';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../../prisma/prisma.service';

// Mock DTO types for testing
interface TestDto {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  hireDate: Date;
  companyId: string;
  deletedAt?: Date | null;
}

interface CreateTestDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  hireDate: Date;
  companyId: string;
}

interface UpdateTestDto {
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
}

// Mock Prisma model type (snake_case)
interface TestModel {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  hire_date: Date;
  company_id: string;
  deleted_at?: Date | null;
}

// Concrete implementation for testing
class TestRepository extends BaseRepository<
  TestModel,
  TestDto,
  CreateTestDto,
  UpdateTestDto
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'testModel', { softDelete: true });
  }

  // Expose hooks for testing
  public async callBeforeCreate(data: CreateTestDto): Promise<CreateTestDto> {
    return this.beforeCreate ? this.beforeCreate(data) : data;
  }

  public async callAfterCreate(result: TestDto): Promise<TestDto> {
    return this.afterCreate ? this.afterCreate(result) : result;
  }

  public async callBeforeUpdate(
    id: string,
    data: UpdateTestDto,
  ): Promise<UpdateTestDto> {
    return this.beforeUpdate ? this.beforeUpdate(id, data) : data;
  }

  public async callAfterUpdate(result: TestDto): Promise<TestDto> {
    return this.afterUpdate ? this.afterUpdate(result) : result;
  }

  public async callBeforeDelete(id: string): Promise<void> {
    if (this.beforeDelete) {
      await this.beforeDelete(id);
    }
  }

  public async callAfterDelete(result: TestDto): Promise<TestDto> {
    return this.afterDelete ? this.afterDelete(result) : result;
  }

  public async callAfterFind(result: TestDto): Promise<TestDto> {
    return this.afterFind ? this.afterFind(result) : result;
  }

  // Override hooks for testing
  protected async beforeCreate(data: CreateTestDto): Promise<CreateTestDto> {
    return { ...data, firstName: data.firstName.toUpperCase() };
  }

  protected async afterCreate(result: TestDto): Promise<TestDto> {
    return { ...result, lastName: result.lastName.toUpperCase() };
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateTestDto,
  ): Promise<UpdateTestDto> {
    if (data.firstName) {
      return { ...data, firstName: data.firstName.toUpperCase() };
    }
    return data;
  }

  protected async afterUpdate(result: TestDto): Promise<TestDto> {
    return { ...result, lastName: result.lastName.toUpperCase() };
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Validation logic
    if (id === 'protected-id') {
      throw new Error('Cannot delete protected record');
    }
  }

  protected async afterDelete(result: TestDto): Promise<TestDto> {
    return { ...result, lastName: 'DELETED' };
  }

  protected async afterFind(result: TestDto): Promise<TestDto> {
    return { ...result, firstName: result.firstName.trim() };
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let prismaService: PrismaService;
  let mockPrismaModel: any;

  beforeEach(async () => {
    // Create mock Prisma model
    mockPrismaModel = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    // Create mock PrismaService
    const mockPrismaService = {
      testModel: mockPrismaModel,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    repository = new TestRepository(prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should find a single record with camelCase WHERE clause', async () => {
      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.findFirst.mockResolvedValue(mockResult);

      const result = await repository.findOne({
        employeeNumber: 'E001',
      });

      // Verify Prisma was called with snake_case
      expect(mockPrismaModel.findFirst).toHaveBeenCalledWith({
        where: {
          employee_number: 'E001',
          deleted_at: null, // Soft delete filter applied
        },
        include: undefined,
      });

      // Verify result is in camelCase
      expect(result).toEqual({
        id: '123',
        employeeNumber: 'E001',
        firstName: 'John', // Trimmed by afterFind hook
        lastName: 'Doe',
        hireDate: mockResult.hire_date,
        companyId: 'company-123',
        deletedAt: null,
      });
    });

    it('should return null when record not found', async () => {
      mockPrismaModel.findFirst.mockResolvedValue(null);

      const result = await repository.findOne({ employeeNumber: 'E999' });

      expect(result).toBeNull();
    });

    it('should handle complex WHERE clauses with nested operators', async () => {
      mockPrismaModel.findFirst.mockResolvedValue(null);

      await repository.findOne({
        firstName: 'John',
        companyId: 'company-123',
      } as any);

      expect(mockPrismaModel.findFirst).toHaveBeenCalledWith({
        where: {
          first_name: 'John',
          company_id: 'company-123',
          deleted_at: null,
        },
        include: undefined,
      });
    });

    it('should include relations when specified', async () => {
      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.findFirst.mockResolvedValue(mockResult);

      await repository.findOne(
        { employeeNumber: 'E001' },
        { company: true, assignments: true },
      );

      expect(mockPrismaModel.findFirst).toHaveBeenCalledWith({
        where: {
          employee_number: 'E001',
          deleted_at: null,
        },
        include: { company: true, assignments: true },
      });
    });
  });

  describe('findMany', () => {
    it('should find multiple records with pagination', async () => {
      const mockResults: TestModel[] = [
        {
          id: '1',
          employee_number: 'E001',
          first_name: 'John',
          last_name: 'Doe',
          hire_date: new Date('2024-01-01'),
          company_id: 'company-123',
          deleted_at: null,
        },
        {
          id: '2',
          employee_number: 'E002',
          first_name: 'Jane',
          last_name: 'Smith',
          hire_date: new Date('2024-01-02'),
          company_id: 'company-123',
          deleted_at: null,
        },
      ];

      mockPrismaModel.findMany.mockResolvedValue(mockResults);

      const results = await repository.findMany(
        { companyId: 'company-123' },
        {
          skip: 0,
          take: 10,
          orderBy: { hireDate: 'desc' },
        },
      );

      // Verify Prisma was called with snake_case
      expect(mockPrismaModel.findMany).toHaveBeenCalledWith({
        where: {
          company_id: 'company-123',
          deleted_at: null,
        },
        skip: 0,
        take: 10,
        orderBy: { hire_date: 'desc' },
        include: undefined,
      });

      // Verify results are in camelCase
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should handle empty results', async () => {
      mockPrismaModel.findMany.mockResolvedValue([]);

      const results = await repository.findMany({ companyId: 'company-999' });

      expect(results).toEqual([]);
    });

    it('should work without WHERE clause', async () => {
      mockPrismaModel.findMany.mockResolvedValue([]);

      await repository.findMany();

      expect(mockPrismaModel.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: undefined,
        take: undefined,
        orderBy: undefined,
        include: undefined,
      });
    });
  });

  describe('create', () => {
    it('should create a record with automatic field translation', async () => {
      const createDto: CreateTestDto = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        hireDate: new Date('2024-01-01'),
        companyId: 'company-123',
      };

      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'JOHN', // Uppercase by beforeCreate hook
        last_name: 'Doe',
        hire_date: createDto.hireDate,
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.create.mockResolvedValue(mockResult);

      const result = await repository.create(createDto);

      // Verify Prisma was called with snake_case
      expect(mockPrismaModel.create).toHaveBeenCalledWith({
        data: {
          employee_number: 'E001',
          first_name: 'JOHN', // Uppercase by beforeCreate hook
          last_name: 'Doe',
          hire_date: createDto.hireDate,
          company_id: 'company-123',
        },
      });

      // Verify result is in camelCase with hooks applied
      expect(result).toMatchObject({
        employeeNumber: 'E001',
        firstName: 'JOHN',
        lastName: 'DOE', // Uppercase by afterCreate hook
      });
    });

    it('should call beforeCreate hook', async () => {
      const createDto: CreateTestDto = {
        employeeNumber: 'E001',
        firstName: 'john',
        lastName: 'Doe',
        hireDate: new Date('2024-01-01'),
        companyId: 'company-123',
      };

      mockPrismaModel.create.mockResolvedValue({
        id: '123',
        employee_number: 'E001',
        first_name: 'JOHN',
        last_name: 'Doe',
        hire_date: createDto.hireDate,
        company_id: 'company-123',
        deleted_at: null,
      });

      await repository.create(createDto);

      // Verify firstName was uppercased by beforeCreate hook
      expect(mockPrismaModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          first_name: 'JOHN',
        }),
      });
    });
  });

  describe('update', () => {
    it('should update a record with automatic field translation', async () => {
      const updateDto: UpdateTestDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'JANE', // Uppercase by beforeUpdate hook
        last_name: 'Smith',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.update.mockResolvedValue(mockResult);

      const result = await repository.update('123', updateDto);

      // Verify Prisma was called with snake_case
      expect(mockPrismaModel.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          first_name: 'JANE', // Uppercase by beforeUpdate hook
          last_name: 'Smith',
        },
      });

      // Verify result is in camelCase with hooks applied
      expect(result).toMatchObject({
        firstName: 'JANE',
        lastName: 'SMITH', // Uppercase by afterUpdate hook
      });
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateTestDto = {
        firstName: 'Jane',
      };

      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'JANE',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.update.mockResolvedValue(mockResult);

      await repository.update('123', updateDto);

      expect(mockPrismaModel.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          first_name: 'JANE',
        },
      });
    });
  });

  describe('delete', () => {
    it('should soft delete a record when softDelete is enabled', async () => {
      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: new Date('2024-01-15'),
      };

      mockPrismaModel.update.mockResolvedValue(mockResult);

      const result = await repository.delete('123');

      // Verify soft delete (update with deleted_at)
      expect(mockPrismaModel.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { deleted_at: expect.any(Date) },
      });

      expect(mockPrismaModel.delete).not.toHaveBeenCalled();

      // Verify afterDelete hook was called
      expect(result.lastName).toBe('DELETED');
    });

    it('should call beforeDelete hook', async () => {
      mockPrismaModel.update.mockResolvedValue({
        id: 'protected-id',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: new Date(),
      });

      // beforeDelete hook throws error for protected-id
      await expect(repository.delete('protected-id')).rejects.toThrow(
        'Cannot delete protected record',
      );

      expect(mockPrismaModel.update).not.toHaveBeenCalled();
    });

    it('should hard delete when softDelete is disabled', async () => {
      // Create repository without soft delete
      const hardDeleteRepo = new (class extends BaseRepository<
        TestModel,
        TestDto,
        CreateTestDto,
        UpdateTestDto
      > {
        constructor(prisma: PrismaService) {
          super(prisma, 'testModel', { softDelete: false });
        }
      })(prismaService);

      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.delete.mockResolvedValue(mockResult);

      await hardDeleteRepo.delete('123');

      // Verify hard delete
      expect(mockPrismaModel.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });

      expect(mockPrismaModel.update).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should count records with WHERE clause', async () => {
      mockPrismaModel.count.mockResolvedValue(5);

      const result = await repository.count({ companyId: 'company-123' });

      expect(mockPrismaModel.count).toHaveBeenCalledWith({
        where: {
          company_id: 'company-123',
          deleted_at: null,
        },
      });

      expect(result).toBe(5);
    });

    it('should count all records when no WHERE clause', async () => {
      mockPrismaModel.count.mockResolvedValue(10);

      const result = await repository.count();

      expect(mockPrismaModel.count).toHaveBeenCalledWith({
        where: { deleted_at: null },
      });

      expect(result).toBe(10);
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      mockPrismaModel.count.mockResolvedValue(1);

      const result = await repository.exists({ employeeNumber: 'E001' });

      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockPrismaModel.count.mockResolvedValue(0);

      const result = await repository.exists({ employeeNumber: 'E999' });

      expect(result).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find a record by ID', async () => {
      const mockResult: TestModel = {
        id: '123',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      };

      mockPrismaModel.findFirst.mockResolvedValue(mockResult);

      const result = await repository.findById('123');

      expect(mockPrismaModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: '123',
          deleted_at: null,
        },
        include: undefined,
      });

      expect(result).toMatchObject({
        id: '123',
        employeeNumber: 'E001',
      });
    });

    it('should return null when ID not found', async () => {
      mockPrismaModel.findFirst.mockResolvedValue(null);

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle P2002 (unique constraint violation)', async () => {
      const error: any = new Error('Unique constraint failed');
      error.code = 'P2002';
      error.meta = { target: ['employee_number'] };

      mockPrismaModel.create.mockRejectedValue(error);

      await expect(
        repository.create({
          employeeNumber: 'E001',
          firstName: 'John',
          lastName: 'Doe',
          hireDate: new Date(),
          companyId: 'company-123',
        }),
      ).rejects.toThrow('A record with this employeeNumber already exists');
    });

    it('should handle P2025 (record not found)', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025';
      error.meta = {};

      mockPrismaModel.update.mockRejectedValue(error);

      await expect(
        repository.update('999', { firstName: 'Jane' }),
      ).rejects.toThrow('Record not found in testModel');
    });

    it('should handle P2003 (foreign key constraint violation)', async () => {
      const error: any = new Error('Foreign key constraint failed');
      error.code = 'P2003';
      error.meta = { field_name: 'company_id' };

      mockPrismaModel.create.mockRejectedValue(error);

      await expect(
        repository.create({
          employeeNumber: 'E001',
          firstName: 'John',
          lastName: 'Doe',
          hireDate: new Date(),
          companyId: 'invalid-company',
        }),
      ).rejects.toThrow('Invalid companyId: the referenced record does not exist');
    });

    it('should handle P2021 (table does not exist)', async () => {
      const error: any = new Error('Table not found');
      error.code = 'P2021';
      error.meta = {};

      mockPrismaModel.findMany.mockRejectedValue(error);

      await expect(repository.findMany()).rejects.toThrow(
        'Database table for testModel does not exist',
      );
    });

    it('should handle P2022 (column does not exist)', async () => {
      const error: any = new Error('Column not found');
      error.code = 'P2022';
      error.meta = { column: 'invalid_field' };

      mockPrismaModel.findMany.mockRejectedValue(error);

      await expect(repository.findMany()).rejects.toThrow(
        "Field 'invalidField' does not exist in testModel",
      );
    });

    it('should handle validation errors', async () => {
      const error: any = new Error(
        'Validation error: Argument data is missing',
      );

      // Mock Prisma to reject before hook is called
      mockPrismaModel.create.mockRejectedValue(error);

      // Create a minimal valid DTO that won't fail in beforeCreate
      await expect(
        repository.create({
          employeeNumber: 'E001',
          firstName: 'Test',
          lastName: 'User',
          hireDate: new Date(),
          companyId: 'company-123',
        }),
      ).rejects.toThrow('Validation error');
    });

    it('should re-throw unknown errors', async () => {
      const error = new Error('Unknown database error');

      mockPrismaModel.findMany.mockRejectedValue(error);

      await expect(repository.findMany()).rejects.toThrow(
        'Unknown database error',
      );
    });
  });

  describe('Soft Delete Filter', () => {
    it('should exclude soft-deleted records in findMany', async () => {
      mockPrismaModel.findMany.mockResolvedValue([]);

      await repository.findMany({ companyId: 'company-123' });

      expect(mockPrismaModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
          }),
        }),
      );
    });

    it('should exclude soft-deleted records in findOne', async () => {
      mockPrismaModel.findFirst.mockResolvedValue(null);

      await repository.findOne({ employeeNumber: 'E001' });

      expect(mockPrismaModel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
          }),
        }),
      );
    });

    it('should exclude soft-deleted records in count', async () => {
      mockPrismaModel.count.mockResolvedValue(0);

      await repository.count({ companyId: 'company-123' });

      expect(mockPrismaModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
          }),
        }),
      );
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call all create lifecycle hooks in order', async () => {
      const createDto: CreateTestDto = {
        employeeNumber: 'E001',
        firstName: 'john',
        lastName: 'doe',
        hireDate: new Date('2024-01-01'),
        companyId: 'company-123',
      };

      mockPrismaModel.create.mockResolvedValue({
        id: '123',
        employee_number: 'E001',
        first_name: 'JOHN', // Uppercased by beforeCreate
        last_name: 'doe',
        hire_date: createDto.hireDate,
        company_id: 'company-123',
        deleted_at: null,
      });

      const result = await repository.create(createDto);

      // Verify hooks were applied
      expect(result.firstName).toBe('JOHN'); // beforeCreate
      expect(result.lastName).toBe('DOE'); // afterCreate
    });

    it('should call all update lifecycle hooks in order', async () => {
      const updateDto: UpdateTestDto = {
        firstName: 'jane',
      };

      mockPrismaModel.update.mockResolvedValue({
        id: '123',
        employee_number: 'E001',
        first_name: 'JANE', // Uppercased by beforeUpdate
        last_name: 'doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      });

      const result = await repository.update('123', updateDto);

      // Verify hooks were applied
      expect(result.firstName).toBe('JANE'); // beforeUpdate
      expect(result.lastName).toBe('DOE'); // afterUpdate
    });

    it('should call afterFind hook', async () => {
      mockPrismaModel.findFirst.mockResolvedValue({
        id: '123',
        employee_number: 'E001',
        first_name: '  John  ', // Has whitespace
        last_name: 'Doe',
        hire_date: new Date('2024-01-01'),
        company_id: 'company-123',
        deleted_at: null,
      });

      const result = await repository.findOne({ employeeNumber: 'E001' });

      // Verify afterFind hook trimmed the firstName
      expect(result?.firstName).toBe('John');
    });
  });
});
