import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ShiftRepository } from '../common/repositories/shift.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateShiftDto,
  UpdateShiftDto,
  ShiftQueryDto,
  BulkShiftDto,
  ShiftNotificationResponseDto as ShiftNotificationDto,
} from './dto';
import { 
  Shift, 
  ShiftStatus, 
  ShiftType, 
  ShiftPriority,
  NotificationType 
} from '@prisma/client';
import { ShiftPriority as DtoShiftPriority } from './dto/create-shift.dto';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';


export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface RecurringShiftOptions {
  endDate?: Date;
  occurrences?: number;
  skipWeekends?: boolean;
  skipHolidays?: boolean;
  customExclusions?: Date[];
}

export interface CoverageRequest {
  shiftId: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredSkills?: string[];
  preferredEmployees?: string[];
  reason?: string;
  deadline?: Date;
}

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new shift with comprehensive validation
   */
  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    this.logger.log(`Creating shift for site ${createShiftDto.siteId} on ${createShiftDto.shiftDate}`);

    // Validate shift data
    await this.validateShiftData(createShiftDto);

    // Check for conflicts if assignment is specified
    if (createShiftDto.assignmentId) {
      await this.checkShiftConflicts(createShiftDto);
    }

    try {
      const shiftData = {
        assignment: createShiftDto.assignmentId ? {
          connect: { id: createShiftDto.assignmentId }
        } : undefined,
        site: {
          connect: { id: createShiftDto.siteId }
        },
        template: createShiftDto.templateId ? {
          connect: { id: createShiftDto.templateId }
        } : undefined,
        shiftDate: new Date(createShiftDto.shiftDate),
        startTime: createShiftDto.startTime,
        endTime: createShiftDto.endTime,
        shiftType: createShiftDto.shiftType || ShiftType.REGULAR,
        status: ShiftStatus.SCHEDULED,
        priority: createShiftDto.priority || DtoShiftPriority.NORMAL,
        isRecurring: createShiftDto.isRecurring || false,
        recurringPattern: createShiftDto.recurringPattern as any,
        coverageRequired: createShiftDto.coverageRequired || 1,
        coverageAssigned: createShiftDto.assignmentId ? 1 : 0,
        skillRequirements: createShiftDto.skillRequirements as any,
        shiftRequirements: createShiftDto.shiftRequirements as any,
        breakSchedule: createShiftDto.breakSchedule as any,
        notes: createShiftDto.notes as any,
        modificationLog: [{
          timestamp: new Date().toISOString(),
          action: 'CREATED',
          createdBy: this.tenantContext.getUserId() || 'system',
        }] as any,
      };

      const shift = await this.shiftRepository.create(shiftData);
      this.logger.log(`Successfully created shift: ${shift.id}`);

      // Handle recurring shift creation
      if (createShiftDto.isRecurring && createShiftDto.recurringPattern) {
        await this.createRecurringShifts(shift, createShiftDto.recurringPattern);
      }

      // Send notifications
      await this.sendShiftNotifications(shift, NotificationType.SHIFT_ASSIGNED);

      return shift;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Create multiple shifts from a template or bulk operation
   */
  async createBulkShifts(bulkShiftDto: BulkShiftDto): Promise<{ created: Shift[], errors: any[] }> {
    this.logger.log(`Creating bulk shifts`, { 
      count: bulkShiftDto.shifts?.length || bulkShiftDto.dateRange ? 'date-range' : 'unknown' 
    });

    const created: Shift[] = [];
    const errors: any[] = [];

    try {
      if (bulkShiftDto.shifts) {
        // Create individual shifts
        for (const shiftDto of bulkShiftDto.shifts) {
          try {
            const shift = await this.create(shiftDto);
            created.push(shift);
          } catch (error) {
            errors.push({
              shiftData: shiftDto,
              error: getErrorMessage(error),
            });
          }
        }
      } else if (bulkShiftDto.templateId && bulkShiftDto.dateRange) {
        // Create shifts from template for date range
        const template = await this.getShiftTemplate(bulkShiftDto.templateId);
        const dates = this.generateDateRange(
          bulkShiftDto.dateRange.startDate,
          bulkShiftDto.dateRange.endDate,
          bulkShiftDto.dateRange.daysOfWeek
        );

        for (const date of dates) {
          try {
            const shiftDto: CreateShiftDto = {
              siteId: template.siteId || bulkShiftDto.siteId!,
              templateId: template.id,
              shiftDate: date.toISOString().split('T')[0],
              startTime: template.startTime,
              endTime: template.endTime,
              shiftType: template.shiftType,
              priority: DtoShiftPriority.NORMAL,
              coverageRequired: template.coverageRequired,
              skillRequirements: template.skillRequirements as any,
              shiftRequirements: template.shiftRequirements as any,
              breakSchedule: template.breakSchedule as any,
            };

            const shift = await this.create(shiftDto);
            created.push(shift);
          } catch (error) {
            errors.push({
              date: date.toISOString().split('T')[0],
              error: getErrorMessage(error),
            });
          }
        }
      }

      this.logger.log(`Bulk shift creation completed. Created: ${created.length}, Errors: ${errors.length}`);

      return { created, errors };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find all shifts with advanced filtering
   */
  async findAll(queryDto: ShiftQueryDto) {
    this.logger.log('Fetching shifts list with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      assignmentId: queryDto.assignmentId,
      siteId: queryDto.siteId,
      status: queryDto.status,
      shiftType: queryDto.shiftType,
      priority: queryDto.priority,
      dateFrom: queryDto.dateFrom ? new Date(queryDto.dateFrom) : undefined,
      dateTo: queryDto.dateTo ? new Date(queryDto.dateTo) : undefined,
      isRecurring: queryDto.isRecurring,
      coverageNeeded: queryDto.coverageNeeded,
      templateId: queryDto.templateId,
      skillRequirements: queryDto.skillRequirements,
      minCoverage: queryDto.minCoverage,
      maxCoverage: queryDto.maxCoverage,
      includeCompleted: queryDto.includeCompleted,
      includeCancelled: queryDto.includeCancelled,
    };

    try {
      const result = await this.shiftRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy,
        queryDto.sortOrder,
      );

      // Add coverage statistics
      const stats = await this.calculateCoverageStats(result.shifts);

      this.logger.log(`Found ${result.total} shifts`);
      return {
        ...result,
        stats,
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find shift by ID
   */
  async findOne(id: string): Promise<Shift> {
    this.logger.log(`Fetching shift: ${id}`);

    const shift = await this.shiftRepository.findById(id);
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return shift;
  }

  /**
   * Update shift with modification tracking
   */
  async update(id: string, updateShiftDto: UpdateShiftDto): Promise<Shift> {
    this.logger.log(`Updating shift: ${id}`);

    // Get current shift
    const currentShift = await this.findOne(id);

    // Validate update data
    await this.validateShiftUpdate(currentShift, updateShiftDto);

    // Check for conflicts if assignment or time is being changed
    if (updateShiftDto.assignmentId || updateShiftDto.startTime || updateShiftDto.endTime) {
      await this.checkShiftConflicts({
        assignmentId: updateShiftDto.assignmentId || currentShift.assignmentId || undefined,
        siteId: currentShift.siteId,
        shiftDate: currentShift.shiftDate.toISOString().split('T')[0],
        startTime: updateShiftDto.startTime || currentShift.startTime,
        endTime: updateShiftDto.endTime || currentShift.endTime,
      } as CreateShiftDto, id);
    }

    try {
      const updateData: any = {
        ...updateShiftDto,
      };

      // Handle date conversion
      if (updateShiftDto.shiftDate) {
        updateData.shiftDate = new Date(updateShiftDto.shiftDate);
      }

      // Handle assignment changes
      if (updateShiftDto.assignmentId !== undefined) {
        if (updateShiftDto.assignmentId) {
          updateData.assignment = { connect: { id: updateShiftDto.assignmentId } };
          updateData.coverageAssigned = (currentShift.coverageAssigned || 0) + 1;
        } else {
          updateData.assignment = { disconnect: true };
          updateData.coverageAssigned = Math.max((currentShift.coverageAssigned || 1) - 1, 0);
        }
        delete updateData.assignmentId;
      }

      // Add modification log
      if (updateShiftDto.modificationReason) {
        const modificationEntry = {
          ...updateShiftDto.modificationReason,
          timestamp: new Date().toISOString(),
        };

        const currentLog = Array.isArray(currentShift.modificationLog) 
          ? currentShift.modificationLog 
          : [];
        
        updateData.modificationLog = [...currentLog, modificationEntry];
        delete updateData.modificationReason;
      }

      const updatedShift = await this.shiftRepository.update(id, updateData);
      this.logger.log(`Successfully updated shift: ${id}`);

      // Handle status change notifications
      if (updateShiftDto.status && updateShiftDto.status !== currentShift.status) {
        await this.handleStatusChange(updatedShift, currentShift.status, updateShiftDto.status);
      }

      return updatedShift;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update shift: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update shift: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Cancel shift
   */
  async remove(id: string, reason?: string): Promise<Shift> {
    this.logger.log(`Cancelling shift: ${id}`);

    const shift = await this.findOne(id);

    try {
      const cancelledShift = await this.shiftRepository.update(id, {
        status: ShiftStatus.CANCELLED,
        modificationLog: [{
          timestamp: new Date().toISOString(),
          action: 'CANCELLED',
          reason: reason || 'Shift cancelled',
          cancelledBy: this.tenantContext.getUserId() || 'system',
        }] as any,
      });

      this.logger.log(`Successfully cancelled shift: ${id}`);

      // Send cancellation notifications
      await this.sendShiftNotifications(cancelledShift, NotificationType.SHIFT_CANCELLED);

      return cancelledShift;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get shifts by assignment
   */
  async findByAssignment(assignmentId: string): Promise<Shift[]> {
    this.logger.log(`Finding shifts for assignment: ${assignmentId}`);

    try {
      const shifts = await this.shiftRepository.findByAssignmentId(assignmentId);
      this.logger.log(`Found ${shifts.length} shifts for assignment: ${assignmentId}`);
      return shifts;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get shifts by site
   */
  async findBySite(siteId: string, dateFrom?: string, dateTo?: string): Promise<Shift[]> {
    this.logger.log(`Finding shifts for site: ${siteId}`);

    try {
      const shifts = await this.shiftRepository.findBySiteId(
        siteId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );
      this.logger.log(`Found ${shifts.length} shifts for site: ${siteId}`);
      return shifts;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get shifts needing coverage
   */
  async getShiftsNeedingCoverage(): Promise<Shift[]> {
    this.logger.log('Finding shifts needing coverage');

    try {
      const shifts = await this.shiftRepository.findShiftsNeedingCoverage();
      this.logger.log(`Found ${shifts.length} shifts needing coverage`);
      return shifts;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Request coverage for a shift
   */
  async requestCoverage(coverageRequest: CoverageRequest): Promise<void> {
    this.logger.log(`Requesting coverage for shift: ${coverageRequest.shiftId}`);

    try {
      const shift = await this.findOne(coverageRequest.shiftId);

      // Update shift status to needs coverage
      await this.shiftRepository.update(coverageRequest.shiftId, {
        status: ShiftStatus.NEEDS_COVERAGE,
        modificationLog: [{
          timestamp: new Date().toISOString(),
          action: 'COVERAGE_REQUESTED',
          reason: coverageRequest.reason || 'Coverage requested',
          urgency: coverageRequest.urgency,
          requestedBy: this.tenantContext.getUserId() || 'system',
        }] as any,
      });

      // Send coverage request notifications
      await this.sendCoverageRequestNotifications(shift, coverageRequest);

      this.logger.log(`Successfully requested coverage for shift: ${coverageRequest.shiftId}`);
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get shift statistics
   */
  async getStats(dateFrom?: string, dateTo?: string) {
    this.logger.log('Fetching shift statistics');

    try {
      const stats = await this.shiftRepository.getShiftStats(
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );

      this.logger.log('Successfully fetched shift statistics', stats);
      return stats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Validate shift data before creation
   */
  private async validateShiftData(shiftDto: CreateShiftDto): Promise<void> {
    const shiftDate = new Date(shiftDto.shiftDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate shift date is not in the past
    if (shiftDate < today) {
      throw new BadRequestException('Shift date cannot be in the past');
    }

    // Validate time format and logic
    if (shiftDto.startTime >= shiftDto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate coverage requirements
    if (shiftDto.coverageRequired && shiftDto.coverageRequired < 1) {
      throw new BadRequestException('Coverage required must be at least 1');
    }

    // Validate site exists and belongs to tenant
    const site = await this.prisma.site.findFirst({
      where: {
        id: shiftDto.siteId,
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found or access denied');
    }

    // Validate assignment if specified
    if (shiftDto.assignmentId) {
      const assignment = await this.prisma.assignment.findFirst({
        where: {
          id: shiftDto.assignmentId,
          siteId: shiftDto.siteId,
          employee: {
            companyId: this.tenantContext.getTenantId(),
          },
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found or not active');
      }
    }
  }

  /**
   * Validate shift update
   */
  private async validateShiftUpdate(currentShift: Shift, updateDto: UpdateShiftDto): Promise<void> {
    // Validate completed or cancelled shifts cannot be modified (except status changes)
    if (currentShift.status === ShiftStatus.COMPLETED && updateDto.status !== ShiftStatus.COMPLETED) {
      throw new BadRequestException('Cannot modify completed shifts');
    }

    // Validate date changes
    if (updateDto.shiftDate) {
      const newShiftDate = new Date(updateDto.shiftDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (newShiftDate < today) {
        throw new BadRequestException('Cannot move shift to past date');
      }
    }

    // Validate time changes
    if (updateDto.startTime && updateDto.endTime) {
      if (updateDto.startTime >= updateDto.endTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Validate assignment changes
    if (updateDto.assignmentId) {
      const assignment = await this.prisma.assignment.findFirst({
        where: {
          id: updateDto.assignmentId,
          siteId: currentShift.siteId,
          employee: {
            companyId: this.tenantContext.getTenantId(),
          },
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found or not active');
      }
    }
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkShiftConflicts(shiftDto: CreateShiftDto, excludeShiftId?: string): Promise<void> {
    if (!shiftDto.assignmentId) return;

    const conflicts = await this.shiftRepository.detectShiftConflicts(
      shiftDto.assignmentId,
      new Date(shiftDto.shiftDate),
      shiftDto.startTime,
      shiftDto.endTime,
      excludeShiftId,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Shift conflicts detected with ${conflicts.length} existing shift(s). ` +
        `Conflicting shifts: ${conflicts.map(s => `${s.site?.name} on ${s.shiftDate}`).join(', ')}`
      );
    }
  }

  /**
   * Create recurring shifts based on pattern
   */
  private async createRecurringShifts(
    baseShift: Shift, 
    pattern: any,
    options?: RecurringShiftOptions
  ): Promise<Shift[]> {
    this.logger.log(`Creating recurring shifts for pattern: ${pattern.type}`);

    const recurringShifts: Shift[] = [];
    const startDate = new Date(baseShift.shiftDate);
    const maxOccurrences = options?.occurrences || pattern.occurrences || 52; // Default 1 year
    const endDate = options?.endDate || (pattern.endDate ? new Date(pattern.endDate) : null);

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    while (occurrenceCount < maxOccurrences) {
      // Calculate next occurrence based on pattern type
      switch (pattern.type) {
        case RecurrenceType.DAILY:
          currentDate.setDate(currentDate.getDate() + (pattern.interval || 1));
          break;
        case RecurrenceType.WEEKLY:
          currentDate.setDate(currentDate.getDate() + 7 * (pattern.interval || 1));
          break;
        case RecurrenceType.BIWEEKLY:
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case RecurrenceType.MONTHLY:
          currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1));
          break;
        case RecurrenceType.CUSTOM:
          if (pattern.customPattern?.nextDateCalculator) {
            // Custom logic would be implemented here
            currentDate.setDate(currentDate.getDate() + 7); // Fallback to weekly
          }
          break;
      }

      // Check if we've reached the end date
      if (endDate && currentDate > endDate) {
        break;
      }

      // Skip weekends if requested
      if (options?.skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        continue;
      }

      // Skip custom exclusions
      if (options?.customExclusions?.some(exclusion => 
        exclusion.toDateString() === currentDate.toDateString())) {
        continue;
      }

      try {
        // Create shift for this occurrence
        const recurringShiftData = {
          assignment: baseShift.assignmentId ? {
            connect: { id: baseShift.assignmentId }
          } : undefined,
          site: {
            connect: { id: baseShift.siteId }
          },
          template: baseShift.templateId ? {
            connect: { id: baseShift.templateId }
          } : undefined,
          shiftDate: new Date(currentDate),
          startTime: baseShift.startTime,
          endTime: baseShift.endTime,
          shiftType: baseShift.shiftType,
          status: ShiftStatus.SCHEDULED,
          priority: baseShift.priority,
          isRecurring: true,
          recurringPattern: pattern as any,
          coverageRequired: baseShift.coverageRequired,
          coverageAssigned: baseShift.assignmentId ? 1 : 0,
          skillRequirements: baseShift.skillRequirements,
          shiftRequirements: baseShift.shiftRequirements,
          breakSchedule: baseShift.breakSchedule,
          notes: baseShift.notes,
          modificationLog: [{
            timestamp: new Date().toISOString(),
            action: 'CREATED_FROM_RECURRENCE',
            parentShiftId: baseShift.id,
            createdBy: this.tenantContext.getUserId() || 'system',
          }] as any,
        };

        const recurringShift = await this.shiftRepository.create(recurringShiftData);
        recurringShifts.push(recurringShift);
        occurrenceCount++;
      } catch (error) {
        this.logger.warn(`Failed to create recurring shift for ${currentDate.toDateString()}: ${getErrorMessage(error)}`);
        // Continue with next occurrence
      }
    }

    this.logger.log(`Created ${recurringShifts.length} recurring shifts`);
    return recurringShifts;
  }

  /**
   * Handle status changes
   */
  private async handleStatusChange(
    shift: Shift,
    oldStatus: ShiftStatus,
    newStatus: ShiftStatus
  ): Promise<void> {
    this.logger.log(`Handling status change for shift ${shift.id}: ${oldStatus} -> ${newStatus}`);

    // Send appropriate notifications based on status change
    let notificationType: NotificationType;
    
    switch (newStatus) {
      case ShiftStatus.CONFIRMED:
        notificationType = NotificationType.SHIFT_ASSIGNED;
        break;
      case ShiftStatus.CANCELLED:
        notificationType = NotificationType.SHIFT_CANCELLED;
        break;
      case ShiftStatus.NEEDS_COVERAGE:
        notificationType = NotificationType.COVERAGE_REQUEST;
        break;
      default:
        notificationType = NotificationType.SHIFT_CHANGED;
        break;
    }

    await this.sendShiftNotifications(shift, notificationType);
  }

  /**
   * Send shift notifications
   */
  private async sendShiftNotifications(shift: Shift, type: NotificationType): Promise<void> {
    // Implementation would depend on notification service
    this.logger.log(`Sending ${type} notification for shift: ${shift.id}`);
    
    // This would integrate with the notification system
    // For now, just log the notification
  }

  /**
   * Send coverage request notifications
   */
  private async sendCoverageRequestNotifications(
    shift: Shift, 
    coverageRequest: CoverageRequest
  ): Promise<void> {
    this.logger.log(`Sending coverage request notifications for shift: ${shift.id}`);
    
    // This would send notifications to available employees, supervisors, etc.
    // Implementation would depend on notification service
  }

  /**
   * Calculate coverage statistics
   */
  private async calculateCoverageStats(shifts: Shift[]): Promise<any> {
    const totalShifts = shifts.length;
    const scheduledShifts = shifts.filter(s => s.status === ShiftStatus.SCHEDULED).length;
    const completedShifts = shifts.filter(s => s.status === ShiftStatus.COMPLETED).length;
    const cancelledShifts = shifts.filter(s => s.status === ShiftStatus.CANCELLED).length;
    const shiftsNeedingCoverage = shifts.filter(s => 
      s.status === ShiftStatus.NEEDS_COVERAGE || s.coverageAssigned < s.coverageRequired
    ).length;

    const totalCoverageRequired = shifts.reduce((sum, s) => sum + s.coverageRequired, 0);
    const totalCoverageAssigned = shifts.reduce((sum, s) => sum + s.coverageAssigned, 0);
    const coveragePercentage = totalCoverageRequired > 0 
      ? Math.round((totalCoverageAssigned / totalCoverageRequired) * 100)
      : 100;

    return {
      totalShifts,
      scheduledShifts,
      completedShifts,
      cancelledShifts,
      shiftsNeedingCoverage,
      coveragePercentage,
    };
  }

  /**
   * Get shift template
   */
  private async getShiftTemplate(templateId: string) {
    const template = await this.prisma.shiftTemplate.findFirst({
      where: {
        id: templateId,
        companyId: this.tenantContext.getTenantId(),
      },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    return template;
  }

  /**
   * Generate date range for bulk operations
   */
  private generateDateRange(
    startDate: string,
    endDate: string,
    daysOfWeek?: number[]
  ): Date[] {
    const dates: Date[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentDate = new Date(start);

    while (currentDate <= end) {
      if (!daysOfWeek || daysOfWeek.includes(currentDate.getDay())) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
