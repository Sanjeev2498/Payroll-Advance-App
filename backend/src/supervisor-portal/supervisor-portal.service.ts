import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import {
  SupervisorDashboardQueryDto,
  AttendanceApprovalDto,
  EmergencyReplacementDto,
  SiteHealthQueryDto,
  OperationalNotificationQueryDto,
  CreateIncidentDto,
  MusterRollQueryDto,
} from './dto/supervisor-dashboard.dto';

@Injectable()
export class SupervisorPortalService {
  private readonly logger = new Logger(SupervisorPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Get supervisor dashboard overview
   */
  async getDashboardOverview(queryDto: SupervisorDashboardQueryDto, supervisorId: string) {
    this.logger.log(`Getting dashboard overview for supervisor ${supervisorId}`);

    try {
      const targetDate = queryDto.date ? new Date(queryDto.date) : new Date();
      const assignedSites = await this.getAssignedSites(supervisorId, queryDto.siteIds);

      // Get comprehensive dashboard data
      const [
        sitesOverview,
        deploymentStatus,
        attendanceOverview,
        pendingApprovals,
        activeAlerts,
        todayStats,
      ] = await Promise.all([
        this.getSitesOverview(assignedSites.map(s => s.id)),
        this.getDeploymentStatus(assignedSites.map(s => s.id), targetDate),
        this.getAttendanceOverview(assignedSites.map(s => s.id), targetDate),
        this.getPendingApprovals(supervisorId),
        this.getActiveAlerts(assignedSites.map(s => s.id)),
        this.getTodayStatistics(assignedSites.map(s => s.id), targetDate),
      ]);

      return {
        supervisorId,
        targetDate: targetDate.toISOString(),
        assignedSites,
        overview: {
          totalSites: assignedSites.length,
          activeSites: sitesOverview.activeSites,
          totalGuards: deploymentStatus.totalAssigned,
          guardsOnDuty: attendanceOverview.presentCount,
          pendingApprovals: pendingApprovals.length,
          activeAlerts: activeAlerts.length,
        },
        sitesOverview,
        deploymentStatus,
        attendanceOverview,
        pendingApprovals,
        activeAlerts,
        todayStats,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get dashboard overview: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to get dashboard overview: ${errorMessage}`);
    }
  }
  /**
   * Get assigned sites for supervisor
   */
  private async getAssignedSites(supervisorId: string, siteIds?: string[]) {
    const companyId = this.tenantContext.getTenantId();

    let whereClause: any = {
      assignments: {
        some: {
          employee: {
            companyId,
            // For now, we'll get all sites - in a real implementation,
            // we'd have supervisor-site assignments
          }
        }
      }
    };

    if (siteIds?.length) {
      whereClause.id = { in: siteIds };
    }

    const sites = await this.prisma.site.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          }
        },
        assignments: {
          where: {
            status: 'ACTIVE',
            employee: {
              companyId,
            }
          },
          select: {
            id: true,
            role: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
              }
            }
          }
        }
      }
    });

    return sites.map(site => ({
      id: site.id,
      name: site.name,
      address: site.address,
      status: site.operationalStatus,
      client: site.client,
      currentGuards: site.assignments.length,
      assignments: site.assignments,
    }));
  }

  /**
   * Get sites overview with staffing information
   */
  private async getSitesOverview(siteIds: string[]) {
    if (!siteIds.length) return { activeSites: 0, sites: [] };

    const sites = await this.prisma.site.findMany({
      where: {
        id: { in: siteIds },
      },
      include: {
        assignments: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                employmentStatus: true,
              }
            }
          }
        },
        _count: {
          select: {
            shifts: {
              where: {
                shiftDate: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lt: new Date(new Date().setHours(23, 59, 59, 999)),
                }
              }
            }
          }
        }
      }
    });

    const sitesWithMetrics = sites.map(site => {
      const requirements = (site.requirements as any) || {};
      const requiredGuards = requirements.minGuards || requirements.guardCount || 1;
      const currentGuards = site.assignments.length;
      
      return {
        id: site.id,
        name: site.name,
        status: site.operationalStatus,
        requiredGuards,
        currentGuards,
        staffingStatus: this.getStaffingStatus(currentGuards, requiredGuards),
        todayShifts: site._count.shifts,
        assignments: site.assignments,
      };
    });

    return {
      activeSites: sites.filter(s => s.operationalStatus === 'ACTIVE').length,
      sites: sitesWithMetrics,
    };
  }
  /**
   * Get deployment status for sites
   */
  private async getDeploymentStatus(siteIds: string[], date: Date) {
    if (!siteIds.length) return { totalRequired: 0, totalAssigned: 0, deployments: [] };

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const deployments = await this.prisma.site.findMany({
      where: {
        id: { in: siteIds },
      },
      include: {
        assignments: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: endOfDay },
            OR: [
              { endDate: null },
              { endDate: { gte: startOfDay } },
            ]
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                employmentStatus: true,
              }
            },
            shifts: {
              where: {
                shiftDate: {
                  gte: startOfDay,
                  lte: endOfDay,
                }
              },
              include: {
                attendance: {
                  select: {
                    id: true,
                    status: true,
                    clockIn: true,
                    clockOut: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    let totalRequired = 0;
    let totalAssigned = 0;

    const deploymentData = deployments.map(site => {
      const requirements = (site.requirements as any) || {};
      const requiredGuards = requirements.minGuards || requirements.guardCount || 1;
      const assignedGuards = site.assignments.length;
      
      totalRequired += requiredGuards;
      totalAssigned += assignedGuards;

      return {
        siteId: site.id,
        siteName: site.name,
        requiredGuards,
        assignedGuards,
        vacancy: Math.max(requiredGuards - assignedGuards, 0),
        overstaffing: Math.max(assignedGuards - requiredGuards, 0),
        assignments: site.assignments.map(assignment => ({
          id: assignment.id,
          employee: assignment.employee,
          role: assignment.role,
          todayShifts: assignment.shifts.map(shift => ({
            id: shift.id,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: shift.status,
            attendance: shift.attendance[0] || null,
          }))
        }))
      };
    });

    return {
      totalRequired,
      totalAssigned,
      totalVacancy: Math.max(totalRequired - totalAssigned, 0),
      deployments: deploymentData,
    };
  }

  /**
   * Get attendance overview for sites
   */
  private async getAttendanceOverview(siteIds: string[], date: Date) {
    if (!siteIds.length) return { expectedCount: 0, presentCount: 0, lateCount: 0, absentCount: 0, anomalies: [] };

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const attendance = await this.prisma.attendance.findMany({
      where: {
        shift: {
          assignment: {
            siteId: { in: siteIds },
          },
          shiftDate: {
            gte: startOfDay,
            lte: endOfDay,
          }
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            assignment: {
              select: {
                siteId: true,
                site: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get expected attendance (shifts for today)
    const expectedShifts = await this.prisma.shift.count({
      where: {
        assignment: {
          siteId: { in: siteIds },
        },
        shiftDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'CANCELLED' }
      }
    });

    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const absentCount = expectedShifts - attendance.length;

    // Identify anomalies
    const anomalies = attendance.filter(a => 
      ['LATE', 'EARLY_DEPARTURE', 'NO_SHOW', 'MISSED_BREAK'].includes(a.status)
    ).map(anomaly => ({
      attendanceId: anomaly.id,
      employee: anomaly.employee,
      site: anomaly.shift.assignment.site.name,
      type: anomaly.status,
      time: anomaly.clockIn || anomaly.shift.startTime,
      requiresApproval: ['LATE', 'EARLY_DEPARTURE'].includes(anomaly.status),
    }));

    return {
      expectedCount: expectedShifts,
      presentCount,
      lateCount,
      absentCount,
      attendanceRate: expectedShifts > 0 ? Math.round((presentCount / expectedShifts) * 100) : 100,
      anomalies,
    };
  }
  /**
   * Get pending approvals for supervisor
   */
  private async getPendingApprovals(supervisorId: string) {
    // Get attendance corrections pending approval
    const pendingAttendance = await this.prisma.attendance.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        // In a real implementation, we'd filter by supervisor assignments
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          }
        },
        shift: {
          select: {
            id: true,
            shiftDate: true,
            startTime: true,
            endTime: true,
            assignment: {
              select: {
                site: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return pendingAttendance.map(attendance => ({
      type: 'ATTENDANCE_CORRECTION',
      id: attendance.id,
      employee: attendance.employee,
      site: attendance.shift.assignment.site.name,
      date: attendance.shift.shiftDate,
      details: {
        originalClockIn: attendance.clockIn,
        originalClockOut: attendance.clockOut,
        correctionReason: (attendance.verificationData as any)?.correctionReason,
      },
      submittedAt: attendance.updatedAt,
      priority: this.determinePriority(attendance.shift.shiftDate),
    }));
  }

  /**
   * Get active alerts for sites
   */
  private async getActiveAlerts(siteIds: string[]) {
    const alerts = [];
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    if (siteIds.length === 0) return alerts;

    // Check for staffing shortages
    const sites = await this.prisma.site.findMany({
      where: { id: { in: siteIds } },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    sites.forEach(site => {
      const requirements = (site.requirements as any) || {};
      const requiredGuards = requirements.minGuards || requirements.guardCount || 1;
      const currentGuards = site.assignments.length;
      
      if (currentGuards < requiredGuards) {
        alerts.push({
          type: 'STAFFING_SHORTAGE',
          severity: currentGuards === 0 ? 'CRITICAL' : 'HIGH',
          siteId: site.id,
          siteName: site.name,
          message: `Site is short ${requiredGuards - currentGuards} guard(s)`,
          details: { required: requiredGuards, current: currentGuards },
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Check for attendance anomalies
    const attendanceAnomalies = await this.prisma.attendance.findMany({
      where: {
        shift: {
          assignment: {
            siteId: { in: siteIds },
          },
          shiftDate: { gte: todayStart, lte: todayEnd }
        },
        status: { in: ['LATE', 'NO_SHOW', 'EARLY_DEPARTURE'] }
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
          }
        },
        shift: {
          select: {
            assignment: {
              select: {
                site: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    attendanceAnomalies.forEach(anomaly => {
      alerts.push({
        type: 'ATTENDANCE_ANOMALY',
        severity: anomaly.status === 'NO_SHOW' ? 'HIGH' : 'MEDIUM',
        siteId: anomaly.shift.assignment.siteId,
        siteName: anomaly.shift.assignment.site.name,
        message: `${anomaly.employee.firstName} ${anomaly.employee.lastName} - ${anomaly.status.replace('_', ' ').toLowerCase()}`,
        details: { employeeId: anomaly.employeeId, status: anomaly.status },
        timestamp: anomaly.createdAt.toISOString(),
      });
    });

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
  }
  /**
   * Get today's statistics
   */
  private async getTodayStatistics(siteIds: string[], date: Date) {
    if (!siteIds.length) return {};

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const [shiftsCount, attendanceCount, incidentsCount, activeAssignments] = await Promise.all([
      this.prisma.shift.count({
        where: {
          assignment: { siteId: { in: siteIds } },
          shiftDate: { gte: startOfDay, lte: endOfDay }
        }
      }),
      this.prisma.attendance.count({
        where: {
          shift: {
            assignment: { siteId: { in: siteIds } },
            shiftDate: { gte: startOfDay, lte: endOfDay }
          }
        }
      }),
      // Note: This assumes an incidents table exists
      0, // Will be implemented when incident management is added
      this.prisma.assignment.count({
        where: {
          siteId: { in: siteIds },
          status: 'ACTIVE'
        }
      })
    ]);

    return {
      totalShifts: shiftsCount,
      completedAttendance: attendanceCount,
      reportedIncidents: incidentsCount,
      activeAssignments,
      attendanceCompletionRate: shiftsCount > 0 ? Math.round((attendanceCount / shiftsCount) * 100) : 100,
    };
  }

  /**
   * Approve or reject attendance correction
   */
  async processAttendanceApproval(approvalDto: AttendanceApprovalDto, supervisorId: string) {
    this.logger.log(`Processing attendance approval: ${approvalDto.attendanceId} by supervisor ${supervisorId}`);

    try {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: approvalDto.attendanceId },
        include: {
          employee: true,
          shift: {
            include: {
              assignment: {
                include: {
                  site: true,
                }
              }
            }
          }
        }
      });

      if (!attendance) {
        throw new NotFoundException('Attendance record not found');
      }

      // Update attendance status
      const newStatus = approvalDto.action === 'APPROVE' ? 'PRESENT' : 'REJECTED';
      
      const updatedAttendance = await this.prisma.attendance.update({
        where: { id: approvalDto.attendanceId },
        data: {
          status: newStatus,
          verificationData: {
            ...((attendance.verificationData as any) || {}),
            supervisorApproval: {
              supervisorId,
              action: approvalDto.action,
              notes: approvalDto.notes,
              processedAt: new Date().toISOString(),
            }
          }
        }
      });

      this.logger.log(`Attendance ${approvalDto.action.toLowerCase()}ed: ${approvalDto.attendanceId}`);

      return {
        attendanceId: approvalDto.attendanceId,
        action: approvalDto.action,
        status: newStatus,
        processedBy: supervisorId,
        processedAt: new Date().toISOString(),
        notes: approvalDto.notes,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process attendance approval: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to process attendance approval: ${errorMessage}`);
    }
  }

  /**
   * Handle emergency replacement workflow
   */
  async handleEmergencyReplacement(replacementDto: EmergencyReplacementDto, supervisorId: string) {
    this.logger.log(`Handling emergency replacement for site ${replacementDto.siteId}`);

    try {
      // Find available employees for replacement
      const availableEmployees = await this.findAvailableReplacements(
        replacementDto.siteId,
        replacementDto.shiftId
      );

      // Create replacement record
      const replacement = {
        id: `replacement-${Date.now()}`,
        siteId: replacementDto.siteId,
        shiftId: replacementDto.shiftId,
        originalEmployeeId: replacementDto.originalEmployeeId,
        replacementEmployeeId: replacementDto.replacementEmployeeId,
        reason: replacementDto.reason,
        priority: replacementDto.priority || 'HIGH',
        requestedBy: supervisorId,
        status: replacementDto.replacementEmployeeId ? 'ASSIGNED' : 'PENDING',
        createdAt: new Date().toISOString(),
      };

      // If replacement employee is selected, update the shift assignment
      if (replacementDto.replacementEmployeeId) {
        await this.assignReplacementToShift(
          replacementDto.shiftId,
          replacementDto.replacementEmployeeId,
          supervisorId
        );
      }

      // Send notifications to operations team and available employees
      await this.sendReplacementNotifications(replacement, availableEmployees);

      this.logger.log(`Emergency replacement created: ${replacement.id}`);

      return {
        ...replacement,
        availableReplacements: availableEmployees.slice(0, 5), // Return top 5 options
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to handle emergency replacement: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to handle emergency replacement: ${errorMessage}`);
    }
  }
  /**
   * Get site health monitoring data
   */
  async getSiteHealthMonitoring(queryDto: SiteHealthQueryDto, supervisorId: string) {
    this.logger.log(`Getting site health monitoring for supervisor ${supervisorId}`);

    try {
      const assignedSites = await this.getAssignedSites(supervisorId, queryDto.siteIds);
      const siteIds = assignedSites.map(s => s.id);

      if (!siteIds.length) {
        return { sites: [], overallHealth: 'GOOD' };
      }

      const siteHealthData = await Promise.all(
        siteIds.map(async (siteId) => {
          const [deploymentHealth, attendanceHealth, incidentHealth] = await Promise.all([
            this.calculateDeploymentHealth(siteId),
            this.calculateAttendanceHealth(siteId),
            this.calculateIncidentHealth(siteId),
          ]);

          const overallScore = Math.round(
            (deploymentHealth.score + attendanceHealth.score + incidentHealth.score) / 3
          );

          return {
            siteId,
            siteName: assignedSites.find(s => s.id === siteId)?.name || 'Unknown',
            overallHealth: this.getHealthStatus(overallScore),
            overallScore,
            metrics: {
              deployment: deploymentHealth,
              attendance: attendanceHealth,
              incidents: incidentHealth,
            },
            lastUpdated: new Date().toISOString(),
          };
        })
      );

      // Calculate overall health across all sites
      const averageScore = siteHealthData.reduce((sum, site) => sum + site.overallScore, 0) / siteHealthData.length;
      const overallHealth = this.getHealthStatus(averageScore);

      return {
        overallHealth,
        overallScore: Math.round(averageScore),
        sites: siteHealthData,
        summary: {
          healthySites: siteHealthData.filter(s => s.overallHealth === 'GOOD').length,
          warningSites: siteHealthData.filter(s => s.overallHealth === 'WARNING').length,
          criticalSites: siteHealthData.filter(s => s.overallHealth === 'CRITICAL').length,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get site health monitoring: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to get site health monitoring: ${errorMessage}`);
    }
  }

  /**
   * Get daily muster roll
   */
  async getDailyMusterRoll(queryDto: MusterRollQueryDto, supervisorId: string) {
    this.logger.log(`Getting daily muster roll for supervisor ${supervisorId}`);

    try {
      const targetDate = queryDto.date ? new Date(queryDto.date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const assignedSites = await this.getAssignedSites(supervisorId, queryDto.siteIds);
      const siteIds = assignedSites.map(s => s.id);

      if (!siteIds.length) {
        return { date: targetDate.toISOString(), sites: [], summary: {} };
      }

      const musterData = await this.prisma.site.findMany({
        where: {
          id: { in: siteIds },
        },
        include: {
          assignments: {
            where: {
              status: 'ACTIVE',
            },
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  phone: true,
                  employmentStatus: true,
                }
              },
              shifts: {
                where: {
                  shiftDate: {
                    gte: startOfDay,
                    lte: endOfDay,
                  }
                },
                include: {
                  attendance: {
                    select: {
                      id: true,
                      status: true,
                      clockIn: true,
                      clockOut: true,
                    }
                  }
                }
              }
            }
          }
        }
      });

      const musterRoll = musterData.map(site => ({
        siteId: site.id,
        siteName: site.name,
        employees: site.assignments.map(assignment => {
          const todayShift = assignment.shifts[0];
          const attendance = todayShift?.attendance[0];

          return {
            employeeId: assignment.employee.id,
            employeeNumber: assignment.employee.employeeNumber,
            name: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
            role: assignment.role,
            phone: assignment.employee.phone,
            shiftDetails: todayShift ? {
              shiftId: todayShift.id,
              startTime: todayShift.startTime,
              endTime: todayShift.endTime,
              status: todayShift.status,
            } : null,
            attendanceStatus: attendance?.status || 'NOT_MARKED',
            clockIn: attendance?.clockIn,
            clockOut: attendance?.clockOut,
            employmentStatus: assignment.employee.employmentStatus,
          };
        }),
      }));

      // Calculate summary statistics
      const totalEmployees = musterRoll.reduce((sum, site) => sum + site.employees.length, 0);
      const presentEmployees = musterRoll.reduce((sum, site) => 
        sum + site.employees.filter(emp => emp.attendanceStatus === 'PRESENT').length, 0);
      const lateEmployees = musterRoll.reduce((sum, site) => 
        sum + site.employees.filter(emp => emp.attendanceStatus === 'LATE').length, 0);
      const absentEmployees = musterRoll.reduce((sum, site) => 
        sum + site.employees.filter(emp => 
          ['ABSENT', 'NO_SHOW'].includes(emp.attendanceStatus)).length, 0);

      return {
        date: targetDate.toISOString(),
        sites: musterRoll,
        summary: {
          totalEmployees,
          presentEmployees,
          lateEmployees,
          absentEmployees,
          attendanceRate: totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 100,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get daily muster roll: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to get daily muster roll: ${errorMessage}`);
    }
  }
  // Helper methods
  private getStaffingStatus(current: number, required: number): string {
    if (current === required) return 'FULLY_STAFFED';
    if (current < required) return 'UNDERSTAFFED';
    return 'OVERSTAFFED';
  }

  private determinePriority(shiftDate: Date): string {
    const daysDifference = Math.ceil((shiftDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference < 0) return 'OVERDUE';
    if (daysDifference === 0) return 'URGENT';
    if (daysDifference === 1) return 'HIGH';
    return 'MEDIUM';
  }

  private async findAvailableReplacements(siteId: string, shiftId: string) {
    // Get shift details
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignment: {
          include: {
            site: true,
          }
        }
      }
    });

    if (!shift) return [];

    // Find employees without conflicts for this time slot
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: this.tenantContext.getTenantId(),
        employmentStatus: 'ACTIVE',
        // Add additional filters based on skills, location, etc.
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        phone: true,
        skills: true,
      }
    });

    // For now, return all active employees
    // In a real implementation, this would check for conflicts, skills match, etc.
    return employees.map(emp => ({
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      employeeNumber: emp.employeeNumber,
      phone: emp.phone,
      skills: emp.skills,
      availability: 'AVAILABLE', // Would be calculated
      matchScore: 85, // Would be calculated based on skills, location, etc.
    }));
  }

  private async assignReplacementToShift(shiftId: string, replacementEmployeeId: string, supervisorId: string) {
    // This would update the shift assignment
    // Implementation depends on how shifts are structured
    this.logger.log(`Assigning replacement ${replacementEmployeeId} to shift ${shiftId}`);
  }

  private async sendReplacementNotifications(replacement: any, availableEmployees: any[]) {
    // This would send notifications via SMS, email, push notifications
    this.logger.log(`Sending replacement notifications for ${replacement.id}`);
  }

  private async calculateDeploymentHealth(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    if (!site) return { score: 0, status: 'UNKNOWN', details: {} };

    const requirements = (site.requirements as any) || {};
    const requiredGuards = requirements.minGuards || requirements.guardCount || 1;
    const currentGuards = site.assignments.length;
    
    const deploymentRate = currentGuards / requiredGuards;
    const score = Math.min(deploymentRate * 100, 100);

    return {
      score: Math.round(score),
      status: score >= 100 ? 'GOOD' : score >= 80 ? 'WARNING' : 'CRITICAL',
      details: {
        required: requiredGuards,
        assigned: currentGuards,
        deploymentRate: Math.round(deploymentRate * 100),
      }
    };
  }

  private async calculateAttendanceHealth(siteId: string) {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const attendanceStats = await this.prisma.attendance.findMany({
      where: {
        shift: {
          assignment: { siteId },
          shiftDate: { gte: last7Days }
        }
      },
      select: {
        status: true,
      }
    });

    if (attendanceStats.length === 0) return { score: 100, status: 'GOOD', details: {} };

    const presentCount = attendanceStats.filter(a => a.status === 'PRESENT').length;
    const attendanceRate = (presentCount / attendanceStats.length) * 100;

    return {
      score: Math.round(attendanceRate),
      status: attendanceRate >= 90 ? 'GOOD' : attendanceRate >= 75 ? 'WARNING' : 'CRITICAL',
      details: {
        total: attendanceStats.length,
        present: presentCount,
        attendanceRate: Math.round(attendanceRate),
        period: '7 days'
      }
    };
  }

  private async calculateIncidentHealth(siteId: string) {
    // For now, return good health as incident management is not yet implemented
    return {
      score: 100,
      status: 'GOOD',
      details: {
        incidents: 0,
        period: '7 days'
      }
    };
  }

  private getHealthStatus(score: number): string {
    if (score >= 80) return 'GOOD';
    if (score >= 60) return 'WARNING';
    return 'CRITICAL';
  }
}