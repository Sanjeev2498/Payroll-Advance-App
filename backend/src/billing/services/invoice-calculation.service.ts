import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { GstCalculationService } from './gst-calculation.service';
import { Decimal } from 'decimal.js';
import { Prisma, AttendanceStatus, ShiftType } from '@prisma/client';
import {
  BillingCalculationResult,
  DeploymentHours,
  SiteDeploymentSummary,
} from '../dto/billing-calculation.dto';
import {
  BillingModel,
  CreateInvoiceDto,
} from '../dto/create-invoice.dto';
import {
  GstCalculationInput,
} from '../dto/gst-calculation.dto';

@Injectable()
export class InvoiceCalculationService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private gstCalculationService: GstCalculationService,
  ) {}

  /**
   * Calculate billing for a client based on workforce deployment
   */
  async calculateClientBilling(dto: CreateInvoiceDto): Promise<BillingCalculationResult> {
    const companyId = this.tenantContext.getTenantId();
    
    // Validate date range
    const startDate = new Date(dto.billingPeriodStart);
    const endDate = new Date(dto.billingPeriodEnd);
    
    if (startDate >= endDate) {
      throw new BadRequestException('Billing period start date must be before end date');
    }

    // Get client information
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, companyId },
      include: {
        sites: {
          where: dto.siteIds ? { id: { in: dto.siteIds } } : undefined,
        },
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // Get deployment data (attendance records with site and assignment information)
    const deploymentData = await this.getDeploymentData(
      companyId,
      dto.clientId,
      startDate,
      endDate,
      dto.siteIds,
      dto.assignmentIds,
    );

    // Calculate billing based on model
    const billingModel = dto.billingModel || BillingModel.HOURLY;
    const siteDeployments = await this.calculateSiteDeployments(
      deploymentData,
      billingModel,
      dto.customRates,
    );

    // Calculate totals
    const summary = this.calculateBillingSummary(siteDeployments, dto.additionalCharges);

    // Calculate GST if GST details provided
    let gstBreakdown;
    if (dto.gstDetails) {
      const gstInput: GstCalculationInput = {
        taxableAmount: summary.taxableAmount,
        companyGstin: dto.gstDetails.companyGstin,
        clientGstin: dto.gstDetails.clientGstin,
        placeOfSupply: dto.gstDetails.placeOfSupply,
        companyState: dto.gstDetails.companyGstin.substring(0, 2), // Extract state from company GSTIN
        isInterState: dto.gstDetails.isInterState,
        serviceType: 'SECURITY_SERVICES', // Default, could be configurable
      };

      const gstResult = this.gstCalculationService.calculateGst(gstInput);
      
      summary.gstAmount = gstResult.totalGst;
      summary.totalAmount = gstResult.totalAmount;
      
      gstBreakdown = {
        cgst: gstResult.cgst,
        sgst: gstResult.sgst,
        igst: gstResult.igst,
        utgst: gstResult.utgst,
      };
    }

    return {
      clientId: client.id,
      clientName: client.name,
      billingPeriod: {
        start: startDate,
        end: endDate,
      },
      siteDeployments,
      summary,
      gstBreakdown,
    };
  }

  /**
   * Get deployment data for billing calculation
   */
  private async getDeploymentData(
    companyId: string,
    clientId: string,
    startDate: Date,
    endDate: Date,
    siteIds?: string[],
    assignmentIds?: string[],
  ) {
    // Build shift filter
    const shiftFilter: any = {
      site: { clientId },
      shiftDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Filter by sites if specified
    if (siteIds?.length) {
      shiftFilter.siteId = { in: siteIds };
    }

    // Filter by assignments if specified
    if (assignmentIds?.length) {
      shiftFilter.assignmentId = { in: assignmentIds };
    }

    const whereClause: Prisma.AttendanceWhereInput = {
      employee: { companyId },
      shift: shiftFilter,
      status: AttendanceStatus.PRESENT,
      clockIn: { not: null },
      clockOut: { not: null },
    };

    return this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        shift: {
          select: {
            id: true,
            shiftDate: true,
            startTime: true,
            endTime: true,
            shiftType: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
            assignment: {
              select: {
                id: true,
                hourlyRate: true,
              },
            },
          },
        },
      },
      orderBy: [
        { shift: { site: { name: 'asc' } } },
        { employee: { employeeNumber: 'asc' } },
        { clockIn: 'asc' },
      ],
    });
  }

  /**
   * Calculate site deployments with hours and billing amounts
   */
  private async calculateSiteDeployments(
    deploymentData: any[],
    billingModel: BillingModel,
    customRates?: { [siteId: string]: any },
  ): Promise<SiteDeploymentSummary[]> {
    // Group by site and assignment
    const siteGroups = new Map<string, any[]>();
    
    for (const record of deploymentData) {
      const siteId = record.shift.site.id;
      if (!siteGroups.has(siteId)) {
        siteGroups.set(siteId, []);
      }
      siteGroups.get(siteId)!.push(record);
    }

    const siteDeployments: SiteDeploymentSummary[] = [];

    for (const [siteId, siteRecords] of siteGroups.entries()) {
      const siteName = siteRecords[0].shift.site.name;
      
      // Group by employee within site
      const employeeGroups = new Map<string, any[]>();
      
      for (const record of siteRecords) {
        const employeeId = record.employee.id;
        if (!employeeGroups.has(employeeId)) {
          employeeGroups.set(employeeId, []);
        }
        employeeGroups.get(employeeId)!.push(record);
      }

      const deployments: DeploymentHours[] = [];
      let totalSiteRegularHours = 0;
      let totalSiteOvertimeHours = 0;
      let totalSiteHolidayHours = 0;
      let totalSiteAmount = new Decimal(0);

      for (const [employeeId, employeeRecords] of employeeGroups.entries()) {
        const employee = employeeRecords[0].employee;
        const assignment = employeeRecords[0].shift.assignment;
        
        // Calculate hours for this employee at this site
        const hoursCalculation = this.calculateEmployeeHours(employeeRecords);
        
        // Get rates (custom rates override assignment rates)
        const rates = this.getApplicableRates(
          siteId,
          assignment,
          customRates,
          billingModel,
        );

        // Calculate amounts
        const regularAmount = new Decimal(hoursCalculation.regularHours).mul(rates.hourlyRate);
        const overtimeAmount = new Decimal(hoursCalculation.overtimeHours).mul(rates.overtimeRate);
        const holidayAmount = new Decimal(hoursCalculation.holidayHours).mul(rates.holidayRate);
        const totalAmount = regularAmount.add(overtimeAmount).add(holidayAmount);

        deployments.push({
          siteId,
          siteName,
          assignmentId: assignment.id,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber,
          regularHours: hoursCalculation.regularHours,
          overtimeHours: hoursCalculation.overtimeHours,
          holidayHours: hoursCalculation.holidayHours,
          totalHours: hoursCalculation.totalHours,
          hourlyRate: rates.hourlyRate,
          overtimeRate: rates.overtimeRate,
          holidayRate: rates.holidayRate,
          totalAmount,
        });

        totalSiteRegularHours += hoursCalculation.regularHours;
        totalSiteOvertimeHours += hoursCalculation.overtimeHours;
        totalSiteHolidayHours += hoursCalculation.holidayHours;
        totalSiteAmount = totalSiteAmount.add(totalAmount);
      }

      siteDeployments.push({
        siteId,
        siteName,
        totalRegularHours: totalSiteRegularHours,
        totalOvertimeHours: totalSiteOvertimeHours,
        totalHolidayHours: totalSiteHolidayHours,
        totalHours: totalSiteRegularHours + totalSiteOvertimeHours + totalSiteHolidayHours,
        totalAmount: totalSiteAmount,
        deployments,
      });
    }

    return siteDeployments;
  }

  /**
   * Calculate employee hours from attendance records
   */
  private calculateEmployeeHours(attendanceRecords: any[]): {
    regularHours: number;
    overtimeHours: number;
    holidayHours: number;
    totalHours: number;
  } {
    let regularHours = 0;
    let overtimeHours = 0;
    let holidayHours = 0;

    for (const record of attendanceRecords) {
      const clockIn = new Date(record.clockIn);
      const clockOut = new Date(record.clockOut);
      const workedHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const shiftType = record.shift.shiftType;
      
      if (shiftType === ShiftType.HOLIDAY) {
        holidayHours += workedHours;
      } else if (shiftType === ShiftType.OVERTIME) {
        overtimeHours += workedHours;
      } else {
        // For regular shifts, check if worked hours exceed standard hours (8 hours)
        const standardHours = 8;
        if (workedHours <= standardHours) {
          regularHours += workedHours;
        } else {
          regularHours += standardHours;
          overtimeHours += (workedHours - standardHours);
        }
      }
    }

    return {
      regularHours: Math.round(regularHours * 100) / 100, // Round to 2 decimal places
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      holidayHours: Math.round(holidayHours * 100) / 100,
      totalHours: Math.round((regularHours + overtimeHours + holidayHours) * 100) / 100,
    };
  }

  /**
   * Get applicable billing rates
   */
  private getApplicableRates(
    siteId: string,
    assignment: any,
    customRates?: { [siteId: string]: any },
    billingModel: BillingModel = BillingModel.HOURLY,
  ) {
    let hourlyRate = assignment.hourlyRate;
    let overtimeRate = assignment.hourlyRate.mul(1.5); // Default 1.5x for overtime
    let holidayRate = assignment.hourlyRate.mul(2.0); // Default 2x for holidays

    // Apply custom rates if provided
    if (customRates?.[siteId]) {
      const custom = customRates[siteId];
      if (custom.hourlyRate) hourlyRate = new Decimal(custom.hourlyRate);
      if (custom.overtimeRate) overtimeRate = new Decimal(custom.overtimeRate);
      if (custom.holidayRate) holidayRate = new Decimal(custom.holidayRate);
    }

    return {
      hourlyRate,
      overtimeRate,
      holidayRate,
    };
  }

  /**
   * Calculate billing summary
   */
  private calculateBillingSummary(
    siteDeployments: SiteDeploymentSummary[],
    additionalCharges?: { name: string; amount: number; taxable: boolean }[],
  ) {
    const totalRegularHours = siteDeployments.reduce(
      (sum, site) => sum + site.totalRegularHours,
      0,
    );
    const totalOvertimeHours = siteDeployments.reduce(
      (sum, site) => sum + site.totalOvertimeHours,
      0,
    );
    const totalHolidayHours = siteDeployments.reduce(
      (sum, site) => sum + site.totalHolidayHours,
      0,
    );
    const subtotal = siteDeployments.reduce(
      (sum, site) => sum.add(site.totalAmount),
      new Decimal(0),
    );

    // Calculate additional charges
    const additionalChargesAmount = additionalCharges
      ? additionalCharges.reduce(
          (sum, charge) => sum.add(charge.amount),
          new Decimal(0),
        )
      : new Decimal(0);

    const taxableAdditionalCharges = additionalCharges
      ? additionalCharges
          .filter(charge => charge.taxable)
          .reduce((sum, charge) => sum.add(charge.amount), new Decimal(0))
      : new Decimal(0);

    const taxableAmount = subtotal.add(taxableAdditionalCharges);

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalHolidayHours,
      totalHours: totalRegularHours + totalOvertimeHours + totalHolidayHours,
      subtotal,
      additionalCharges: additionalChargesAmount,
      taxableAmount,
      gstAmount: new Decimal(0), // Will be calculated if GST details provided
      totalAmount: taxableAmount.add(additionalChargesAmount), // Will be updated with GST
    };
  }

  /**
   * Generate invoice number
   */
  async generateInvoiceNumber(companyId: string, clientId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get client code (first 3 characters of name)
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId },
      select: { name: true },
    });

    const clientCode = client?.name
      .replace(/[^A-Z0-9]/gi, '')
      .substring(0, 3)
      .toUpperCase() || 'CLI';

    // Count invoices for this client in current month
    const count = await this.prisma.invoice.count({
      where: {
        clientId,
        createdAt: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `INV-${clientCode}-${year}${month}-${sequence}`;
  }
}
