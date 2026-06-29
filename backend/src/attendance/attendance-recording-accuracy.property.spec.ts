import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import * as fc from 'fast-check';
import { AttendanceStatus, ShiftStatus, AssignmentStatus, EmploymentStatus } from '@prisma/client';

/**
 * **Validates: Requirements 7.1**
 * Property 9: Attendance Recording Accuracy
 * 
 * For any employee clock-in/out event, the system SHALL record complete attendance data
 * including accurate timestamps, location verification, and all required metadata without data corruption.
 */

// Test data generators for property-based testing
const validLatitudeGenerator = () => fc.float({ min: -90, max: 90 });
const validLongitudeGenerator = () => fc.float({ min: -180, max: 180 });
const accuracyGenerator = () => fc.float({ min: 1, max: 100 });

const locationDataGenerator = () => fc.record({
  latitude: validLatitudeGenerator(),
  longitude: validLongitudeGenerator(),
  accuracy: fc.option(accuracyGenerator()),
  address: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  capturedAt: fc.option(fc.date().map(d => d.toISOString())),
  method: fc.option(fc.constantFrom('GPS', 'Network', 'Manual')),
});

const verificationDataGenerator = () => fc.record({
  photo: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
  device: fc.option(fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    model: fc.string({ minLength: 5, maxLength: 30 }),
    os: fc.string({ minLength: 3, maxLength: 20 }),
    appVersion: fc.string({ minLength: 3, maxLength: 10 }),
  })),
  ipAddress: fc.option(fc.ipV4()),
  userAgent: fc.option(fc.string({ minLength: 20, maxLength: 200 })),
  flags: fc.option(fc.record({
    photoVerified: fc.boolean(),
    locationVerified: fc.boolean(),
    biometricVerified: fc.boolean(),
    manualEntry: fc.boolean(),
  })),
});

const clockInDataGenerator = () => fc.record({
  employeeId: fc.uuid(),
  shiftId: fc.uuid(),
  clockInTime: fc.option(fc.date()),
  locationData: locationDataGenerator(),
  verificationData: fc.option(verificationDataGenerator()),
  notes: fc.option(fc.string({ maxLength: 500 })),
});

const clockOutDataGenerator = () => fc.record({
  employeeId: fc.uuid(),
  shiftId: fc.uuid(),
  clockOutTime: fc.option(fc.date()),
  locationData: locationDataGenerator(),
  verificationData: fc.option(verificationDataGenerator()),
  notes: fc.option(fc.string({ maxLength: 500 })),
});

describe('AttendanceService Property Tests - Recording Accuracy', () => {
  let service: AttendanceService;
  let attendanceRepository: AttendanceRepository;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let module: TestingModule;

  const mockTenantId = 'test-tenant-id';
  const mockUserId = 'test-user-id';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: AttendanceRepository,
          useValue: createMockAttendanceRepository(),
        },
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
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
    attendanceRepository = module.get<AttendanceRepository>(AttendanceRepository);
    prisma = module.get<PrismaService>(PrismaService);
    tenantContext = module.get<TenantContextService>(TenantContextService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock behavior for repository methods
    (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValue(null);
    (attendanceRepository.create as jest.Mock).mockImplementation((data) => ({
      id: 'att-' + Math.random().toString(36).substr(2, 9),
      employeeId: data.employee.connect.id,
      shiftId: data.shift.connect.id,
      clockIn: data.clockIn || new Date(),
      clockOut: data.clockOut || null,
      locationData: data.locationData || {},
      verificationData: data.verificationData || {},
      status: data.status || AttendanceStatus.PRESENT,
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    (attendanceRepository.update as jest.Mock).mockImplementation((id, updateData) => {
      // Get the original attendance record to preserve IDs
      const originalAttendance = (attendanceRepository.findByEmployeeAndShift as jest.Mock).mock.results
        .slice()
        .reverse()
        .find(result => result.value && result.value.id === id);
      
      return {
        id: id,
        employeeId: originalAttendance?.value?.employeeId || 'emp-id',
        shiftId: originalAttendance?.value?.shiftId || 'shift-id',
        clockIn: originalAttendance?.value?.clockIn || new Date(),
        clockOut: updateData.clockOut || null,
        locationData: updateData.locationData || {},
        verificationData: updateData.verificationData || {},
        status: updateData.status || AttendanceStatus.PRESENT,
        notes: updateData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  });

  /**
   * Property Test: Clock-in data completeness and accuracy
   * Tests that all provided clock-in data is accurately recorded without loss or corruption
   */
  it('Property 9a: Clock-in records complete data without corruption', async () => {
    await fc.assert(fc.asyncProperty(
      clockInDataGenerator(),
      async (clockInData) => {
        // Feature: security-workforce-payroll-system, Property 9a: Clock-in data completeness
        
        // Setup: Create valid employee, site, and shift
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        
        const actualClockInData = {
          ...clockInData,
          employeeId: employee.id,
          shiftId: shift.id,
          clockInTime: clockInData.clockInTime?.toISOString(),
        };

        // Mock the validation calls
        mockShiftAndEmployeeValidation(shift, employee, site);
        
        // Act: Process clock-in
        const result = await service.clockIn(actualClockInData);
        
        // Verify: All input data is preserved in the result
        expect(result.success).toBe(true);
        expect(result.action).toBe('CLOCK_IN');
        expect(result.attendance).toBeDefined();
        
        // Verify timestamp accuracy
        if (actualClockInData.clockInTime) {
          expect(result.attendance.clockIn).toEqual(new Date(actualClockInData.clockInTime));
        } else {
          expect(result.attendance.clockIn).toBeInstanceOf(Date);
          expect(Math.abs(result.attendance.clockIn.getTime() - Date.now())).toBeLessThan(5000); // Within 5 seconds
        }
        
        // Verify location data preservation
        const locationData = result.attendance.locationData as any;
        expect(locationData).toEqual(
          expect.objectContaining({
            latitude: actualClockInData.locationData.latitude,
            longitude: actualClockInData.locationData.longitude,
          })
        );
        
        // Verify verification data preservation
        if (actualClockInData.verificationData) {
          const verificationData = result.attendance.verificationData as any;
          expect(verificationData).toEqual(
            expect.objectContaining(actualClockInData.verificationData)
          );
        }
        
        // Verify employee and shift associations
        expect(result.attendance.employeeId).toBe(employee.id);
        expect(result.attendance.shiftId).toBe(shift.id);
        
        // Verify notes preservation
        if (actualClockInData.notes) {
          expect(result.attendance.notes).toBe(actualClockInData.notes);
        }
      }
    ), { numRuns: 50, timeout: 5000 });
  });
  /**
   * Property Test: Clock-out data completeness and accuracy
   * Tests that all provided clock-out data is accurately recorded and hours calculation is correct
   */
  it('Property 9b: Clock-out records complete data with accurate calculations', async () => {
    await fc.assert(fc.asyncProperty(
      clockOutDataGenerator(),
      fc.date({ min: new Date('2024-01-01'), max: new Date() }), // Clock-in time
      async (clockOutData, clockInTime) => {
        // Feature: security-workforce-payroll-system, Property 9b: Clock-out data completeness
        
        // Setup: Create valid employee, site, shift, and existing attendance
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        const existingAttendance = await setupExistingAttendance(employee.id, shift.id, clockInTime);
        
        const actualClockOutData = {
          ...clockOutData,
          employeeId: employee.id,
          shiftId: shift.id,
          clockOutTime: (clockOutData.clockOutTime && clockOutData.clockOutTime > clockInTime && !isNaN(clockOutData.clockOutTime.getTime())
            ? clockOutData.clockOutTime 
            : new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000)).toISOString(), // 8 hours later
        };

        // Mock the validation calls
        mockShiftAndEmployeeValidation(shift, employee, site);
        mockExistingAttendance(existingAttendance);
        
        // Act: Process clock-out
        const result = await service.clockOut(actualClockOutData);
        
        // Verify: All input data is preserved and calculations are accurate
        expect(result.success).toBe(true);
        expect(result.action).toBe('CLOCK_OUT');
        expect(result.attendance).toBeDefined();
        
        // Verify timestamp accuracy
        if (actualClockOutData.clockOutTime) {
          expect(result.attendance.clockOut).toEqual(new Date(actualClockOutData.clockOutTime));
        } else {
          expect(result.attendance.clockOut).toBeInstanceOf(Date);
          expect(Math.abs(result.attendance.clockOut.getTime() - Date.now())).toBeLessThan(5000);
        }
        
        // Verify location data preservation (should include both clock-in and clock-out)
        const locationData = result.attendance.locationData as any;
        expect(locationData).toEqual(
          expect.objectContaining({
            clockOut: expect.objectContaining({
              latitude: actualClockOutData.locationData.latitude,
              longitude: actualClockOutData.locationData.longitude,
            })
          })
        );
        
        // Verify hours worked calculation accuracy
        if (result.hoursWorked) {
          const expectedHours = (result.attendance.clockOut.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          expect(Math.abs(result.hoursWorked - expectedHours)).toBeLessThan(0.01); // Within 1 minute accuracy
        }
        
        // Verify overtime calculation accuracy
        if (result.overtimeHours !== undefined) {
          expect(result.overtimeHours).toBeGreaterThanOrEqual(0);
          expect(typeof result.overtimeHours).toBe('number');
        }
        
        // Verify notes are properly concatenated if provided
        if (actualClockOutData.notes && actualClockOutData.notes.trim()) {
          expect(result.attendance.notes).toContain(actualClockOutData.notes.trim());
        }
      }
    ), { numRuns: 50, timeout: 5000 });
  });

  /**
   * Property Test: Location verification data integrity
   * Tests that location data is accurately stored and retrieved without corruption
   */
  it('Property 9c: Location verification maintains data integrity', async () => {
    await fc.assert(fc.asyncProperty(
      locationDataGenerator(),
      locationDataGenerator(), // Different location for clock-out
      async (clockInLocation, clockOutLocation) => {
        // Feature: security-workforce-payroll-system, Property 9c: Location data integrity
        
        // Setup
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        
        // Mock validation
        mockShiftAndEmployeeValidation(shift, employee, site);
        
        // Act: Clock in with first location
        (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValueOnce(null);
        const clockInResult = await service.clockIn({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: clockInLocation,
        });
        
        // Mock existing attendance for clock-out
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clockIn: new Date(),
        };
        
        (attendanceRepository.findByEmployeeAndShift as jest.Mock)
          .mockResolvedValueOnce(mockAttendanceWithClockIn);
        
        // Act: Clock out with second location
        const clockOutResult = await service.clockOut({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: clockOutLocation,
        });
        
        // Verify: Both location records are maintained separately and accurately
        
        // Clock-in location should be preserved
        const clockInLocationData = clockInResult.attendance.locationData as any;
        expect(clockInLocationData).toEqual(
          expect.objectContaining({
            latitude: clockInLocation.latitude,
            longitude: clockInLocation.longitude,
          })
        );
        
        // Clock-out should maintain both locations
        const clockOutLocationData = clockOutResult.attendance.locationData as any;
        expect(clockOutLocationData).toEqual(
          expect.objectContaining({
            clockOut: expect.objectContaining({
              latitude: clockOutLocation.latitude,
              longitude: clockOutLocation.longitude,
            })
          })
        );
        
        // Verify precision is maintained (no rounding errors)
        if (clockInLocation.accuracy) {
          expect(clockInLocationData.accuracy).toBe(clockInLocation.accuracy);
        }
        
        if (clockOutLocation.accuracy) {
          expect(clockOutLocationData.clockOut.accuracy).toBe(clockOutLocation.accuracy);
        }
        
        // Verify optional fields are preserved when provided
        if (clockInLocation.address) {
          expect(clockInLocationData.address).toBe(clockInLocation.address);
        }
        
        if (clockOutLocation.capturedAt) {
          expect(clockOutLocationData.clockOut.capturedAt).toBe(clockOutLocation.capturedAt);
        }
      }
    ), { numRuns: 30, timeout: 5000 });
  });
  /**
   * Property Test: Verification data completeness
   * Tests that verification metadata is completely preserved without any data loss
   */
  it('Property 9d: Verification data maintains completeness and structure', async () => {
    await fc.assert(fc.asyncProperty(
      verificationDataGenerator(),
      verificationDataGenerator(),
      async (clockInVerification, clockOutVerification) => {
        // Feature: security-workforce-payroll-system, Property 9d: Verification data completeness
        
        // Setup
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        mockShiftAndEmployeeValidation(shift, employee, site);
        
        // Act: Clock in with verification data
        (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValueOnce(null);
        const clockInResult = await service.clockIn({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: { latitude: 12.34, longitude: 56.78 },
          verificationData: clockInVerification,
        });
        
        // Mock existing attendance
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clockIn: new Date(),
          verificationData: clockInVerification,
        };
        
        (attendanceRepository.findByEmployeeAndShift as jest.Mock)
          .mockResolvedValueOnce(mockAttendanceWithClockIn);
        
        // Act: Clock out with different verification data
        const clockOutResult = await service.clockOut({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: { latitude: 12.34, longitude: 56.78 },
          verificationData: clockOutVerification,
        });
        
        // Verify: All verification data fields are preserved accurately
        
        // Clock-in verification data preservation
        const clockInVerificationData = clockInResult.attendance.verificationData as any;
        if (clockInVerification.photo) {
          expect(clockInVerificationData.photo).toBe(clockInVerification.photo);
        }
        
        if (clockInVerification.device) {
          expect(clockInVerificationData.device).toEqual(clockInVerification.device);
        }
        
        if (clockInVerification.flags) {
          expect(clockInVerificationData.flags).toEqual(
            expect.objectContaining(clockInVerification.flags)
          );
        }
        
        // Clock-out verification data should be merged correctly
        const clockOutVerificationData = clockOutResult.attendance.verificationData as any;
        expect(clockOutVerificationData).toEqual(
          expect.objectContaining({
            clockOut: expect.objectContaining(clockOutVerification)
          })
        );
        
        // Verify nested object integrity
        if (clockInVerification.device && clockInVerification.device.id) {
          expect(clockInVerificationData.device.id).toBe(clockInVerification.device.id);
        }
        
        if (clockOutVerification.device && clockOutVerification.device.model) {
          expect(clockOutVerificationData.clockOut.device.model).toBe(clockOutVerification.device.model);
        }
        
        // Verify boolean flags are preserved correctly
        if (clockInVerification.flags) {
          Object.keys(clockInVerification.flags).forEach(key => {
            expect(clockInVerificationData.flags[key]).toBe(clockInVerification.flags[key]);
          });
        }
      }
    ), { numRuns: 30, timeout: 5000 });
  });

  /**
   * Property Test: Metadata consistency across operations
   * Tests that system-generated metadata is consistent and accurate across all operations
   */
  it('Property 9e: System metadata maintains consistency and accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }), // Notes
      fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      async (notes, baseTime) => {
        // Feature: security-workforce-payroll-system, Property 9e: Metadata consistency
        
        // Setup
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        mockShiftAndEmployeeValidation(shift, employee, site);
        
        const clockInTime = baseTime;
        const clockOutTime = new Date(baseTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
        
        // Act: Full attendance cycle
        (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValueOnce(null);
        const clockInResult = await service.clockIn({
          employeeId: employee.id,
          shiftId: shift.id,
          clockInTime: clockInTime.toISOString(),
          locationData: { latitude: 12.34, longitude: 56.78 },
          notes: notes,
        });
        
        // Mock existing attendance
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clockIn: clockInTime,
          notes: notes,
        };
        
        (attendanceRepository.findByEmployeeAndShift as jest.Mock)
          .mockResolvedValueOnce(mockAttendanceWithClockIn);
        
        (attendanceRepository.update as jest.Mock)
          .mockImplementationOnce((id, updateData) => ({
            ...mockAttendanceWithClockIn,
            ...updateData,
          }));
        
        const clockOutResult = await service.clockOut({
          employeeId: employee.id,
          shiftId: shift.id,
          clockOutTime: clockOutTime.toISOString(),
          locationData: { latitude: 12.35, longitude: 56.79 },
        });
        
        // Verify: System metadata consistency
        
        // Verify employee and shift relationships are maintained
        expect(clockInResult.attendance.employeeId).toBe(employee.id);
        expect(clockInResult.attendance.shiftId).toBe(shift.id);
        expect(clockOutResult.attendance.employeeId).toBe(employee.id);
        expect(clockOutResult.attendance.shiftId).toBe(shift.id);
        
        // Verify timestamps are accurate and in correct sequence
        expect(clockInResult.attendance.clockIn).toEqual(clockInTime);
        expect(clockOutResult.attendance.clockOut).toEqual(clockOutTime);
        expect(clockOutResult.attendance.clockOut.getTime()).toBeGreaterThan(clockInTime.getTime());
        
        // Verify status progression is logical
        expect(['PRESENT', 'LATE'].includes(clockInResult.attendance.status)).toBe(true);
        expect(['PRESENT', 'LATE', 'OVERTIME', 'EARLY_DEPARTURE'].includes(clockOutResult.attendance.status)).toBe(true);
        
        // Verify notes are preserved and not corrupted
        if (notes.trim()) {
          expect(clockInResult.attendance.notes).toBe(notes);
        }
        
        // Verify calculated fields are mathematically correct
        if (clockOutResult.hoursWorked) {
          const expectedHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          expect(Math.abs(clockOutResult.hoursWorked - expectedHours)).toBeLessThan(0.01);
        }
        
        // Verify next expected action logic
        expect(clockInResult.nextExpectedAction).toBe('CLOCK_OUT');
        expect(clockOutResult.nextExpectedAction).toBe('NONE');
      }
    ), { numRuns: 25, timeout: 5000 });
  });

  // ============================================================================
  // HELPER FUNCTIONS FOR MOCKING
  // ============================================================================

  function createMockAttendanceRepository() {
    return {
      findByEmployeeAndShift: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({
        id: 'att-' + Math.random().toString(36).substr(2, 9),
        employeeId: data.employee.connect.id,
        shiftId: data.shift.connect.id,
        clockIn: data.clockIn || new Date(),
        clockOut: data.clockOut || null,
        locationData: data.locationData || {},
        verificationData: data.verificationData || {},
        status: data.status || AttendanceStatus.PRESENT,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: {
          id: data.employee.connect.id,
          firstName: 'John',
          lastName: 'Doe',
          employeeNumber: 'EMP001',
          email: 'john@example.com',
        },
        shift: {
          id: data.shift.connect.id,
          shiftDate: new Date(),
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
          shiftType: 'REGULAR',
          status: 'SCHEDULED',
          site: {
            id: 'site-id',
            name: 'Test Site',
            client: {
              id: 'client-id',
              name: 'Test Client',
            },
          },
        },
      })),
      update: jest.fn().mockImplementation((id, data) => ({
        id: id,
        employeeId: 'emp-id',
        shiftId: 'shift-id',
        clockIn: new Date(),
        clockOut: data.clockOut || null,
        locationData: data.locationData || {},
        verificationData: data.verificationData || {},
        status: data.status || AttendanceStatus.PRESENT,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: {
          id: 'emp-id',
          firstName: 'John',
          lastName: 'Doe',
          employeeNumber: 'EMP001',
          email: 'john@example.com',
        },
        shift: {
          id: 'shift-id',
          shiftDate: new Date(),
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
          shiftType: 'REGULAR',
          status: 'SCHEDULED',
          site: {
            id: 'site-id',
            name: 'Test Site',
            client: {
              id: 'client-id',
              name: 'Test Client',
            },
          },
        },
      })),
    };
  }

  function createMockPrismaService() {
    return {
      employee: {
        findFirst: jest.fn(),
      },
      shift: {
        findFirst: jest.fn(),
      },
      assignment: {
        findFirst: jest.fn(),
      },
      attendance: {
        create: jest.fn().mockImplementation((data) => ({
          id: 'att-' + Math.random().toString(36).substr(2, 9),
          employeeId: data.data.employee.connect.id,
          shiftId: data.data.shift.connect.id,
          clockIn: data.data.clockIn || new Date(),
          clockOut: data.data.clockOut || null,
          locationData: data.data.locationData || {},
          verificationData: data.data.verificationData || {},
          status: data.data.status || AttendanceStatus.PRESENT,
          notes: data.data.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation((params) => ({
          id: 'att-' + Math.random().toString(36).substr(2, 9),
          employeeId: 'emp-id',
          shiftId: 'shift-id',
          clockIn: new Date(),
          clockOut: params.data.clockOut || null,
          locationData: params.data.locationData || {},
          verificationData: params.data.verificationData || {},
          status: params.data.status || AttendanceStatus.PRESENT,
          notes: params.data.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    };
  }

  async function setupValidEmployeeShiftSite() {
    const employee = {
      id: 'emp-' + Math.random().toString(36).substr(2, 9),
      companyId: mockTenantId,
      employeeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      employmentStatus: EmploymentStatus.ACTIVE,
    };

    const site = {
      id: 'site-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Site',
      address: {
        latitude: 12.34,
        longitude: 56.78,
        street: '123 Test Street',
        city: 'Test City',
      },
      client: {
        id: 'client-' + Math.random().toString(36).substr(2, 9),
        companyId: mockTenantId,
        name: 'Test Client',
      },
    };

    const shift = {
      id: 'shift-' + Math.random().toString(36).substr(2, 9),
      siteId: site.id,
      assignmentId: 'assignment-' + Math.random().toString(36).substr(2, 9),
      shiftDate: new Date(),
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      status: ShiftStatus.SCHEDULED,
      site: site,
      assignment: {
        id: 'assignment-' + Math.random().toString(36).substr(2, 9),
        employeeId: employee.id,
        siteId: site.id,
        status: AssignmentStatus.ACTIVE,
        employee: employee,
      },
    };

    return { employee, shift, site };
  }

  function mockShiftAndEmployeeValidation(shift: any, employee: any, site: any) {
    (prisma.shift.findFirst as jest.Mock).mockResolvedValue(shift);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue(employee);
    (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(shift.assignment);
  }

  async function setupExistingAttendance(employeeId: string, shiftId: string, clockIn: Date) {
    const attendance = {
      id: 'att-' + Math.random().toString(36).substr(2, 9),
      employeeId,
      shiftId,
      clockIn,
      clockOut: null,
      status: AttendanceStatus.PRESENT,
      locationData: { latitude: 12.34, longitude: 56.78 },
      verificationData: {},
      notes: null,
    };

    return attendance;
  }

  function mockExistingAttendance(attendance: any) {
    (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValue(attendance);
    (attendanceRepository.update as jest.Mock).mockImplementation((id, updateData) => ({
      ...attendance,
      ...updateData,
    }));
  }
});