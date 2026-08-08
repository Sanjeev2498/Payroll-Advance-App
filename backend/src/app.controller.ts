import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

// Helper function to calculate real-time dashboard stats from actual data
const calculateDashboardStats = async (prisma: any, companyId: string) => {
  try {
    const stats = await prisma.employee.groupBy({
      by: ['employmentStatus'],
      where: { companyId },
      _count: true
    });

    const totalEmployees = stats.reduce((acc, stat) => acc + stat._count, 0);
    const presentEmployees = stats.find(s => s.employmentStatus === 'ACTIVE')?._count || 0;
    const onLeaveEmployees = stats.find(s => s.employmentStatus === 'ON_LEAVE')?._count || 0;
    const inactiveEmployees = stats.find(s => s.employmentStatus === 'INACTIVE')?._count || 0;
    
    // Calculate attendance rate (for dashboard purposes, assume ACTIVE employees are present)
    const attendanceRate = totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 100;
    
    return {
      totalEmployees,
      presentEmployees,
      lateEmployees: 0, // Would need attendance data for real calculation
      absentEmployees: inactiveEmployees,
      onLeaveEmployees,
      attendanceRate
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    // Return default stats if database query fails
    return {
      totalEmployees: 0,
      presentEmployees: 0,
      lateEmployees: 0,
      absentEmployees: 0,
      onLeaveEmployees: 0,
      attendanceRate: 100
    };
  }
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Security Workforce & Payroll Management System',
      version: '1.0.0',
    };
  }

  @Public()
  @Get('health/database')
  async getDatabaseHealth() {
    return this.appService.getDatabaseStatus();
  }

  @Public()
  @Get('supervisor-portal/dashboard')
  async getSupervisorDashboard(@Query() query: any) {
    // Get tenant context - for now use first company
    const company = await this.prisma.company.findFirst();
    if (!company) {
      throw new Error('No company found');
    }

    const stats = await calculateDashboardStats(this.prisma, company.id);
    return {
      supervisorId: 'temp-supervisor',
      targetDate: new Date().toISOString(),
      overview: {
        totalSites: 2,
        activeSites: 2,
        guardsOnDuty: stats.presentEmployees,
        totalGuards: stats.totalEmployees,
        pendingApprovals: 0,
        activeAlerts: stats.absentEmployees
      },
      assignedSites: [
        {
          id: '1',
          name: 'Main Entrance',
          status: 'ACTIVE',
          currentGuards: Math.floor(stats.totalEmployees / 2),
          requiredGuards: Math.ceil(stats.totalEmployees / 2),
          client: { name: 'Demo Client' },
          address: '123 Main St, Business District'
        },
        {
          id: '2', 
          name: 'Parking Area',
          status: 'ACTIVE',
          currentGuards: Math.ceil(stats.totalEmployees / 2),
          requiredGuards: Math.floor(stats.totalEmployees / 2),
          client: { name: 'Demo Client' },
          address: '456 Business Ave, Commercial Zone'
        }
      ],
      sitesOverview: {
        totalSites: 2,
        activeSites: 2,
        sitesWithIssues: stats.absentEmployees > 0 ? 1 : 0
      },
      attendanceOverview: {
        expectedCount: stats.totalEmployees,
        presentCount: stats.presentEmployees,
        lateCount: stats.lateEmployees,
        absentCount: stats.absentEmployees,
        attendanceRate: stats.attendanceRate,
        anomalies: []
      },
      deploymentStatus: { deployments: [] },
      todayStats: {
        totalShifts: stats.totalEmployees,
        activeAssignments: stats.presentEmployees,
        reportedIncidents: 0
      },
      activeAlerts: [],
      pendingApprovals: []
    };
  }

  @Public()
  @Get('supervisor-portal/muster-roll')
  async getSupervisorMusterRoll(@Query() query: any) {
    // Get tenant context - for now use first company
    const company = await this.prisma.company.findFirst();
    if (!company) {
      throw new Error('No company found');
    }

    const stats = await calculateDashboardStats(this.prisma, company.id);
    
    // Get employees for muster roll
    const employees = await this.prisma.employee.findMany({
      where: { companyId: company.id }
    });

    // Group employees by site (mock grouping for now)
    const siteGroups = {
      '1': {
        siteId: '1',
        siteName: 'Main Entrance',
        employees: employees.map(emp => ({
          employeeId: emp.id,
          employeeNumber: emp.employeeNumber,
          name: `${emp.firstName} ${emp.lastName}`,
          role: 'Security Guard',
          email: emp.email,
          phone: emp.phone,
          shiftDetails: {
            startTime: '09:00',
            endTime: '17:00',
            status: 'SCHEDULED'
          },
          attendanceStatus: emp.employmentStatus === 'ACTIVE' ? 'PRESENT' : 'ABSENT',
          clockIn: emp.employmentStatus === 'ACTIVE' ? '09:00' : null,
          clockOut: null,
          employmentStatus: emp.employmentStatus
        }))
      }
    };

    return {
      date: new Date().toISOString(),
      sites: Object.values(siteGroups),
      summary: {
        totalEmployees: stats.totalEmployees,
        presentEmployees: stats.presentEmployees,
        lateEmployees: stats.lateEmployees,
        absentEmployees: stats.absentEmployees,
        attendanceRate: stats.attendanceRate
      }
    };
  }

  @Public()
  @Get('supervisor-portal/sites/health')
  async getSupervisorSiteHealth(@Query() query: any) {
    return {
      overallHealth: 'GOOD',
      overallScore: 85,
      sites: [
        {
          siteId: '1',
          siteName: 'Main Entrance',
          overallHealth: 'GOOD',
          overallScore: 90,
          metrics: {
            deployment: { score: 95, status: 'FULLY_STAFFED' },
            attendance: { score: 88, status: 'GOOD' },
            incidents: { score: 95, status: 'LOW' }
          },
          lastUpdated: new Date().toISOString()
        }
      ],
      summary: {
        healthySites: 1,
        warningSites: 0,
        criticalSites: 0
      }
    };
  }

  @Public()
  @Post('supervisor-portal/attendance/update')
  async updateAttendance(@Body() updateData: any) {
    const { changeType, oldStatus, daysDifference, reason } = updateData;
    
    // For now, just return a success response since we don't have attendance tracking implemented
    // In a real implementation, this would update the attendance records in the database
    
    // Create audit trail entry
    const auditEntry = {
      id: `audit-${Date.now()}`,
      employeeId: updateData.employeeId,
      date: updateData.date,
      changeType, // 'SAME_DAY' or 'PREVIOUS_DAY'
      oldValue: oldStatus,
      newValue: updateData.status,
      reason,
      changedBy: 'supervisor@demosecurity.co.in', // In real app, get from JWT token
      changedAt: new Date().toISOString(),
      daysDifference,
      requiresPayrollUpdate: changeType === 'PREVIOUS_DAY',
      approvalStatus: changeType === 'SAME_DAY' ? 'AUTO_APPROVED' : 'PENDING_REVIEW'
    };

    // Log the audit entry (in real app, save to database)
    console.log('📋 Attendance Audit Trail Entry:', JSON.stringify(auditEntry, null, 2));

    // Different handling based on change type
    if (changeType === 'SAME_DAY') {
      return {
        success: true,
        message: 'Same-day attendance updated successfully',
        employeeId: updateData.employeeId,
        newStatus: updateData.status,
        date: updateData.date,
        updatedAt: new Date().toISOString(),
        auditId: auditEntry.id,
        requiresApproval: false,
        realTimeUpdate: true
      };
    } else if (changeType === 'PREVIOUS_DAY') {
      return {
        success: true,
        message: 'Previous-day attendance change submitted for audit',
        employeeId: updateData.employeeId,
        newStatus: updateData.status,
        date: updateData.date,
        updatedAt: new Date().toISOString(),
        auditId: auditEntry.id,
        requiresApproval: false, // Supervisor can approve within 3 days
        auditTrail: {
          oldValue: oldStatus,
          newValue: updateData.status,
          reason,
          daysDifference,
          changedBy: auditEntry.changedBy
        },
        payrollImpact: daysDifference <= 3 ? 'WILL_UPDATE_IF_NOT_FINALIZED' : 'REQUIRES_APPROVAL',
        realTimeUpdate: true
      };
    }

    return {
      success: false,
      message: 'Invalid change type'
    };
  }

  @Public()
  @Get('supervisor-portal/attendance/audit-trail')
  async getAttendanceAuditTrail(@Query() query: any) {
    // Mock audit trail data for demonstration
    return {
      auditEntries: [
        {
          id: 'audit-1',
          employeeId: 'emp1',
          employeeName: 'Arjun Singh',
          employeeNumber: 'EMP001',
          date: '2026-07-18',
          changeType: 'PREVIOUS_DAY',
          oldValue: 'ABSENT',
          newValue: 'PRESENT',
          reason: 'Employee was present but forgot to clock in due to emergency call',
          changedBy: 'supervisor@demosecurity.co.in',
          changedAt: new Date().toISOString(),
          daysDifference: 1,
          approvalStatus: 'APPROVED',
          payrollImpact: 'UPDATED'
        },
        {
          id: 'audit-2',
          employeeId: 'emp2',
          employeeName: 'Priya Reddy',
          employeeNumber: 'EMP002',
          date: '2026-07-17',
          changeType: 'PREVIOUS_DAY',
          oldValue: 'LATE',
          newValue: 'PRESENT',
          reason: 'Clock-in time correction - traffic delay was excused',
          changedBy: 'supervisor@demosecurity.co.in',
          changedAt: new Date(Date.now() - 86400000).toISOString(),
          daysDifference: 2,
          approvalStatus: 'APPROVED',
          payrollImpact: 'UPDATED'
        }
      ],
      summary: {
        totalChanges: 2,
        sameDayChanges: 0,
        previousDayChanges: 2,
        pendingApproval: 0,
        approved: 2
      }
    };
  }

  // Client portal specific endpoints
  @Public()
  @Get('client-portal/communication/incidents')
  async getClientIncidents(@Query() query: any) {
    return {
      incidents: [
        {
          id: 'inc-1',
          type: 'SECURITY_BREACH',
          title: 'Unauthorized Access Attempt',
          siteName: 'Main Entrance',
          severity: 'HIGH',
          status: 'RESOLVED',
          reportedAt: new Date(Date.now() - 86400000).toISOString(),
          description: 'Attempted unauthorized entry through side gate',
          response: 'Security protocols activated, incident resolved'
        },
        {
          id: 'inc-2',
          type: 'EQUIPMENT_ISSUE',
          title: 'CCTV Camera Malfunction',
          siteName: 'Parking Area',
          severity: 'MEDIUM',
          status: 'IN_PROGRESS',
          reportedAt: new Date(Date.now() - 43200000).toISOString(),
          description: 'Camera #3 showing static, needs replacement',
          response: 'Technician dispatched, replacement scheduled'
        }
      ],
      summary: {
        total: 2,
        resolved: 1,
        inProgress: 1,
        pending: 0
      }
    };
  }

  @Public()
  @Get('client-portal/communication/complaints')
  async getClientComplaints(@Query() query: any) {
    return {
      complaints: [
        {
          id: 'comp-1',
          type: 'SERVICE_QUALITY',
          subject: 'Guard was late for shift',
          status: 'INVESTIGATING',
          priority: 'MEDIUM',
          submittedAt: new Date(Date.now() - 14400000).toISOString(),
          description: 'Security guard arrived 15 minutes late without prior notice',
          assignedTo: 'supervisor@demosecurity.co.in'
        }
      ],
      summary: {
        total: 1,
        investigating: 1,
        resolved: 0,
        pending: 0
      }
    };
  }

  @Public()
  @Get('client-portal/communication/requests')
  async getClientRequests(@Query() query: any) {
    return {
      requests: [
        {
          id: 'req-1',
          type: 'GUARD_REPLACEMENT',
          title: 'Additional guard needed for weekend event',
          status: 'APPROVED',
          urgency: 'HIGH',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          description: 'Corporate event requires additional security coverage',
          approvedBy: 'manager@demosecurity.co.in'
        }
      ],
      summary: {
        total: 1,
        approved: 1,
        pending: 0,
        rejected: 0
      }
    };
  }

  @Public()
  @Get('client-portal/guards')
  async getClientGuards(@Query() query: any) {
    // Get tenant context - for now use first company
    const company = await this.prisma.company.findFirst({
      include: {
        employees: {
          where: {
            employmentStatus: 'ACTIVE'
          }
        }
      }
    });
    
    if (!company) {
      throw new Error('No company found');
    }

    // Mock site data since we don't have assignments implemented yet
    const sites = [
      {
        siteId: '1',
        siteName: 'Main Entrance',
        requiredGuards: 3,
        assignedGuards: company.employees.length,
        onDutyGuards: company.employees.filter(emp => emp.employmentStatus === 'ACTIVE').length,
        coverageStatus: 'FULLY_COVERED',
        guards: company.employees.map(emp => ({
          guardId: emp.id,
          guardName: `${emp.firstName} ${emp.lastName}`,
          status: emp.employmentStatus === 'ACTIVE' ? 'ON_DUTY' : 'OFF_DUTY',
          shiftStart: '08:00',
          shiftEnd: '20:00',
          lastCheckIn: new Date().toISOString(),
          contactNumber: emp.phone || 'N/A',
          attendanceStatus: emp.employmentStatus
        }))
      }
    ];

    return sites;
  }

  @Public()
  @Get('employees/stats')
  async getEmployeeStats() {
    // Get tenant context - for now use first company
    const company = await this.prisma.company.findFirst();
    if (!company) {
      throw new Error('No company found');
    }

    const stats = await calculateDashboardStats(this.prisma, company.id);
    
    // Calculate certifications expiring soon
    const employees = await this.prisma.employee.findMany({
      where: { companyId: company.id }
    });
    
    let certificationsExpiringSoon = 0;
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    employees.forEach(employee => {
      if (employee.certifications && Array.isArray(employee.certifications)) {
        employee.certifications.forEach((cert: any) => {
          if (cert.expiryDate && new Date(cert.expiryDate) <= thirtyDaysFromNow) {
            certificationsExpiringSoon++;
          }
        });
      }
    });
    
    return {
      total: stats.totalEmployees,
      active: stats.presentEmployees,
      inactive: stats.absentEmployees,
      onLeave: stats.onLeaveEmployees,
      terminated: 0, // Would need to track terminated employees separately
      certificationsExpiringSoon,
      complianceIssues: stats.absentEmployees, // Absent employees are compliance issues
      averagePerformanceRating: 4.2 // Mock average rating - would calculate from actual data
    };
  }

  @Public()
  @Get('attendance/real-time-events')
  async getRealTimeAttendanceEvents(@Query() query: any) {
    // Get tenant context - for now use first company
    const company = await this.prisma.company.findFirst();
    if (!company) {
      throw new Error('No company found');
    }

    const stats = await calculateDashboardStats(this.prisma, company.id);
    
    // Generate real-time events based on current employee data
    const employees = await this.prisma.employee.findMany({
      where: { companyId: company.id },
      take: 10
    });

    const events = employees.map((emp, index) => ({
      id: `event-${emp.id}-${Date.now()}`,
      type: emp.employmentStatus === 'ACTIVE' ? 'CLOCK_IN' : 
            emp.employmentStatus === 'ON_LEAVE' ? 'ON_LEAVE' :
            emp.employmentStatus === 'INACTIVE' ? 'NO_SHOW' : 'CLOCK_OUT',
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeId: emp.id,
      siteName: 'Main Site', // Would get from assignments in real implementation
      timestamp: new Date(Date.now() - (index * 300000)).toISOString(), // Stagger events
      severity: emp.employmentStatus === 'ON_LEAVE' ? 'MEDIUM' :
               emp.employmentStatus === 'INACTIVE' ? 'HIGH' : 'LOW',
      metadata: emp.employmentStatus === 'ON_LEAVE' ? { reason: 'On Leave' } : {}
    }));
    
    return {
      events: events.slice(0, 10), // Return latest 10 events
      liveStats: {
        activeEmployees: stats.totalEmployees,
        totalClockedIn: stats.presentEmployees,
        lateArrivals: stats.lateEmployees,
        pendingClockOuts: Math.floor(Math.random() * 5) + 2,
        averageResponseTime: 150,
        lastUpdate: new Date().toISOString()
      }
    };
  }

  @Public()
  @Get('clients')
  async getClients(@Query() query: any) {
    return {
      clients: [
        {
          id: 'client-1',
          name: 'Demo Corporate Client',
          contactEmail: 'contact@democorp.com',
          contractStatus: 'ACTIVE',
          contractStart: new Date(2024, 0, 1),
          contractEnd: new Date(2024, 11, 31),
          industry: 'Technology',
          sitesCount: 2,
          totalRevenue: 250000,
          accountManager: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@demosecurity.co.in'
          },
          performanceScore: 8.5,
          renewalRisk: 'LOW'
        }
      ],
      summary: {
        total: 1,
        active: 1,
        pending: 0,
        expiring: 0,
        totalRevenue: 250000,
        avgContractValue: 250000
      }
    };
  }
}
