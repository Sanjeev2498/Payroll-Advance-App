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

const location_dataGenerator = () => fc.record({
  latitude: validLatitudeGenerator(),
  longitude: validLongitudeGenerator(),
  accuracy: fc.option(accuracyGenerator()),
  address: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  capturedAt: fc.option(
    // CRITICAL FIX: Generate valid timestamp strings instead of invalid dates
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      .filter(timestamp => !isNaN(timestamp) && timestamp > 0)
      .map(timestamp => new Date(timestamp).toISOString())
  ),
  method: fc.option(fc.constantFrom('GPS', 'Network', 'Manual')),
});

const verification_dataGenerator = () => fc.record({
  photo: fc.option(fc.string({ minLength: 10, maxLength: 100 })), // FIXED: Reduced length to fit column constraints
  device: fc.option(fc.record({
    id: fc.string({ minLength: 10, maxLength: 30 }), // FIXED: Reduced length to fit constraints
    model: fc.string({ minLength: 5, maxLength: 20 }), // FIXED: Reduced length to fit constraints
    os: fc.string({ minLength: 3, maxLength: 15 }), // FIXED: Reduced length to fit constraints
    appVersion: fc.string({ minLength: 3, maxLength: 10 }),
  })),
  ipAddress: fc.option(fc.ipV4()),
  userAgent: fc.option(fc.string({ minLength: 20, maxLength: 100 })), // FIXED: Reduced length to fit constraints
  flags: fc.option(fc.record({
    photoVerified: fc.boolean(),
    locationVerified: fc.boolean(),
    biometricVerified: fc.boolean(),
    manualEntry: fc.boolean(),
  })),
});

const clock_inDataGenerator = () => fc.record({
  employee_id: fc.uuid(),
  shift_id: fc.uuid(),
  clock_inTime: fc.option(
    // CRITICAL FIX: Generate valid dates that won't cause new Date(NaN) issues
    fc.date({ 
      min: new Date('2020-01-01'), 
      max: new Date('2030-12-31') 
    }).filter(date => !isNaN(date.getTime()) && date.getFullYear() >= 2020)
  ),
  location_data: location_dataGenerator(),
  verification_data: fc.option(verification_dataGenerator()),
  notes: fc.option(fc.string({ maxLength: 250 })), // FIXED: Reduced length to fit column constraints
});

const clock_outDataGenerator = () => fc.record({
  employee_id: fc.uuid(),
  shift_id: fc.uuid(),
  clock_outTime: fc.option(
    // CRITICAL FIX: Generate valid dates that won't cause new Date(NaN) issues
    fc.date({ 
      min: new Date('2024-01-01'), 
      max: new Date('2030-12-31') 
    }).filter(date => {
      // Ensure valid dates only
      return !isNaN(date.getTime()) && 
             date.getFullYear() >= 2024 && 
             date.getFullYear() <= 2030;
    })
  ),
  location_data: location_dataGenerator(),
  verification_data: fc.option(verification_dataGenerator()),
  notes: fc.option(fc.string({ maxLength: 250 })), // FIXED: Reduced length to fit column constraints
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
    tenantContext = await module.resolve<TenantContextService>(TenantContextService);
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
      employee_id: data.employees?.connect?.id || data.employeeId,
      shift_id: data.shifts?.connect?.id || data.shiftId,
      clock_in: data.clock_in || new Date(),
      clock_out: data.clock_out || null,
      location_data: data.location_data || {},
      verification_data: data.verification_data || {},
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
        employee_id: originalAttendance?.value?.employee_id || 'emp-id',
        shift_id: originalAttendance?.value?.shift_id || 'shift-id',
        clock_in: originalAttendance?.value?.clock_in || new Date(),
        clock_out: updateData.clock_out || null,
        location_data: updateData.location_data || {},
        verification_data: updateData.verification_data || {},
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
      clock_inDataGenerator(),
      async (clock_inData) => {
        // Feature: security-workforce-payroll-system, Property 9a: Clock-in data completeness
        
        // Setup: Create valid employee, site, and shift
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        
        const actualClockInData = {
          employeeId: employee.id,
          shiftId: shift.id,
          clockInTime: clock_inData.clock_inTime?.toISOString(),
          locationData: clock_inData.location_data,
          verificationData: clock_inData.verification_data,
          notes: clock_inData.notes,
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
          expect(result.attendance.clock_in).toEqual(new Date(actualClockInData.clockInTime));
        } else {
          expect(result.attendance.clock_in).toBeInstanceOf(Date);
          expect(Math.abs(result.attendance.clock_in.getTime() - Date.now())).toBeLessThan(5000); // Within 5 seconds
        }
        
        // Verify location data preservation
        const location_data = result.attendance.location_data as any;
        expect(location_data).toEqual(
          expect.objectContaining({
            latitude: actualClockInData.locationData.latitude,
            longitude: actualClockInData.locationData.longitude,
          })
        );
        
        // Verify verification data preservation
        if (actualClockInData.verificationData) {
          const verification_data = result.attendance.verification_data as any;
          expect(verification_data).toEqual(
            expect.objectContaining(actualClockInData.verificationData)
          );
        }
        
        // Verify employee and shift associations
        expect(result.attendance.employee_id).toBe(employee.id);
        expect(result.attendance.shift_id).toBe(shift.id);
        
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
      clock_outDataGenerator(),
      fc.date({ min: new Date('2024-01-01'), max: new Date() }), // Clock-in time
      async (clock_outData, clock_inTime) => {
        // Feature: security-workforce-payroll-system, Property 9b: Clock-out data completeness
        
        // Setup: Create valid employee, site, shift, and existing attendance
        const { employee, shift, site } = await setupValidEmployeeShiftSite();
        const existingAttendance = await setupExistingAttendance(employee.id, shift.id, clock_inTime);
        
        const actualClockOutData = {
          employeeId: employee.id,
          shiftId: shift.id,
          clockOutTime: (clock_outData.clock_outTime && 
                        !isNaN(clock_outData.clock_outTime.getTime()) &&
                        clock_outData.clock_outTime > clock_inTime
            ? clock_outData.clock_outTime 
            : !isNaN(clock_inTime.getTime()) 
              ? new Date(clock_inTime.getTime() + 8 * 60 * 60 * 1000) // 8 hours later
              : new Date() // Fallback to current time if clock_inTime is invalid
            ).toISOString(),
          locationData: clock_outData.location_data,
          verificationData: clock_outData.verification_data,
          notes: clock_outData.notes,
        };

        // Skip test if we have invalid dates that would cause NaN calculations
        if (isNaN(new Date(actualClockOutData.clockOutTime).getTime()) || 
            isNaN(clock_inTime.getTime())) {
          return; // Skip this test case
        }

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
          expect(result.attendance.clock_out).toEqual(new Date(actualClockOutData.clockOutTime));
        } else {
          expect(result.attendance.clock_out).toBeInstanceOf(Date);
          expect(Math.abs(result.attendance.clock_out.getTime() - Date.now())).toBeLessThan(5000);
        }
        
        // Verify location data preservation (should include both clock-in and clock-out)
        const location_data = result.attendance.location_data as any;
        expect(location_data).toEqual(
          expect.objectContaining({
            clock_out: expect.objectContaining({
              latitude: actualClockOutData.locationData.latitude,
              longitude: actualClockOutData.locationData.longitude,
            })
          })
        );
        
        // Verify hours worked calculation accuracy
        if (result.hoursWorked) {
          const expectedHours = (result.attendance.clock_out.getTime() - clock_inTime.getTime()) / (1000 * 60 * 60);
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
      location_dataGenerator(),
      location_dataGenerator(), // Different location for clock-out
      async (clock_inLocation, clock_outLocation) => {
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
          locationData: clock_inLocation,
        });
        
        // Mock existing attendance for clock-out
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clock_in: new Date(),
        };
        
        (attendanceRepository.findByEmployeeAndShift as jest.Mock)
          .mockResolvedValueOnce(mockAttendanceWithClockIn);
        
        // Act: Clock out with second location
        const clockOutResult = await service.clockOut({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: clock_outLocation,
        });
        
        // Verify: Both location records are maintained separately and accurately
        
        // Clock-in location should be preserved
        const clock_inLocationData = clockInResult.attendance.location_data as any;
        expect(clock_inLocationData).toEqual(
          expect.objectContaining({
            latitude: clock_inLocation.latitude,
            longitude: clock_inLocation.longitude,
          })
        );
        
        // Clock-out should maintain both locations
        const clock_outLocationData = clockOutResult.attendance.location_data as any;
        expect(clock_outLocationData).toEqual(
          expect.objectContaining({
            clock_out: expect.objectContaining({
              latitude: clock_outLocation.latitude,
              longitude: clock_outLocation.longitude,
            })
          })
        );
        
        // Verify precision is maintained (no rounding errors)
        if (clock_inLocation.accuracy) {
          expect(clock_inLocationData.accuracy).toBe(clock_inLocation.accuracy);
        }
        
        if (clock_outLocation.accuracy) {
          expect(clock_outLocationData.clock_out.accuracy).toBe(clock_outLocation.accuracy);
        }
        
        // Verify optional fields are preserved when provided
        if (clock_inLocation.address) {
          expect(clock_inLocationData.address).toBe(clock_inLocation.address);
        }
        
        if (clock_outLocation.capturedAt) {
          expect(clock_outLocationData.clock_out.capturedAt).toBe(clock_outLocation.capturedAt);
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
      verification_dataGenerator(),
      verification_dataGenerator(),
      async (clock_inVerification, clock_outVerification) => {
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
          verificationData: clock_inVerification,
        });
        
        // Mock existing attendance
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clock_in: new Date(),
          verificationData: clock_inVerification,
        };
        
        (attendanceRepository.findByEmployeeAndShift as jest.Mock)
          .mockResolvedValueOnce(mockAttendanceWithClockIn);
        
        // Act: Clock out with different verification data
        const clockOutResult = await service.clockOut({
          employeeId: employee.id,
          shiftId: shift.id,
          locationData: { latitude: 12.34, longitude: 56.78 },
          verificationData: clock_outVerification,
        });
        
        // Verify: All verification data fields are preserved accurately
        
        // Clock-in verification data preservation
        const clock_inVerificationData = clockInResult.attendance.verification_data as any;
        if (clock_inVerification.photo) {
          expect(clock_inVerificationData.photo).toBe(clock_inVerification.photo);
        }
        
        if (clock_inVerification.device) {
          expect(clock_inVerificationData.device).toEqual(clock_inVerification.device);
        }
        
        if (clock_inVerification.flags) {
          expect(clock_inVerificationData.flags).toEqual(
            expect.objectContaining(clock_inVerification.flags)
          );
        }
        
        // Clock-out verification data should be merged correctly
        const clock_outVerificationData = clockOutResult.attendance.verification_data as any;
        expect(clock_outVerificationData).toEqual(
          expect.objectContaining({
            clock_out: expect.objectContaining(clock_outVerification)
          })
        );
        
        // Verify nested object integrity
        if (clock_inVerification.device && clock_inVerification.device.id) {
          expect(clock_inVerificationData.device.id).toBe(clock_inVerification.device.id);
        }
        
        if (clock_outVerification.device && clock_outVerification.device.model) {
          expect(clock_outVerificationData.clock_out.device.model).toBe(clock_outVerification.device.model);
        }
        
        // Verify boolean flags are preserved correctly
        if (clock_inVerification.flags) {
          Object.keys(clock_inVerification.flags).forEach(key => {
            expect(clock_inVerificationData.flags[key]).toBe(clock_inVerification.flags[key]);
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
        
        const clock_inTime = baseTime;
        const clock_outTime = new Date(baseTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
        
        // Act: Full attendance cycle
        (attendanceRepository.findByEmployeeAndShift as jest.Mock).mockResolvedValueOnce(null);
        const clockInResult = await service.clockIn({
          employeeId: employee.id,
          shiftId: shift.id,
          clockInTime: clock_inTime.toISOString(),
          locationData: { latitude: 12.34, longitude: 56.78 },
          notes: notes,
        });
        
        // Mock existing attendance
        const mockAttendanceWithClockIn = {
          ...clockInResult.attendance,
          clock_in: clock_inTime,
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
          clockOutTime: clock_outTime.toISOString(),
          locationData: { latitude: 12.35, longitude: 56.79 },
        });
        
        // Verify: System metadata consistency
        
        // Verify employee and shift relationships are maintained
        expect(clockInResult.attendance.employee_id).toBe(employee.id);
        expect(clockInResult.attendance.shift_id).toBe(shift.id);
        expect(clockOutResult.attendance.employee_id).toBe(employee.id);
        expect(clockOutResult.attendance.shift_id).toBe(shift.id);
        
        // Verify timestamps are accurate and in correct sequence
        expect(clockInResult.attendance.clock_in).toEqual(clock_inTime);
        expect(clockOutResult.attendance.clock_out).toEqual(clock_outTime);
        expect(clockOutResult.attendance.clock_out.getTime()).toBeGreaterThan(clock_inTime.getTime());
        
        // Verify status progression is logical
        expect(['PRESENT', 'LATE'].includes(clockInResult.attendance.status)).toBe(true);
        expect(['PRESENT', 'LATE', 'OVERTIME', 'EARLY_DEPARTURE'].includes(clockOutResult.attendance.status)).toBe(true);
        
        // Verify notes are preserved and not corrupted
        if (notes.trim()) {
          expect(clockInResult.attendance.notes).toBe(notes);
        }
        
        // Verify calculated fields are mathematically correct
        if (clockOutResult.hoursWorked) {
          const expectedHours = (clock_outTime.getTime() - clock_inTime.getTime()) / (1000 * 60 * 60);
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
        employee_id: data.employee.connect.id,
        shift_id: data.shift.connect.id,
        clock_in: data.clock_in || new Date(),
        clock_out: data.clock_out || null,
        location_data: data.location_data || {},
        verification_data: data.verification_data || {},
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
        employee_id: 'emp-id',
        shift_id: 'shift-id',
        clock_in: new Date(),
        clock_out: data.clock_out || null,
        location_data: data.location_data || {},
        verification_data: data.verification_data || {},
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
      employees: {
        findFirst: jest.fn(),
      },
      shifts: {
        findFirst: jest.fn(),
      },
      assignment: {
        findFirst: jest.fn(),
      },
      attendance: {
        create: jest.fn().mockImplementation((data) => ({
          id: 'att-' + Math.random().toString(36).substr(2, 9),
          employee_id: data.data.employees?.connect?.id || data.data.employeeId,
          shift_id: data.data.shifts?.connect?.id || data.data.shiftId,
          clock_in: data.data.clock_in || new Date(),
          clock_out: data.data.clock_out || null,
          location_data: data.data.location_data || {},
          verificationData: data.data.verification_data || {},
          status: data.data.status || AttendanceStatus.PRESENT,
          notes: data.data.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation((params) => ({
          id: 'att-' + Math.random().toString(36).substr(2, 9),
          employee_id: 'emp-id',
          shift_id: 'shift-id',
          clock_in: new Date(),
          clock_out: params.data.clock_out || null,
          location_data: params.data.location_data || {},
          verificationData: params.data.verification_data || {},
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
      shift_date: new Date(), // FIXED: Use snake_case to match database schema
      start_time: new Date('2024-01-01T08:00:00Z'), // FIXED: Use snake_case 
      end_time: new Date('2024-01-01T17:00:00Z'), // FIXED: Use snake_case
      status: ShiftStatus.SCHEDULED,
      site: site,
      assignment: {
        id: 'assignment-' + Math.random().toString(36).substr(2, 9),
        employee_id: employee.id,
        siteId: site.id,
        status: AssignmentStatus.ACTIVE,
        employee: employee,
      },
    };

    return { employee, shift, site };
  }

  function mockShiftAndEmployeeValidation(shift: any, employee: any, site: any) {
    (prisma.shifts.findFirst as jest.Mock).mockResolvedValue(shift);
    (prisma.employees.findFirst as jest.Mock).mockResolvedValue(employee);
    (prisma.assignment.findFirst as jest.Mock).mockResolvedValue(shift.assignment);
  }

  async function setupExistingAttendance(employee_id: string, shift_id: string, clock_in: Date) {
    const attendance = {
      id: 'att-' + Math.random().toString(36).substr(2, 9),
      employee_id,
      shift_id,
      clock_in,
      clock_out: null,
      status: AttendanceStatus.PRESENT,
      location_data: { latitude: 12.34, longitude: 56.78 },
      verification_data: {},
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
