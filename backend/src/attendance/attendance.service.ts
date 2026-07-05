import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceQueryDto,
  ClockInDto,
  ClockOutDto,
  AttendanceCorrectionDto,
  AttendanceApprovalDto,
  BulkAttendanceUpdateDto,
  AttendanceAnomalyQueryDto,
} from './dto';
import { 
  Attendance, 
  AttendanceStatus, 
  ShiftStatus,
  AssignmentStatus 
} from '@prisma/client';

interface LocationValidationResult {
  isValid: boolean;
  distance?: number;
  accuracy?: number;
  warnings: string[];
}

interface AttendanceValidationResult {
  isValid: boolean;
  warnings: string[];
  anomalies: any[];
  autoCorrections: any[];
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  // Configuration constants
  private readonly LOCATION_THRESHOLD_METERS = 100; // 100 meter radius
  private readonly GRACE_PERIOD_MINUTES = 15; // 15 minute grace period
  private readonly OVERTIME_THRESHOLD_HOURS = 8; // Standard 8-hour workday
  private readonly MAX_SHIFT_HOURS = 12; // Maximum shift duration

  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create attendance record with comprehensive validation
   */
  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    this.logger.log(`Creating attendance record for employee ${createAttendanceDto.employeeId}`);

    // Validate the attendance data
    const validation = await this.validateAttendanceData(createAttendanceDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.warnings.join(', ')}`);
    }

    // Check for existing attendance record
    const existing = await this.attendanceRepository.findByEmployeeAndShift(
      createAttendanceDto.employeeId,
      createAttendanceDto.shiftId,
    );

    if (existing) {
      throw new ConflictException('Attendance record already exists for this employee and shift');
    }

    try {
      const attendanceData = {
        employee: {
          connect: { id: createAttendanceDto.employeeId }
        },
        shift: {
          connect: { id: createAttendanceDto.shiftId }
        },
        clockIn: createAttendanceDto.clockIn ? new Date(createAttendanceDto.clockIn) : null,
        clockOut: createAttendanceDto.clockOut ? new Date(createAttendanceDto.clockOut) : null,
        locationData: createAttendanceDto.locationData as any,
        verificationData: createAttendanceDto.verificationData as any,
        status: this.determineAttendanceStatus(createAttendanceDto),
        notes: createAttendanceDto.notes,
      };

      const attendance = await this.attendanceRepository.create(attendanceData);
      this.logger.log(`Successfully created attendance record: ${attendance.id}`);

      // Update shift coverage if needed
      await this.updateShiftCoverage(createAttendanceDto.shiftId);

      return attendance;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  /**
   * Employee clock-in with location and verification
   */
  async clockIn(clockInDto: ClockInDto) {
    this.logger.log(`Processing clock-in for employee ${clockInDto.employeeId}`);

    // Validate shift and employee
    const { shift, employee, assignment } = await this.validateShiftAndEmployee(
      clockInDto.shiftId,
      clockInDto.employeeId,
    );

    // Check if already clocked in
    let attendance = await this.attendanceRepository.findByEmployeeAndShift(
      clockInDto.employeeId,
      clockInDto.shiftId,
    );

    if (attendance?.clockIn) {
      throw new ConflictException('Employee has already clocked in for this shift');
    }

    // Validate location if provided
    const locationValidation = await this.validateLocation(
      clockInDto.locationData,
      shift.site.address as any,
    );

    const clockInTime = clockInDto.clockInTime ? new Date(clockInDto.clockInTime) : new Date();
    const warnings: string[] = [];
    const anomalies: any[] = [];

    // Check for early/late arrival
    const shiftStart = this.combineDateTime(shift.shiftDate, shift.startTime);
    const timeDiffMinutes = (clockInTime.getTime() - shiftStart.getTime()) / (1000 * 60);

    if (timeDiffMinutes > this.GRACE_PERIOD_MINUTES) {
      warnings.push(`Late arrival: ${Math.ceil(timeDiffMinutes)} minutes after scheduled start`);
      anomalies.push({
        type: 'LATE_ARRIVAL',
        severity: this.calculateLateSeverity(timeDiffMinutes),
        minutesLate: Math.ceil(timeDiffMinutes),
      });
    } else if (timeDiffMinutes < -30) {
      warnings.push(`Very early arrival: ${Math.abs(Math.floor(timeDiffMinutes))} minutes before scheduled start`);
    }

    // Add location warnings
    warnings.push(...locationValidation.warnings);

    try {
      // Create or update attendance record
      if (attendance) {
        attendance = await this.attendanceRepository.update(attendance.id, {
          clockIn: clockInTime,
          locationData: clockInDto.locationData as any,
          verificationData: clockInDto.verificationData as any,
          status: timeDiffMinutes > this.GRACE_PERIOD_MINUTES 
            ? AttendanceStatus.LATE 
            : AttendanceStatus.PRESENT,
          notes: clockInDto.notes || attendance.notes,
        }) as any;
      } else {
        attendance = await this.attendanceRepository.create({
          employee: { connect: { id: clockInDto.employeeId } },
          shift: { connect: { id: clockInDto.shiftId } },
          clockIn: clockInTime,
          locationData: clockInDto.locationData as any,
          verificationData: clockInDto.verificationData as any,
          status: timeDiffMinutes > this.GRACE_PERIOD_MINUTES 
            ? AttendanceStatus.LATE 
            : AttendanceStatus.PRESENT,
          notes: clockInDto.notes,
        }) as any;
      }

      this.logger.log(`Successfully processed clock-in for employee ${clockInDto.employeeId}`);

      return {
        success: true,
        action: 'CLOCK_IN' as const,
        timestamp: clockInTime,
        attendance,
        warnings,
        anomalies,
        nextExpectedAction: 'CLOCK_OUT' as const,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  /**
   * Employee clock-out with validation
   */
  async clockOut(clockOutDto: ClockOutDto) {
    this.logger.log(`Processing clock-out for employee ${clockOutDto.employeeId}`);

    // Validate shift and employee
    const { shift } = await this.validateShiftAndEmployee(
      clockOutDto.shiftId,
      clockOutDto.employeeId,
    );

    // Find existing attendance record
    const attendance = await this.attendanceRepository.findByEmployeeAndShift(
      clockOutDto.employeeId,
      clockOutDto.shiftId,
    );

    if (!attendance) {
      throw new NotFoundException('No attendance record found. Employee must clock in first.');
    }

    if (!attendance.clockIn) {
      throw new BadRequestException('Cannot clock out without clocking in first');
    }

    if (attendance.clockOut) {
      throw new ConflictException('Employee has already clocked out for this shift');
    }

    // Validate location if provided
    const locationValidation = await this.validateLocation(
      clockOutDto.locationData,
      shift.site.address as any,
    );

    const clockOutTime = clockOutDto.clockOutTime ? new Date(clockOutDto.clockOutTime) : new Date();
    const warnings: string[] = [];
    const anomalies: any[] = [];

    // Check for early departure
    const shiftEnd = this.combineDateTime(shift.shiftDate, shift.endTime);
    const timeDiffMinutes = (shiftEnd.getTime() - clockOutTime.getTime()) / (1000 * 60);

    if (timeDiffMinutes > this.GRACE_PERIOD_MINUTES) {
      warnings.push(`Early departure: ${Math.ceil(timeDiffMinutes)} minutes before scheduled end`);
      anomalies.push({
        type: 'EARLY_DEPARTURE',
        severity: this.calculateEarlySeverity(timeDiffMinutes),
        minutesEarly: Math.ceil(timeDiffMinutes),
      });
    }

    // Calculate total hours worked
    const hoursWorked = (clockOutTime.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60);
    const scheduledHours = (shiftEnd.getTime() - this.combineDateTime(shift.shiftDate, shift.startTime).getTime()) / (1000 * 60 * 60);
    const overtimeHours = Math.max(0, hoursWorked - scheduledHours);

    if (overtimeHours > 0.1) { // More than 6 minutes overtime
      warnings.push(`Overtime detected: ${overtimeHours.toFixed(1)} hours`);
      anomalies.push({
        type: 'OVERTIME',
        severity: overtimeHours > 2 ? 'HIGH' : 'MEDIUM',
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      });
    }

    // Validate shift duration
    if (hoursWorked > this.MAX_SHIFT_HOURS) {
      warnings.push(`Excessive shift duration: ${hoursWorked.toFixed(1)} hours`);
      anomalies.push({
        type: 'EXCESSIVE_HOURS',
        severity: 'HIGH',
        totalHours: parseFloat(hoursWorked.toFixed(2)),
      });
    }

    // Add location warnings
    warnings.push(...locationValidation.warnings);

    try {
      const updatedAttendance = await this.attendanceRepository.update(attendance.id, {
        clockOut: clockOutTime,
        locationData: {
          ...(attendance.locationData as any || {}),
          clockOut: clockOutDto.locationData,
        } as any,
        verificationData: {
          ...(attendance.verificationData as any || {}),
          clockOut: clockOutDto.verificationData,
        } as any,
        status: this.determineAttendanceStatusOnClockOut(attendance, timeDiffMinutes, overtimeHours),
        notes: clockOutDto.notes ? 
          `${attendance.notes || ''}\n${clockOutDto.notes}`.trim() : 
          attendance.notes,
      });

      this.logger.log(`Successfully processed clock-out for employee ${clockOutDto.employeeId}`);

      return {
        success: true,
        action: 'CLOCK_OUT' as const,
        timestamp: clockOutTime,
        attendance: updatedAttendance,
        warnings,
        anomalies,
        nextExpectedAction: 'NONE' as const,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`Failed to process clock-out: ${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`Failed to process clock-out: ${errorInfo.message}`);
    }
  }
  /**
   * Find all attendance records with filtering
   */
  async findAll(queryDto: AttendanceQueryDto) {
    this.logger.log('Fetching attendance records with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      employeeId: queryDto.employeeId,
      shiftId: queryDto.shiftId,
      siteId: queryDto.siteId,
      status: queryDto.status,
      dateFrom: queryDto.dateFrom ? new Date(queryDto.dateFrom) : undefined,
      dateTo: queryDto.dateTo ? new Date(queryDto.dateTo) : undefined,
      clockInFrom: queryDto.clockInFrom ? new Date(queryDto.clockInFrom) : undefined,
      clockInTo: queryDto.clockInTo ? new Date(queryDto.clockInTo) : undefined,
      anomaliesOnly: queryDto.anomaliesOnly,
      pendingApproval: queryDto.pendingApproval,
      lateOnly: queryDto.lateOnly,
      earlyDepartureOnly: queryDto.earlyDepartureOnly,
      overtimeOnly: queryDto.overtimeOnly,
    };

    try {
      const result = await this.attendanceRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy,
        queryDto.sortOrder,
      );

      // Calculate additional metrics for each record
      const enrichedAttendance = result.attendance.map(record => ({
        ...record,
        ...this.calculateAttendanceMetrics(record),
      }));

      // Get stats for the current result set
      const stats = await this.attendanceRepository.getStats(
        filters.dateFrom,
        filters.dateTo,
        filters.siteId,
        filters.employeeId,
      );

      this.logger.log(`Found ${result.total} attendance records`);
      return {
        ...result,
        attendance: enrichedAttendance,
        stats,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find attendance record by ID
   */
  async findOne(id: string) {
    this.logger.log(`Fetching attendance record: ${id}`);

    const attendance = await this.attendanceRepository.findById(id);
    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    // Calculate additional metrics
    const metrics = this.calculateAttendanceMetrics(attendance);

    return {
      ...attendance,
      ...metrics,
    };
  }

  /**
   * Update attendance record
   */
  async update(id: string, updateAttendanceDto: UpdateAttendanceDto): Promise<Attendance> {
    this.logger.log(`Updating attendance record: ${id}`);

    // Get current record
    const currentRecord = await this.findOne(id);

    // Validate update permissions and data
    await this.validateAttendanceUpdate(currentRecord, updateAttendanceDto);

    try {
      const updateData: any = {
        ...updateAttendanceDto,
      };

      // Handle timestamp updates
      if (updateAttendanceDto.clockIn) {
        updateData.clockIn = new Date(updateAttendanceDto.clockIn);
      }
      if (updateAttendanceDto.clockOut) {
        updateData.clockOut = new Date(updateAttendanceDto.clockOut);
      }

      // Add modification log if provided
      if (updateAttendanceDto.modificationReason) {
        const modificationEntry = {
          ...updateAttendanceDto.modificationReason,
          timestamp: new Date().toISOString(),
          modifiedBy: updateAttendanceDto.modificationReason.modifiedBy || 
                     this.tenantContext.getUserId() || 'system',
        };

        const currentVerificationData = currentRecord.verificationData as any || {};
        updateData.verificationData = {
          ...currentVerificationData,
          modifications: [
            ...(currentVerificationData.modifications || []),
            modificationEntry,
          ],
        };
        
        delete updateData.modificationReason;
      }

      const updatedRecord = await this.attendanceRepository.update(id, updateData);
      this.logger.log(`Successfully updated attendance record: ${id}`);

      return updatedRecord;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to update attendance record: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update attendance record: ${getErrorMessage(error)}`);
    }
  }
  /**
   * Request attendance correction
   */
  async requestCorrection(
    attendanceId: string, 
    correctionDto: AttendanceCorrectionDto,
  ) {
    this.logger.log(`Requesting correction for attendance: ${attendanceId}`);

    const attendance = await this.findOne(attendanceId);
    
    // Validate correction request
    await this.validateCorrectionRequest(attendance, correctionDto);

    try {
      const correctionRequest = {
        type: correctionDto.correctionType,
        reason: correctionDto.reason,
        requestedBy: this.tenantContext.getUserId() || 'system',
        requestedAt: new Date().toISOString(),
        originalData: {
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut,
          status: attendance.status,
          locationData: attendance.locationData,
        },
        requestedChanges: {
          ...(correctionDto.correctedClockIn && {
            clockIn: new Date(correctionDto.correctedClockIn),
          }),
          ...(correctionDto.correctedClockOut && {
            clockOut: new Date(correctionDto.correctedClockOut),
          }),
          ...(correctionDto.correctedLocationData && {
            locationData: correctionDto.correctedLocationData,
          }),
        },
        supportingEvidence: correctionDto.supportingEvidence || [],
        approvalStatus: correctionDto.emergencyOverride ? 'APPROVED' : 'PENDING',
        emergencyOverride: correctionDto.emergencyOverride || false,
      };

      const currentVerificationData = attendance.verificationData as any || {};
      const updatedRecord = await this.attendanceRepository.update(attendanceId, {
        verificationData: {
          ...currentVerificationData,
          correctionRequests: [
            ...(currentVerificationData.correctionRequests || []),
            correctionRequest,
          ],
          flags: {
            ...currentVerificationData.flags,
            hasPendingCorrection: !correctionDto.emergencyOverride,
            requiresApproval: !correctionDto.emergencyOverride,
          },
        } as any,
        ...(correctionDto.emergencyOverride && {
          // Apply corrections immediately for emergency overrides
          ...(correctionDto.correctedClockIn && {
            clockIn: new Date(correctionDto.correctedClockIn),
          }),
          ...(correctionDto.correctedClockOut && {
            clockOut: new Date(correctionDto.correctedClockOut),
          }),
        }),
      });

      this.logger.log(`Successfully submitted correction request for attendance: ${attendanceId}`);
      return {
        success: true,
        correctionId: correctionRequest.requestedAt,
        status: correctionRequest.approvalStatus,
        attendance: updatedRecord,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Approve or reject attendance correction
   */
  async processCorrection(
    attendanceId: string,
    correctionId: string,
    approvalDto: AttendanceApprovalDto,
  ) {
    this.logger.log(`Processing correction ${correctionId} for attendance: ${attendanceId}`);

    const attendance = await this.findOne(attendanceId);
    const verificationData = attendance.verificationData as any || {};
    const correctionRequests = verificationData.correctionRequests || [];
    
    const correctionIndex = correctionRequests.findIndex(
      (req: any) => req.requestedAt === correctionId
    );

    if (correctionIndex === -1) {
      throw new NotFoundException('Correction request not found');
    }

    const correctionRequest = correctionRequests[correctionIndex];

    if (correctionRequest.approvalStatus !== 'PENDING') {
      throw new BadRequestException('Correction request has already been processed');
    }

    try {
      // Update correction request
      correctionRequests[correctionIndex] = {
        ...correctionRequest,
        approvalStatus: approvalDto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedBy: this.tenantContext.getUserId() || 'system',
        reviewedAt: new Date().toISOString(),
        reviewComments: approvalDto.comments,
        approvalMetadata: approvalDto.approvalMetadata,
      };

      const updateData: any = {
        verificationData: {
          ...verificationData,
          correctionRequests,
          flags: {
            ...verificationData.flags,
            hasPendingCorrection: false,
            requiresApproval: false,
            lastCorrectionAction: approvalDto.action,
          },
        },
      };

      // Apply approved corrections
      if (approvalDto.action === 'APPROVE') {
        const requestedChanges = correctionRequest.requestedChanges;
        if (requestedChanges.clockIn) {
          updateData.clockIn = new Date(requestedChanges.clockIn);
        }
        if (requestedChanges.clockOut) {
          updateData.clockOut = new Date(requestedChanges.clockOut);
        }
        if (requestedChanges.locationData) {
          updateData.locationData = requestedChanges.locationData;
        }

        // Recalculate status based on corrected times
        if (updateData.clockIn || updateData.clockOut) {
          updateData.status = this.recalculateAttendanceStatus(
            updateData.clockIn || attendance.clockIn,
            updateData.clockOut || attendance.clockOut,
            attendance.shift,
          );
        }
      }

      const updatedRecord = await this.attendanceRepository.update(attendanceId, updateData);

      this.logger.log(`Successfully processed correction for attendance: ${attendanceId}`);
      return {
        success: true,
        action: approvalDto.action,
        attendance: updatedRecord,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  /**
   * Detect attendance anomalies
   */
  async detectAnomalies(queryDto: AttendanceAnomalyQueryDto) {
    this.logger.log('Detecting attendance anomalies', { queryDto });

    try {
      const anomalies = await this.attendanceRepository.detectAnomalies(
        queryDto.dateFrom ? new Date(queryDto.dateFrom) : undefined,
        queryDto.dateTo ? new Date(queryDto.dateTo) : undefined,
        queryDto.anomalyTypes,
        queryDto.employeeId,
        queryDto.siteId,
      );

      // Filter by minimum severity if specified
      const filteredAnomalies = queryDto.minSeverity
        ? anomalies.filter(anomaly => this.compareSeverity(anomaly.severity, queryDto.minSeverity!) >= 0)
        : anomalies;

      // Paginate results
      const startIndex = ((queryDto.page || 1) - 1) * (queryDto.limit || 20);
      const endIndex = startIndex + (queryDto.limit || 20);
      const paginatedAnomalies = filteredAnomalies.slice(startIndex, endIndex);

      this.logger.log(`Detected ${filteredAnomalies.length} anomalies`);
      return {
        anomalies: paginatedAnomalies,
        total: filteredAnomalies.length,
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
        summary: {
          totalAnomalies: filteredAnomalies.length,
          bySeverity: this.groupAnomaliesBySeverity(filteredAnomalies),
          byType: this.groupAnomaliesByType(filteredAnomalies),
        },
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get attendance statistics
   */
  async getStats(
    dateFrom?: string,
    dateTo?: string,
    siteId?: string,
    employeeId?: string,
  ) {
    this.logger.log('Fetching attendance statistics');

    try {
      const stats = await this.attendanceRepository.getStats(
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
        siteId,
        employeeId,
      );

      this.logger.log('Successfully fetched attendance statistics');
      return stats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Bulk update attendance records
   */
  async bulkUpdate(bulkUpdateDto: BulkAttendanceUpdateDto) {
    this.logger.log(`Processing bulk update for ${bulkUpdateDto.attendanceIds.length} records`);

    // Validate that all records exist and belong to tenant
    const records = await Promise.all(
      bulkUpdateDto.attendanceIds.map(id => this.findOne(id).catch(() => null))
    );

    const validRecords = records.filter(Boolean);
    if (validRecords.length !== bulkUpdateDto.attendanceIds.length) {
      throw new BadRequestException('Some attendance records were not found or access denied');
    }

    try {
      let updateData: any = {};

      switch (bulkUpdateDto.operation) {
        case 'UPDATE_STATUS':
          if (!bulkUpdateDto.newStatus) {
            throw new BadRequestException('New status is required for status updates');
          }
          updateData = { status: bulkUpdateDto.newStatus };
          break;

        case 'APPROVE_CORRECTIONS':
          updateData = {
            verificationData: {
              flags: { requiresApproval: false, hasPendingCorrection: false }
            }
          };
          break;

        case 'REJECT_CORRECTIONS':
          updateData = {
            verificationData: {
              flags: { requiresApproval: false, hasPendingCorrection: false }
            }
          };
          break;

        case 'BULK_EDIT':
          updateData = bulkUpdateDto.updateData || {};
          break;

        default:
          throw new BadRequestException('Invalid bulk operation');
      }

      // Add bulk operation metadata
      const bulkMetadata = {
        bulkOperation: bulkUpdateDto.operation,
        reason: bulkUpdateDto.reason,
        processedBy: this.tenantContext.getUserId() || 'system',
        processedAt: new Date().toISOString(),
        recordCount: bulkUpdateDto.attendanceIds.length,
      };

      updateData.verificationData = {
        ...updateData.verificationData,
        bulkOperations: bulkMetadata,
      };

      const result = await this.attendanceRepository.bulkUpdate(
        bulkUpdateDto.attendanceIds,
        updateData,
      );

      this.logger.log(`Successfully processed bulk update for ${result.count} records`);
      return {
        success: true,
        operation: bulkUpdateDto.operation,
        updatedCount: result.count,
        reason: bulkUpdateDto.reason,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate attendance data before creation
   */
  private async validateAttendanceData(dto: CreateAttendanceDto): Promise<AttendanceValidationResult> {
    const warnings: string[] = [];
    const anomalies: any[] = [];
    const autoCorrections: any[] = [];

    // Validate employee exists and is active
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        companyId: this.tenantContext.getTenantId(),
        employmentStatus: 'ACTIVE',
      },
    });

    if (!employee) {
      warnings.push('Employee not found or not active');
      return { isValid: false, warnings, anomalies, autoCorrections };
    }

    // Validate shift exists and is assigned to employee
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: dto.shiftId,
        OR: [
          { assignmentId: null }, // Unassigned shift
          {
            assignment: {
              employeeId: dto.employeeId,
              status: AssignmentStatus.ACTIVE,
            },
          },
        ],
        site: {
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
        },
      },
      include: {
        site: true,
        assignment: true,
      },
    });

    if (!shift) {
      warnings.push('Shift not found or employee not assigned to this shift');
      return { isValid: false, warnings, anomalies, autoCorrections };
    }

    // Validate clock times if provided
    if (dto.clockIn && dto.clockOut) {
      const clockIn = new Date(dto.clockIn);
      const clockOut = new Date(dto.clockOut);

      if (clockOut <= clockIn) {
        warnings.push('Clock-out time must be after clock-in time');
        return { isValid: false, warnings, anomalies, autoCorrections };
      }

      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      if (hoursWorked > this.MAX_SHIFT_HOURS) {
        warnings.push(`Shift duration exceeds maximum allowed (${this.MAX_SHIFT_HOURS} hours)`);
        anomalies.push({
          type: 'EXCESSIVE_HOURS',
          severity: 'HIGH',
          hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        });
      }
    }

    return { isValid: true, warnings, anomalies, autoCorrections };
  }

  /**
   * Validate shift and employee for clock operations
   */
  private async validateShiftAndEmployee(shiftId: string, employeeId: string) {
    // Get shift with full details
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: shiftId,
        site: {
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
        },
      },
      include: {
        assignment: {
          include: {
            employee: true,
          },
        },
        site: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found or access denied');
    }

    // Validate shift is not completed or cancelled
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('Cannot clock in/out for completed or cancelled shifts');
    }

    // Get employee
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: this.tenantContext.getTenantId(),
        employmentStatus: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found or not active');
    }

    // Check if employee is assigned to this shift
    let assignment = shift.assignment;
    if (!assignment || assignment.employeeId !== employeeId) {
      // Check for active assignment to this site
      assignment = await this.prisma.assignment.findFirst({
        where: {
          employeeId,
          siteId: shift.siteId,
          status: AssignmentStatus.ACTIVE,
          startDate: { lte: shift.shiftDate },
          OR: [
            { endDate: null },
            { endDate: { gte: shift.shiftDate } },
          ],
        },
        include: {
          employee: true,
        },
      });

      if (!assignment) {
        throw new BadRequestException('Employee is not assigned to this shift or site');
      }
    }

    return { shift, employee, assignment };
  }

  /**
   * Validate location against site requirements
   */
  private async validateLocation(
    locationData: any,
    siteAddress: any,
  ): Promise<LocationValidationResult> {
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      return {
        isValid: true,
        warnings: ['Location verification not provided'],
      };
    }

    if (!siteAddress || !siteAddress.latitude || !siteAddress.longitude) {
      return {
        isValid: true,
        warnings: ['Site location not configured for verification'],
      };
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      locationData.latitude,
      locationData.longitude,
      siteAddress.latitude,
      siteAddress.longitude,
    );

    const warnings: string[] = [];

    if (distance > this.LOCATION_THRESHOLD_METERS) {
      warnings.push(`Location is ${Math.round(distance)}m from site (threshold: ${this.LOCATION_THRESHOLD_METERS}m)`);
    }

    if (locationData.accuracy && locationData.accuracy > 50) {
      warnings.push(`Location accuracy is low (${locationData.accuracy}m)`);
    }

    return {
      isValid: distance <= this.LOCATION_THRESHOLD_METERS * 2, // Allow 2x threshold as "valid"
      distance,
      accuracy: locationData.accuracy,
      warnings,
    };
  }
  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
             Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Determine attendance status based on input data
   */
  private determineAttendanceStatus(dto: CreateAttendanceDto): AttendanceStatus {
    if (!dto.clockIn && !dto.clockOut) {
      return AttendanceStatus.PENDING;
    }

    if (dto.clockIn && !dto.clockOut) {
      return AttendanceStatus.PRESENT;
    }

    if (dto.clockIn && dto.clockOut) {
      // Status will be calculated based on timing in clock-in/out methods
      return AttendanceStatus.PRESENT;
    }

    return AttendanceStatus.PENDING;
  }

  /**
   * Determine attendance status on clock-out
   */
  private determineAttendanceStatusOnClockOut(
    attendance: any,
    earlyDepartureMinutes: number,
    overtimeHours: number,
  ): AttendanceStatus {
    if (earlyDepartureMinutes > this.GRACE_PERIOD_MINUTES) {
      return AttendanceStatus.EARLY_DEPARTURE;
    }

    if (overtimeHours > 0.1) {
      return AttendanceStatus.OVERTIME;
    }

    // Check if was late on arrival
    if (attendance.status === AttendanceStatus.LATE) {
      return AttendanceStatus.LATE;
    }

    return AttendanceStatus.PRESENT;
  }

  /**
   * Recalculate attendance status based on corrected times
   */
  private recalculateAttendanceStatus(clockIn: Date, clockOut: Date | null, shift: any): AttendanceStatus {
    if (!clockIn) {
      return AttendanceStatus.ABSENT;
    }

    const shiftStart = this.combineDateTime(shift.shiftDate, shift.startTime);
    const lateMinutes = (clockIn.getTime() - shiftStart.getTime()) / (1000 * 60);

    if (!clockOut) {
      return lateMinutes > this.GRACE_PERIOD_MINUTES ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }

    const shiftEnd = this.combineDateTime(shift.shiftDate, shift.endTime);
    const earlyMinutes = (shiftEnd.getTime() - clockOut.getTime()) / (1000 * 60);
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
    const overtimeHours = Math.max(0, hoursWorked - scheduledHours);

    if (earlyMinutes > this.GRACE_PERIOD_MINUTES) {
      return AttendanceStatus.EARLY_DEPARTURE;
    }

    if (overtimeHours > 0.1) {
      return AttendanceStatus.OVERTIME;
    }

    if (lateMinutes > this.GRACE_PERIOD_MINUTES) {
      return AttendanceStatus.LATE;
    }

    return AttendanceStatus.PRESENT;
  }

  /**
   * Calculate attendance metrics
   */
  private calculateAttendanceMetrics(attendance: any) {
    if (!attendance.shift) {
      return {};
    }

    const shiftStart = this.combineDateTime(attendance.shift.shiftDate, attendance.shift.startTime);
    const shiftEnd = this.combineDateTime(attendance.shift.shiftDate, attendance.shift.endTime);

    const metrics: any = {};

    // Calculate late arrival
    if (attendance.clockIn) {
      const lateMinutes = Math.max(0, (attendance.clockIn.getTime() - shiftStart.getTime()) / (1000 * 60));
      metrics.isLate = lateMinutes > this.GRACE_PERIOD_MINUTES;
      metrics.minutesLate = metrics.isLate ? Math.ceil(lateMinutes) : 0;
    }

    // Calculate early departure
    if (attendance.clockOut) {
      const earlyMinutes = Math.max(0, (shiftEnd.getTime() - attendance.clockOut.getTime()) / (1000 * 60));
      metrics.isEarlyDeparture = earlyMinutes > this.GRACE_PERIOD_MINUTES;
      metrics.minutesEarlyDeparture = metrics.isEarlyDeparture ? Math.ceil(earlyMinutes) : 0;
    }

    // Calculate hours worked and overtime
    if (attendance.clockIn && attendance.clockOut) {
      const hoursWorked = (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60);
      const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - scheduledHours);

      metrics.hoursWorked = parseFloat(hoursWorked.toFixed(2));
      metrics.overtimeHours = parseFloat(overtimeHours.toFixed(2));
    }

    return metrics;
  }

  /**
   * Combine date and time into a single DateTime
   */
  private combineDateTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    return combined;
  }

  /**
   * Calculate severity for late arrivals
   */
  private calculateLateSeverity(minutes: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (minutes <= 15) return 'LOW';
    if (minutes <= 30) return 'MEDIUM';
    if (minutes <= 60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Calculate severity for early departures
   */
  private calculateEarlySeverity(minutes: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (minutes <= 15) return 'LOW';
    if (minutes <= 30) return 'MEDIUM';
    if (minutes <= 60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(severity1: string, severity2: string): number {
    const levels = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return (levels as any)[severity1] - (levels as any)[severity2];
  }

  /**
   * Group anomalies by severity
   */
  private groupAnomaliesBySeverity(anomalies: any[]) {
    return anomalies.reduce((acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Group anomalies by type
   */
  private groupAnomaliesByType(anomalies: any[]) {
    return anomalies.reduce((acc, anomaly) => {
      acc[anomaly.anomalyType] = (acc[anomaly.anomalyType] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Validate attendance update permissions and data
   */
  private async validateAttendanceUpdate(currentRecord: any, updateDto: UpdateAttendanceDto) {
    // Add validation logic here if needed
    // For now, allow all updates (permissions are handled by guards)
  }

  /**
   * Validate correction request
   */
  private async validateCorrectionRequest(attendance: any, correctionDto: AttendanceCorrectionDto) {
    // Validate correction type matches available data
    if (correctionDto.correctionType === 'CLOCK_IN' && !correctionDto.correctedClockIn) {
      throw new BadRequestException('Corrected clock-in time is required for CLOCK_IN correction');
    }

    if (correctionDto.correctionType === 'CLOCK_OUT' && !correctionDto.correctedClockOut) {
      throw new BadRequestException('Corrected clock-out time is required for CLOCK_OUT correction');
    }

    if (correctionDto.correctionType === 'BOTH') {
      if (!correctionDto.correctedClockIn || !correctionDto.correctedClockOut) {
        throw new BadRequestException('Both corrected clock-in and clock-out times are required for BOTH correction');
      }
    }

    // Validate time logic
    if (correctionDto.correctedClockIn && correctionDto.correctedClockOut) {
      const clockIn = new Date(correctionDto.correctedClockIn);
      const clockOut = new Date(correctionDto.correctedClockOut);

      if (clockOut <= clockIn) {
        throw new BadRequestException('Corrected clock-out must be after clock-in');
      }

      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      if (hoursWorked > this.MAX_SHIFT_HOURS) {
        throw new BadRequestException(`Corrected shift duration exceeds maximum allowed (${this.MAX_SHIFT_HOURS} hours)`);
      }
    }
  }

  /**
   * Update shift coverage when attendance is created
   */
  private async updateShiftCoverage(shiftId: string) {
    // This would update the shift's coverage statistics
    // Implementation depends on business requirements
    this.logger.log(`Updating coverage for shift: ${shiftId}`);
  }
}
