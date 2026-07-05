import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { 
  SiteDeploymentDetailDto,
  AssignmentConflictDto,
  DeploymentEfficiencyMetricsDto,
  DeploymentAnalyticsDto,
  QuickAssignDto,
  BulkAssignDto,
  EmergencyReplacementDto,
  UpdateSiteRequirementsDto,
  ResolveConflictDto,
  OptimizeDeploymentsDto,
  AssignmentRecommendationsDto,
  SiteHealthDto
} from './dto';

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  async getSiteDetails(): Promise<SiteDeploymentDetailDto[]> {
    this.logger.log('Fetching detailed site deployment information');
    const tenantId = this.tenantContext.getTenantId();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const sites = await this.prisma.site.findMany({
      where: {
        client: { companyId: tenantId },
        operationalStatus: 'ACTIVE'
      },
      include: {
        client: { 
          select: { 
            name: true,
            contactInfo: true 
          } 
        },
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            employee: { 
              select: { 
                id: true, 
                firstName: true, 
                lastName: true,
                skills: true 
              } 
            }
          }
        },
        shifts: {
          where: {
            shiftDate: todayStart,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          },
          include: {
            attendanceRecords: {
              where: { clockOut: null },
              select: { 
                employeeId: true,
                status: true 
              }
            }
          }
        }
      }
    });

    return await Promise.all(sites.map(async (site: any) => {
      const requiredGuards = this.calculateRequiredGuards(site);
      const assignedGuards = site.assignments.length;
      const onDutyGuards = site.shifts.reduce((count: number, shift: any) => 
        count + shift.attendanceRecords.length, 0
      );
      const vacancies = Math.max(0, requiredGuards - assignedGuards);

      // Calculate shift coverage percentage
      const totalShiftsToday = site.shifts.length;
      const coveredShifts = site.shifts.filter((shift: any) => 
        shift.attendanceRecords.length > 0
      ).length;
      const shiftCoverage = totalShiftsToday > 0 ? (coveredShifts / totalShiftsToday) * 100 : 0;

      // Determine operational status
      let operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline';
      if (assignedGuards === 0) {
        operationalStatus = 'offline';
      } else if (vacancies === 0 && shiftCoverage >= 90) {
        operationalStatus = 'optimal';
      } else if (vacancies / requiredGuards > 0.5 || shiftCoverage < 50) {
        operationalStatus = 'critical';
      } else {
        operationalStatus = 'understaffed';
      }

      // Extract contact information
      const contactInfo = site.contactInfo || site.client.contactInfo || {};

      return {
        siteId: site.id,
        siteName: site.name,
        clientName: site.client.name,
        requiredGuards,
        assignedGuards,
        onDutyGuards,
        vacancies,
        operationalStatus,
        shiftCoverage,
        lastUpdate: new Date().toISOString(),
        address: site.address,
        contactInfo: {
          name: contactInfo.contactPerson || 'N/A',
          phone: contactInfo.phone || 'N/A',
          email: contactInfo.email || 'N/A'
        },
        requirements: {
          skills: site.requiredSkills || [],
          minimumExperience: site.minimumExperience || 0,
          shiftPattern: site.shiftPattern || 'standard'
        },
        performance: {
          attendanceRate: await this.calculateAttendanceRate(site.id),
          incidentCount: await this.calculateIncidentCount(site.id),
          clientSatisfaction: 85 // Mock value - would come from client feedback system
        }
      };
    }));
  }

  async getAssignmentConflicts(): Promise<AssignmentConflictDto[]> {
    this.logger.log('Fetching assignment conflicts');
    const tenantId = this.tenantContext.getTenantId();

    // For now, return mock conflicts - in production these would come from a conflicts detection system
    const mockConflicts: AssignmentConflictDto[] = [
      {
        id: 'conflict-1',
        type: 'scheduling',
        severity: 'high',
        description: 'Employee John Doe is double-booked for overlapping shifts at two different sites',
        affectedSites: ['Site A', 'Site B'],
        affectedGuards: ['John Doe'],
        suggestedResolution: 'Reassign one shift to available guard or adjust shift timing',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'conflict-2',
        type: 'skill_mismatch',
        severity: 'medium',
        description: 'Assigned guard lacks required certification for high-security site',
        affectedSites: ['Corporate HQ'],
        affectedGuards: ['Jane Smith'],
        suggestedResolution: 'Replace with certified guard or provide additional training',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    return mockConflicts;
  }

  async getEfficiencyMetrics(): Promise<DeploymentEfficiencyMetricsDto> {
    this.logger.log('Calculating deployment efficiency metrics');
    const tenantId = this.tenantContext.getTenantId();

    const sites = await this.prisma.site.count({
      where: {
        client: { companyId: tenantId },
        operationalStatus: 'ACTIVE'
      }
    });

    const assignments = await this.prisma.assignment.count({
      where: {
        site: { client: { companyId: tenantId } },
        status: 'ACTIVE'
      }
    });

    // Mock efficiency calculation - in production would be more sophisticated
    const averageEfficiency = sites > 0 ? Math.min(100, (assignments / sites) * 85) : 0;

    return {
      averageEfficiency,
      deploymentTrend: averageEfficiency > 80 ? 'up' : averageEfficiency > 60 ? 'stable' : 'down',
      optimizationOpportunities: [
        {
          siteId: 'site-1',
          siteName: 'Downtown Plaza',
          currentEfficiency: 75,
          potentialEfficiency: 95,
          recommendations: [
            'Adjust shift schedules to reduce overtime',
            'Cross-train guards for better flexibility'
          ]
        }
      ],
      responseTime: {
        averageAssignmentTime: 45, // minutes
        emergencyResponseTime: 15, // minutes
        targetResponseTime: 30 // minutes
      },
      costMetrics: {
        deploymentCostPerSite: 2500,
        overtimeCosts: 850,
        replacementCosts: 320,
        totalMonthlyCost: 25000
      }
    };
  }

  async getAnalytics(timeframe: '24h' | '7d' | '30d'): Promise<DeploymentAnalyticsDto> {
    this.logger.log(`Fetching deployment analytics for timeframe: ${timeframe}`);
    
    // Mock analytics data - in production would query actual data
    return {
      timeframe,
      metrics: {
        totalDeployments: 45,
        successfulAssignments: 42,
        emergencyReplacements: 3,
        averageResponseTime: 28,
        siteCoverageRate: 93.3,
        guardUtilizationRate: 87.5
      },
      trends: [
        { date: '2024-01-15', deployments: 45, efficiency: 88, conflicts: 2, alerts: 1 },
        { date: '2024-01-14', deployments: 43, efficiency: 85, conflicts: 3, alerts: 2 },
        { date: '2024-01-13', deployments: 44, efficiency: 90, conflicts: 1, alerts: 0 }
      ],
      topPerformingSites: [
        { siteId: 'site-1', siteName: 'Corporate Campus', efficiency: 98, attendanceRate: 99.2 },
        { siteId: 'site-2', siteName: 'Shopping Mall', efficiency: 95, attendanceRate: 97.8 }
      ],
      improvementAreas: [
        {
          area: 'Emergency Response Time',
          impact: 'high',
          recommendation: 'Maintain on-call guard pool for faster replacements',
          estimatedSavings: 5000
        }
      ]
    };
  }

  async getAssignmentRecommendations(siteId: string): Promise<AssignmentRecommendationsDto> {
    this.logger.log(`Getting assignment recommendations for site: ${siteId}`);
    const tenantId = this.tenantContext.getTenantId();

    // Verify site exists
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        client: { companyId: tenantId }
      },
      include: {
        requirements: true
      }
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // Get available guards
    const availableGuards = await this.prisma.employee.findMany({
      where: {
        companyId: tenantId,
        employmentStatus: 'ACTIVE',
        assignments: {
          none: {
            status: 'ACTIVE'
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        skills: true,
        experience: true
      }
    });

    // Calculate match scores based on skills, experience, etc.
    const recommendedGuards = availableGuards.map((guard: any) => {
      const matchScore = this.calculateMatchScore(guard, site);
      return {
        guardId: guard.id,
        guardName: `${guard.firstName} ${guard.lastName}`,
        matchScore,
        skills: guard.skills || [],
        availability: 'available',
        distance: Math.floor(Math.random() * 20) + 5 // Mock distance in km
      };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    return { recommendedGuards };
  }

  async getSiteHealth(siteId: string): Promise<SiteHealthDto> {
    this.logger.log(`Getting site health metrics for site: ${siteId}`);
    
    // Mock health data - in production would calculate from real metrics
    return {
      overallHealth: 85,
      metrics: {
        staffingLevel: 90,
        attendanceRate: 95,
        performanceScore: 88,
        incidentRate: 2
      },
      recommendations: [
        'Consider adding backup guard for peak hours',
        'Implement additional security training',
        'Review incident patterns for prevention strategies'
      ]
    };
  }

  async quickAssign(quickAssignDto: QuickAssignDto): Promise<void> {
    this.logger.log(`Quick assigning guard to site: ${quickAssignDto.siteId}`);
    const tenantId = this.tenantContext.getTenantId();

    let guardId = quickAssignDto.guardId;

    // If no specific guard provided, find the best match
    if (!guardId) {
      const recommendations = await this.getAssignmentRecommendations(quickAssignDto.siteId);
      if (recommendations.recommendedGuards.length === 0) {
        throw new BadRequestException('No available guards found for assignment');
      }
      guardId = recommendations.recommendedGuards[0].guardId;
    }

    // Create the assignment
    await this.prisma.assignment.create({
      data: {
        employeeId: guardId,
        siteId: quickAssignDto.siteId,
        role: 'Security Guard',
        responsibilities: { patrol: true, monitoring: true },
        hourlyRate: 25.0, // Default rate - should come from employee or site config
        status: 'ACTIVE',
        startDate: new Date(),
      }
    });

    this.logger.log(`Successfully assigned guard ${guardId} to site ${quickAssignDto.siteId}`);
  }

  async requestEmergencyReplacement(emergencyDto: EmergencyReplacementDto): Promise<void> {
    this.logger.log(`Requesting emergency replacement for site: ${emergencyDto.siteId}`);
    
    // In production, this would:
    // 1. Create an emergency alert
    // 2. Notify available guards via SMS/push
    // 3. Update site status to critical
    // 4. Log the emergency request
    
    // For now, just log the request
    this.logger.log(`Emergency replacement requested for site ${emergencyDto.siteId}: ${emergencyDto.reason}`);
  }

  async bulkAssign(bulkAssignDto: BulkAssignDto): Promise<void> {
    this.logger.log(`Processing ${bulkAssignDto.assignments.length} bulk assignments`);
    
    // Process assignments in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const assignment of bulkAssignDto.assignments) {
        await tx.assignment.create({
          data: {
            employeeId: assignment.guardId,
            siteId: assignment.siteId,
            role: assignment.role,
            responsibilities: { assigned: true },
            hourlyRate: 25.0, // Default rate
            status: 'ACTIVE',
            startDate: new Date(assignment.startDate),
            endDate: assignment.endDate ? new Date(assignment.endDate) : null,
          }
        });
      }
    });

    this.logger.log(`Successfully processed ${bulkAssignDto.assignments.length} bulk assignments`);
  }

  async optimizeDeployments(optimizeDto: OptimizeDeploymentsDto): Promise<any> {
    this.logger.log('Optimizing deployments based on constraints');
    
    // Mock optimization result - in production would use optimization algorithms
    return {
      optimizedAssignments: [
        {
          siteId: 'site-1',
          guardId: 'guard-1',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          confidence: 95
        }
      ],
      efficiencyGain: 12.5,
      costSavings: 2500
    };
  }

  async updateSiteRequirements(siteId: string, updateDto: UpdateSiteRequirementsDto): Promise<void> {
    this.logger.log(`Updating requirements for site: ${siteId}`);
    
    await this.prisma.site.update({
      where: { id: siteId },
      data: {
        requiredSkills: updateDto.skills,
        minimumExperience: updateDto.minimumExperience,
        shiftPattern: updateDto.shiftPattern,
        // In production, would update a requirements table or JSONB field
      }
    });

    this.logger.log(`Successfully updated requirements for site ${siteId}`);
  }

  async resolveConflict(conflictId: string, resolveDto: ResolveConflictDto): Promise<void> {
    this.logger.log(`Resolving conflict: ${conflictId}`);
    
    // In production, would update conflict status and apply resolution
    this.logger.log(`Conflict ${conflictId} resolved with action: ${resolveDto.action}`);
  }

  // Helper methods
  private calculateRequiredGuards(site: any): number {
    // Simple calculation - in production would be based on site requirements
    return 1; // Default 1 guard per site
  }

  private async calculateAttendanceRate(siteId: string): Promise<number> {
    // Mock calculation - in production would query actual attendance data
    return Math.floor(Math.random() * 20) + 80; // Random between 80-100%
  }

  private async calculateIncidentCount(siteId: string): Promise<number> {
    // Mock calculation - in production would query incident reports
    return Math.floor(Math.random() * 5); // Random between 0-4 incidents
  }

  private calculateMatchScore(guard: any, site: any): number {
    // Simple matching algorithm - in production would be more sophisticated
    let score = 50; // Base score
    
    const guardSkills = guard.skills || [];
    const requiredSkills = site.requiredSkills || [];
    
    // Skill matching
    const matchingSkills = guardSkills.filter((skill: string) => 
      requiredSkills.includes(skill)
    ).length;
    score += (matchingSkills / Math.max(1, requiredSkills.length)) * 30;
    
    // Experience bonus
    if (guard.experience >= (site.minimumExperience || 0)) {
      score += 20;
    }
    
    return Math.min(100, score);
  }
}