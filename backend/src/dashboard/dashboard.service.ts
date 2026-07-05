import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { KPIMetricsDto } from './dto/kpi-metrics.dto';
import { OperationsOverviewDto } from './dto/operations-overview.dto';
import { ActivityTimelineItemDto } from './dto/activity-timeline.dto';
import { DeploymentMetricsDto } from './dto/deployment-metrics.dto';
import { GuardAvailabilityDto } from './dto/guard-availability.dto';
import { NotificationItemDto } from './dto/notification.dto';
import { RealTimeAlertDto } from './dto/real-time-alert.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  async getOperationsOverview(): Promise<OperationsOverviewDto> {
    this.logger.log('Fetching complete operations overview');
    
    const [
      kpis,
      deploymentMetrics,
      guardAvailability,
      recentActivity,
      notifications,
      realTimeAlerts
    ] = await Promise.all([
      this.getKPIMetrics(),
      this.getDeploymentMetrics(),
      this.getGuardAvailability(),
      this.getActivityTimeline(10),
      this.getNotifications(true), // Only unread notifications
      this.getRealTimeAlerts()
    ]);

    return {
      kpis,
      deploymentMetrics,
      guardAvailability,
      recentActivity,
      notifications,
      realTimeAlerts
    };
  }

  async getKPIMetrics(): Promise<KPIMetricsDto> {
    this.logger.log('Calculating KPI metrics');
    const tenantId = this.tenantContext.getTenantId();
    
    // Get current date for time-based calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Parallel execution of all KPI queries
    const [
      // Active Guards (employees with ACTIVE status)
      activeGuards,
      // Active Sites (sites with ACTIVE operational status)
      activeSites,
      // Guards on Duty (employees with attendance records for today)
      guardsOnDuty,
      // Vacant Positions (sites needing more guards)
      allSites,
      // Attendance data for today
      attendanceData,
      // Payroll data
      payrollData,
      // Pending approvals
      pendingAttendanceCorrections,
      pendingAssignments,
      pendingPayrollRuns,
      // Billing data for current month
      billingData
    ] = await Promise.all([
      // Active Guards
      this.prisma.employee.count({
        where: {
          companyId: tenantId,
          employmentStatus: 'ACTIVE'
        }
      }),

      // Active Sites
      this.prisma.site.count({
        where: {
          client: { companyId: tenantId },
          operationalStatus: 'ACTIVE'
        }
      }),

      // Guards on Duty (unique employees with clock-in today, no clock-out yet)
      this.prisma.attendance.findMany({
        where: {
          employee: { companyId: tenantId },
          clockIn: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          },
          clockOut: null
        },
        select: { employeeId: true },
        distinct: ['employeeId']
      }).then((records: { employeeId: string }[]) => records.length),

      // Get all sites to calculate vacant positions
      this.prisma.site.findMany({
        where: {
          client: { companyId: tenantId },
          operationalStatus: 'ACTIVE'
        },
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            select: { id: true }
          }
        }
      }),

      // Attendance Status for Today
      this.prisma.$transaction(async (tx) => {
        const scheduledShifts = await tx.shift.count({
          where: {
            site: { client: { companyId: tenantId } },
            shiftDate: today,
            status: 'SCHEDULED'
          }
        });

        const presentCount = await tx.attendance.count({
          where: {
            employee: { companyId: tenantId },
            clockIn: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: 'PRESENT'
          }
        });

        // Late arrivals
        const lateCount = await tx.attendance.count({
          where: {
            employee: { companyId: tenantId },
            clockIn: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: 'LATE'
          }
        });

        return {
          present: presentCount,
          late: lateCount,
          absent: Math.max(0, scheduledShifts - presentCount - lateCount),
          totalScheduled: scheduledShifts
        };
      }),

      // Payroll Status
      this.prisma.$transaction(async (tx) => {
        const processedItems = await tx.payrollItem.count({
          where: {
            payrollRun: {
              companyId: tenantId,
              status: 'COMPLETED'
            }
          }
        });

        const pendingItems = await tx.payrollItem.count({
          where: {
            payrollRun: {
              companyId: tenantId,
              status: { in: ['PROCESSING', 'DRAFT'] }
            }
          }
        });

        const totalAmount = await tx.payrollRun.aggregate({
          where: {
            companyId: tenantId,
            status: 'PROCESSING'
          },
          _sum: { totalAmount: true }
        });

        return {
          processed: processedItems,
          pending: pendingItems,
          totalAmount: Number(totalAmount._sum.totalAmount || 0),
          nextRunDate: this.getNextPayrollDate().toISOString()
        };
      }),

      // Pending Attendance Corrections (using PENDING status)
      this.prisma.attendance.count({
        where: {
          employee: { companyId: tenantId },
          status: 'PENDING'
        }
      }),

      // Pending Assignments (using INACTIVE status as pending)
      this.prisma.assignment.count({
        where: {
          site: { client: { companyId: tenantId } },
          status: 'INACTIVE'
        }
      }),

      // Pending Payroll Runs
      this.prisma.payrollRun.count({
        where: {
          companyId: tenantId,
          status: 'DRAFT'
        }
      }),

      // Billing Overview for Current Month
      this.prisma.$transaction(async (tx) => {
        const monthlyRevenue = await tx.invoice.aggregate({
          where: {
            client: { companyId: tenantId },
            billingPeriodStart: { gte: monthStart },
            billingPeriodEnd: { lte: monthEnd },
            status: 'PAID'
          },
          _sum: { totalAmount: true }
        });

        const outstandingInvoices = await tx.invoice.count({
          where: {
            client: { companyId: tenantId },
            status: { in: ['SENT', 'OVERDUE'] }
          }
        });

        const paidInvoices = await tx.invoice.count({
          where: {
            client: { companyId: tenantId },
            billingPeriodStart: { gte: monthStart },
            status: 'PAID'
          }
        });

        const totalBilled = await tx.invoice.aggregate({
          where: {
            client: { companyId: tenantId },
            billingPeriodStart: { gte: monthStart },
            billingPeriodEnd: { lte: monthEnd }
          },
          _sum: { totalAmount: true }
        });

        return {
          monthlyRevenue: Number(monthlyRevenue._sum.totalAmount || 0),
          outstandingInvoices,
          paidInvoices,
          totalBilled: Number(totalBilled._sum.totalAmount || 0)
        };
      })
    ]);

    // Calculate vacant positions
    const vacantPositions = allSites.reduce((total: number, site: any) => {
      // Assuming each site needs at least 1 guard, could be made configurable
      // In a real scenario, this would come from site.requirements or similar
      const required = 1; // Default requirement
      const assigned = site.assignments.length;
      return total + Math.max(0, required - assigned);
    }, 0);

    return {
      activeGuards,
      activeSites,
      guardsOnDuty,
      vacantPositions,
      attendanceStatus: attendanceData,
      payrollStatus: payrollData,
      pendingApprovals: {
        attendance: pendingAttendanceCorrections,
        assignments: pendingAssignments,
        payroll: pendingPayrollRuns,
        total: pendingAttendanceCorrections + pendingAssignments + pendingPayrollRuns
      },
      billingOverview: billingData
    };
  }

  async getDeploymentMetrics(): Promise<DeploymentMetricsDto> {
    this.logger.log('Calculating deployment metrics');
    const tenantId = this.tenantContext.getTenantId();

    const sites = await this.prisma.site.findMany({
      where: {
        client: { companyId: tenantId },
        operationalStatus: 'ACTIVE'
      },
      include: {
        client: { select: { name: true } },
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            employee: { select: { id: true } }
          }
        },
        shifts: {
          where: {
            shiftDate: new Date(),
            status: 'SCHEDULED'
          },
          include: {
            attendanceRecords: {
              where: { clockOut: null },
              select: { employeeId: true }
            }
          }
        }
      }
    });

    const siteDeployments = sites.map((site: any) => {
      // Default requirement of 1 guard per site (could be made configurable)
      const requiredGuards = 1;
      const assignedGuards = site.assignments.length;
      const onDutyGuards = site.shifts.reduce((count: number, shift: any) => 
        count + shift.attendanceRecords.length, 0
      );
      const vacancies = Math.max(0, requiredGuards - assignedGuards);

      let operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline';
      if (assignedGuards === 0) {
        operationalStatus = 'offline';
      } else if (vacancies === 0) {
        operationalStatus = 'optimal';
      } else if (vacancies / requiredGuards > 0.5) {
        operationalStatus = 'critical';
      } else {
        operationalStatus = 'understaffed';
      }

      return {
        siteId: site.id,
        siteName: site.name,
        clientName: site.client.name,
        requiredGuards,
        assignedGuards,
        onDutyGuards,
        vacancies,
        operationalStatus
      };
    });

    return {
      siteDeployments,
      totalDeployments: siteDeployments.length,
      optimalSites: siteDeployments.filter((s: any) => s.operationalStatus === 'optimal').length,
      understaffedSites: siteDeployments.filter((s: any) => s.operationalStatus === 'understaffed').length,
      criticalSites: siteDeployments.filter((s: any) => ['critical', 'offline'].includes(s.operationalStatus)).length
    };
  }

  async getGuardAvailability(): Promise<GuardAvailabilityDto> {
    this.logger.log('Calculating guard availability metrics');
    const tenantId = this.tenantContext.getTenantId();
    const today = new Date();

    const [totalGuards, onDutyGuards, unavailableGuards, onLeaveGuards] = await Promise.all([
      this.prisma.employee.count({
        where: {
          companyId: tenantId,
          employmentStatus: 'ACTIVE'
        }
      }),

      this.prisma.attendance.findMany({
        where: {
          employee: { companyId: tenantId },
          clockIn: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
          },
          clockOut: null
        },
        select: { employeeId: true },
        distinct: ['employeeId']
      }).then((records: { employeeId: string }[]) => records.length),

      this.prisma.employee.count({
        where: {
          companyId: tenantId,
          employmentStatus: 'INACTIVE'
        }
      }),

      this.prisma.employee.count({
        where: {
          companyId: tenantId,
          employmentStatus: 'ON_LEAVE'
        }
      })
    ]);

    // Calculate skill breakdown
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: tenantId,
        employmentStatus: 'ACTIVE'
      },
      select: {
        skills: true,
        assignments: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    const skillMap = new Map<string, { available: number; required: number }>();
    
    employees.forEach((employee: any) => {
      const skills = employee.skills || [];
      const isAvailable = employee.assignments.length === 0; // Not currently assigned
      
      skills.forEach((skill: string) => {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, { available: 0, required: 0 });
        }
        if (isAvailable) {
          skillMap.get(skill)!.available++;
        }
      });
    });

    const skillBreakdown = Array.from(skillMap.entries()).map(([skill, data]) => ({
      skill,
      available: data.available,
      required: data.required // This would need more complex calculation based on site requirements
    }));

    const availableNow = totalGuards - onDutyGuards - unavailableGuards - onLeaveGuards;
    const unassigned = employees.filter((emp: any) => emp.assignments.length === 0).length;

    return {
      totalGuards,
      availableNow: Math.max(0, availableNow),
      onDuty: onDutyGuards,
      unavailable: unavailableGuards,
      onLeave: onLeaveGuards,
      unassigned,
      skillBreakdown
    };
  }

  async getActivityTimeline(limit: number = 20): Promise<ActivityTimelineItemDto[]> {
    this.logger.log(`Fetching activity timeline (limit: ${limit})`);
    const tenantId = this.tenantContext.getTenantId();
    
    // Get recent activities from various sources
    const [attendanceActivities, assignmentActivities, payrollActivities] = await Promise.all([
      // Recent attendance records
      this.prisma.attendance.findMany({
        where: { employee: { companyId: tenantId } },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 3),
        include: {
          employee: { select: { firstName: true, lastName: true } },
          shift: { include: { site: { select: { name: true } } } }
        }
      }),

      // Recent assignments
      this.prisma.assignment.findMany({
        where: { site: { client: { companyId: tenantId } } },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 3),
        include: {
          employee: { select: { firstName: true, lastName: true } },
          site: { select: { name: true } }
        }
      }),

      // Recent payroll activities
      this.prisma.payrollRun.findMany({
        where: { companyId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 3),
        select: {
          id: true,
          runNumber: true,
          status: true,
          createdAt: true,
          totalAmount: true
        }
      })
    ]);

    const activities: ActivityTimelineItemDto[] = [];

    // Process attendance activities
    attendanceActivities.forEach((attendance: any) => {
      activities.push({
        id: `attendance-${attendance.id}`,
        type: 'attendance',
        title: `${attendance.employee.firstName} ${attendance.employee.lastName} clocked ${attendance.clockOut ? 'out' : 'in'}`,
        description: `at ${attendance.shift?.site?.name || 'Unknown Site'}`,
        timestamp: (attendance.clockOut || attendance.clockIn).toISOString(),
        user: {
          name: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
          role: 'Employee'
        }
      });
    });

    // Process assignment activities
    assignmentActivities.forEach((assignment: any) => {
      activities.push({
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: `New assignment created`,
        description: `${assignment.employee.firstName} ${assignment.employee.lastName} assigned to ${assignment.site.name}`,
        timestamp: assignment.createdAt.toISOString(),
        severity: 'medium'
      });
    });

    // Process payroll activities
    payrollActivities.forEach((payroll: any) => {
      activities.push({
        id: `payroll-${payroll.id}`,
        type: 'payroll',
        title: `Payroll ${payroll.runNumber} ${payroll.status.toLowerCase()}`,
        description: `Total amount: $${payroll.totalAmount?.toFixed(2) || '0.00'}`,
        timestamp: payroll.createdAt.toISOString(),
        severity: payroll.status === 'FINALIZED' ? 'low' : 'medium'
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getNotifications(unreadOnly: boolean = false): Promise<NotificationItemDto[]> {
    this.logger.log(`Fetching notifications (unread only: ${unreadOnly})`);
    
    // For now, return mock notifications - in a real implementation, 
    // these would come from a notifications table
    const mockNotifications: NotificationItemDto[] = [
      {
        id: '1',
        type: 'payroll',
        title: 'Payroll Processing Due',
        message: 'Payroll run for this week is due in 2 days',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        severity: 'warning',
        actionRequired: true,
        actionUrl: '/dashboard/payroll'
      },
      {
        id: '2',
        type: 'compliance',
        title: 'Certification Expiring',
        message: '3 employee certifications expire within 30 days',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: false,
        severity: 'error',
        actionRequired: true,
        actionUrl: '/dashboard/employees/certifications'
      },
      {
        id: '3',
        type: 'attendance',
        title: 'Late Arrival Alert',
        message: 'John Doe arrived 30 minutes late at Downtown Site',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: true,
        severity: 'info'
      }
    ];

    return unreadOnly 
      ? mockNotifications.filter(n => !n.read)
      : mockNotifications;
  }

  async getRealTimeAlerts(): Promise<RealTimeAlertDto[]> {
    this.logger.log('Fetching real-time alerts');
    
    // Mock alerts - in production these would come from real-time monitoring
    const mockAlerts: RealTimeAlertDto[] = [
      {
        id: '1',
        type: 'attendance',
        severity: 'high',
        title: 'No Show Alert',
        description: 'Employee failed to clock in for scheduled shift',
        siteId: 'site-1',
        siteName: 'Corporate Campus',
        employeeId: 'emp-1',
        employeeName: 'Jane Smith',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        acknowledged: false
      },
      {
        id: '2',
        type: 'staffing',
        severity: 'critical',
        title: 'Understaffed Site',
        description: 'Site has only 1 of 3 required guards on duty',
        siteId: 'site-2',
        siteName: 'Shopping Mall',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        acknowledged: false
      }
    ];

    return mockAlerts.filter(alert => !alert.resolvedAt);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    this.logger.log(`Marking notification ${notificationId} as read`);
    // In production, this would update the notification in database
    // For now, this is a no-op since we're using mock data
  }

  async markAllNotificationsRead(): Promise<void> {
    this.logger.log('Marking all notifications as read');
    // In production, this would update all notifications for the tenant
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    this.logger.log(`Acknowledging alert ${alertId}`);
    // In production, this would update the alert status in database
  }

  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    this.logger.log(`Resolving alert ${alertId} with resolution: ${resolution}`);
    // In production, this would mark the alert as resolved
  }

  private getNextPayrollDate(): Date {
    // Simple implementation - next Friday
    const now = new Date();
    const nextFriday = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    return nextFriday;
  }
}