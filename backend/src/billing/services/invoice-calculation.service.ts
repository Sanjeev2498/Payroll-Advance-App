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

    // Get contract and client information
    const contract = await this.prisma.contracts.findFirst({
      where: { id: dto.contractId, clients: { company_id: companyId } },
      include: {
        clients: true,
        sites: {
          where: dto.siteIds ? { id: { in: dto.siteIds } } : undefined,
        },
      },
    });

    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    const client = contract.clients;

    // Get deployment data (attendance records with site and assignment information)
    const deploymentData = await this.getDeploymentData(
      companyId,
      dto.contractId,
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
        taxableAmount: gstResult.taxableAmount,
        gstRate: gstResult.gstRate,
        cgst: gstResult.cgst,
        sgst: gstResult.sgst,
        igst: gstResult.igst,
        utgst: gstResult.utgst,
        totalGst: gstResult.totalGst,
        totalAmount: gstResult.totalAmount,
        isInterState: gstResult.isInterState,
        hsnCode: gstResult.hsnCode,
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
    contractId: string,
    startDate: Date,
    endDate: Date,
    siteIds?: string[],
    assignmentIds?: string[],
  ) {
    // Build shift filter
    const shiftFilter: any = {
      sites: { contract_id: contractId },
      shift_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Filter by sites if specified
    if (siteIds?.length) {
      shiftFilter.site_id = { in: siteIds };
    }

    // Filter by assignments if specified
    if (assignmentIds?.length) {
      shiftFilter.assignment_id = { in: assignmentIds };
    }

    const whereClause: Prisma.attendanceWhereInput = {
      employees: { company_id: companyId },
      shifts: shiftFilter,
      status: AttendanceStatus.PRESENT,
      clock_in: { not: null },
      clock_out: { not: null },
    };

    return this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        employees: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            employee_number: true,
          },
        },
        shifts: {
          select: {
            id: true,
            shift_date: true,
            start_time: true,
            end_time: true,
            shift_type: true,
            sites: {
              select: {
                id: true,
                name: true,
              },
            },
            assignments: {
              select: {
                id: true,
                hourly_rate: true,
              },
            },
          },
        },
      },
      orderBy: [
        { shifts: { sites: { name: 'asc' } } },
        { employees: { employee_number: 'asc' } },
        { clock_in: 'asc' },
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
      const siteId = record.shifts.sites.id;
      if (!siteGroups.has(siteId)) {
        siteGroups.set(siteId, []);
      }
      siteGroups.get(siteId)!.push(record);
    }

    const siteDeployments: SiteDeploymentSummary[] = [];

    for (const [siteId, siteRecords] of siteGroups.entries()) {
      const siteName = siteRecords[0].shifts.sites.name;
      
      // Group by employee within site
      const employeeGroups = new Map<string, any[]>();
      
      for (const record of siteRecords) {
        const employeeId = record.employees.id;
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
        const employee = employeeRecords[0].employees;
        const assignment = employeeRecords[0].shifts.assignments;
        
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
          employeeName: `${employee.first_name} ${employee.last_name}`,
          employeeNumber: employee.employee_number,
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
      const clockIn = new Date(record.clock_in);
      const clockOut = new Date(record.clock_out);
      const workedHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const shiftType = record.shifts.shift_type;
      
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
    let hourlyRate = new Decimal(assignment.hourly_rate);
    let overtimeRate = new Decimal(assignment.hourly_rate).mul(1.5); // Default 1.5x for overtime
    let holidayRate = new Decimal(assignment.hourly_rate).mul(2.0); // Default 2x for holidays

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
   * Generate invoice number - FIXED: Updated to use contractId
   */
  async generateInvoiceNumber(companyId: string, contractId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get contract and client information through contract relationship
    const contract = await this.prisma.contracts.findFirst({
      where: { 
        id: contractId,
        clients: { company_id: companyId } // Filter by tenant in the main where clause
      },
      include: { 
        clients: {
          select: { name: true }
        }
      },
    });

    // Handle case where contract is not found
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    const clientCode = contract?.clients?.name
      ?.replace(/[^A-Z0-9]/gi, '')
      ?.substring(0, 3)
      ?.toUpperCase() || 'CLI';

    // Count invoices for this client in current month
    const count = await this.prisma.invoices.count({
      where: {
        client_id: contract.client_id, // Use the client_id from the contract
        created_at: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `INV-${clientCode}-${year}${month}-${sequence}`;
  }
}
