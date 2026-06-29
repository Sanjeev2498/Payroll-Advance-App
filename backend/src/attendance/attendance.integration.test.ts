/**
 * Simple integration test to verify core attendance functionality
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Attendance Integration Test', () => {
  let service: AttendanceService;
  let repository: AttendanceRepository;

  const mockTenantId = 'test-tenant-id';
  const mockUserId = 'test-user-id';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: AttendanceRepository,
          useValue: {
            findByEmployeeAndShift: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            getStats: jest.fn().mockResolvedValue({
              totalRecords: 0,
              presentCount: 0,
              absentCount: 0,
              lateCount: 0,
              earlyDepartureCount: 0,
              overtimeCount: 0,
              pendingApprovalCount: 0,
              attendanceRate: 0,
              onTimeRate: 0,
              totalHoursWorked: 0,
              totalOvertimeHours: 0,
              averageDailyAttendance: 0,
            }),
            findMany: jest.fn().mockResolvedValue({
              attendance: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
            }),
            detectAnomalies: jest.fn().mockResolvedValue([]),
            bulkUpdate: jest.fn().mockResolvedValue({ count: 0 }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findFirst: jest.fn(),
            },
            shift: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: () => mockTenantId,
            getUserId: () => mockUserId,
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get<AttendanceRepository>(AttendanceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  it('should have all required methods', () => {
    // Clock operations
    expect(typeof service.clockIn).toBe('function');
    expect(typeof service.clockOut).toBe('function');

    // CRUD operations
    expect(typeof service.create).toBe('function');
    expect(typeof service.findAll).toBe('function');
    expect(typeof service.findOne).toBe('function');
    expect(typeof service.update).toBe('function');

    // Advanced features
    expect(typeof service.detectAnomalies).toBe('function');
    expect(typeof service.getStats).toBe('function');
    expect(typeof service.requestCorrection).toBe('function');
    expect(typeof service.processCorrection).toBe('function');
    expect(typeof service.bulkUpdate).toBe('function');
  });

  it('should handle basic queries', async () => {
    const result = await service.findAll({});
    expect(result).toBeDefined();
    expect(result.attendance).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle stats requests', async () => {
    const stats = await service.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalRecords).toBe('number');
    expect(typeof stats.attendanceRate).toBe('number');
  });

  it('should handle anomaly detection', async () => {
    const anomalies = await service.detectAnomalies({});
    expect(anomalies).toBeDefined();
    expect(Array.isArray(anomalies.anomalies)).toBe(true);
  });
});