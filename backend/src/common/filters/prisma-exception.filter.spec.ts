import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaExceptionFilter],
    }).compile();

    filter = module.get<PrismaExceptionFilter>(PrismaExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/v1/employees',
      method: 'POST',
      headers: {
        'x-request-id': 'test-request-123',
      },
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('P2002 - Unique Constraint Violation', () => {
    it('should handle unique constraint violation with 409 status', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['employee_number'] },
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'CONFLICT',
            message: expect.stringContaining('employeeNumber'),
            field: 'employeeNumber',
          }),
        })
      );
    });
  });

  describe('P2025 - Record Not Found', () => {
    it('should handle record not found with 404 status', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
          }),
        })
      );
    });
  });

  describe('P2003 - Foreign Key Constraint', () => {
    it('should handle foreign key violation with 400 status', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'company_id' },
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_REFERENCE',
            message: expect.stringContaining('companyId'),
            field: 'companyId',
          }),
        })
      );
    });
  });

  describe('P2021 - Table Does Not Exist', () => {
    it('should handle table not exist with 500 status', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Table does not exist',
        {
          code: 'P2021',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DATABASE_SCHEMA_ERROR',
          }),
        })
      );
    });
  });

  describe('P2022 - Column Does Not Exist', () => {
    it('should handle column not exist with 500 status and camelCase field name', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Column does not exist',
        {
          code: 'P2022',
          clientVersion: '5.0.0',
          meta: { column: 'employee_number' },
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DATABASE_SCHEMA_ERROR',
            message: expect.stringContaining('employeeNumber'),
            field: 'employeeNumber',
          }),
        })
      );
    });
  });

  describe('PrismaClientValidationError', () => {
    it('should handle validation errors with 400 status', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Invalid argument: data is missing',
        { clientVersion: '5.0.0' }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should include traceId in error response', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Test error',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            traceId: expect.any(String),
          }),
        })
      );
    });

    it('should include metadata with timestamp and requestId', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Test error',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-123',
            version: 'v1',
          }),
        })
      );
    });

    it('should use "unknown" for requestId when header is missing', () => {
      mockRequest.headers = {}; // No x-request-id header

      const error = new Prisma.PrismaClientKnownRequestError(
        'Test error',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requestId: 'unknown',
          }),
        })
      );
    });
  });

  describe('Field Name Conversion', () => {
    it('should convert snake_case field names to camelCase', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['first_name'] },
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('firstName'),
            field: 'firstName',
          }),
        })
      );
    });

    it('should handle complex snake_case field names', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'employment_status_type' },
        }
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            field: 'employmentStatusType',
          }),
        })
      );
    });
  });
});
