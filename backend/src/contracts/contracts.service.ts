import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAmendmentDto, ApproveAmendmentDto, AmendmentStatus } from './dto/contract-amendment.dto';
import { InitiateRenewalDto, ApproveRenewalDto, RenewalStatus } from './dto/contract-renewal.dto';
import { CreateSLAComplianceReportDto, SLAComplianceQueryDto, ComplianceStatus } from './dto/sla-compliance.dto';
import { Contract, ContractStatus, Prisma } from '@prisma/client';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  async create(createContractDto: CreateContractDto): Promise<Contract> {
    this.logger.log(`Creating contract: ${createContractDto.title}`);

    // Validate client exists and belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: createContractDto.clientId,
        companyId: this.tenantContext.getTenantId(),
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found or does not belong to your organization');
    }

    // Generate unique contract number
    const contractNumber = await this.generateContractNumber();

    // Transform DTOs to Prisma JSON format
    const serviceDefinitions = this.transformServiceDefinitions(createContractDto.serviceDefinitions);
    const billingPreferences = this.transformBillingConfiguration(createContractDto.billingConfiguration);
    const serviceLevelAgreement = createContractDto.serviceLevelAgreement || null;
    const defaultBillingRates = createContractDto.defaultBillingRates || null;
    const paymentTerms = createContractDto.paymentTerms || null;

    try {
      const contract = await this.prisma.contract.create({
        data: {
          contractNumber,
          clientId: createContractDto.clientId,
          title: createContractDto.title,
          description: createContractDto.description,
          status: createContractDto.status,
          startDate: new Date(createContractDto.startDate),
          endDate: createContractDto.endDate ? new Date(createContractDto.endDate) : null,
          serviceDefinitions: serviceDefinitions as Prisma.JsonObject,
          serviceLevelAgreement: serviceLevelAgreement as Prisma.JsonObject,
          billingPreferences: billingPreferences as Prisma.JsonObject,
          defaultBillingRates: defaultBillingRates as any,
          contractValue: createContractDto.contractValue,
          paymentTerms: paymentTerms as Prisma.JsonObject,
          renewalNotificationDays: createContractDto.renewalNotificationDays || 90,
          autoRenewalEnabled: createContractDto.autoRenewalEnabled || false,
          contractHistory: {
            created: {
              timestamp: new Date().toISOString(),
              action: 'CREATED',
              details: 'Contract created',
            },
          } as Prisma.JsonObject,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
        },
      });

      this.logger.log(`Contract created successfully: ${contract.id}`);
      return contract;
    } catch (error: any) {
      this.logger.error(`Failed to create contract: ${error.message}`);
      throw new BadRequestException('Failed to create contract');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ContractStatus,
    clientId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ContractWhereInput = {
      client: {
        companyId: this.tenantContext.getTenantId(),
      },
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
          sites: {
            select: {
              id: true,
              name: true,
              operationalStatus: true,
            },
          },
          _count: {
            select: {
              sites: true,
              invoices: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactInfo: true,
          },
        },
        sites: {
          include: {
            assignments: {
              select: {
                id: true,
                status: true,
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            dueDate: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Latest 5 invoices
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async update(id: string, updateContractDto: UpdateContractDto): Promise<Contract> {
    this.logger.log(`Updating contract: ${id}`);

    // Verify contract exists and belongs to tenant
    const existingContract = await this.findOne(id);

    const updateData: Prisma.ContractUpdateInput = {};

    // Handle basic fields
    if (updateContractDto.title !== undefined) {
      updateData.title = updateContractDto.title;
    }
    if (updateContractDto.description !== undefined) {
      updateData.description = updateContractDto.description;
    }
    if (updateContractDto.status !== undefined) {
      updateData.status = updateContractDto.status;
    }
    if (updateContractDto.startDate !== undefined) {
      updateData.startDate = new Date(updateContractDto.startDate);
    }
    if (updateContractDto.endDate !== undefined) {
      updateData.endDate = updateContractDto.endDate ? new Date(updateContractDto.endDate) : null;
    }

    // Handle JSON fields
    if (updateContractDto.serviceDefinitions) {
      updateData.serviceDefinitions = this.transformServiceDefinitions(
        updateContractDto.serviceDefinitions,
      ) as Prisma.JsonObject;
    }
    if (updateContractDto.serviceLevelAgreement) {
      updateData.serviceLevelAgreement = updateContractDto.serviceLevelAgreement as Prisma.JsonObject;
    }
    if (updateContractDto.billingConfiguration) {
      updateData.billingPreferences = this.transformBillingConfiguration(
        updateContractDto.billingConfiguration,
      ) as Prisma.JsonObject;
    }
    if (updateContractDto.defaultBillingRates) {
      updateData.defaultBillingRates = updateContractDto.defaultBillingRates as any;
    }

    // Update contract history
    const currentHistory = (existingContract.contractHistory as any) || {};
    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      action: 'UPDATED',
      details: 'Contract updated',
      changes: Object.keys(updateContractDto),
    };

    updateData.contractHistory = {
      ...currentHistory,
      [`update_${Date.now()}`]: newHistoryEntry,
    } as Prisma.JsonObject;

    try {
      const updatedContract = await this.prisma.contract.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
        },
      });

      this.logger.log(`Contract updated successfully: ${id}`);
      return updatedContract;
    } catch (error: any) {
      this.logger.error(`Failed to update contract: ${error.message}`);
      throw new BadRequestException('Failed to update contract');
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting contract: ${id}`);

    // Verify contract exists and belongs to tenant
    await this.findOne(id);

    // Check if contract has active sites
    const activeSites = await this.prisma.site.count({
      where: {
        contractId: id,
        operationalStatus: 'ACTIVE',
      },
    });

    if (activeSites > 0) {
      throw new BadRequestException('Cannot delete contract with active sites');
    }

    try {
      await this.prisma.contract.update({
        where: { id },
        data: {
          status: ContractStatus.TERMINATED,
          endDate: new Date(),
        },
      });

      this.logger.log(`Contract soft deleted successfully: ${id}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete contract: ${error.message}`);
      throw new BadRequestException('Failed to delete contract');
    }
  }

  // Contract Amendment Management
  async createAmendment(amendmentDto: CreateContractAmendmentDto) {
    this.logger.log(`Creating amendment for contract: ${amendmentDto.contractId}`);

    // Verify contract exists and belongs to tenant
    await this.findOne(amendmentDto.contractId);

    // Store amendment in contract history
    const amendment = {
      id: `amendment_${Date.now()}`,
      type: amendmentDto.type,
      title: amendmentDto.title,
      description: amendmentDto.description,
      effectiveDate: amendmentDto.effectiveDate,
      changes: amendmentDto.changes,
      justification: amendmentDto.justification,
      financialImpact: amendmentDto.financialImpact,
      approvals: amendmentDto.approvals,
      status: AmendmentStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };

    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: amendmentDto.contractId },
      });

      const currentHistory = (contract.contractHistory as any) || {};
      const updatedHistory = {
        ...currentHistory,
        amendments: {
          ...(currentHistory.amendments || {}),
          [amendment.id]: amendment,
        },
      };

      await this.prisma.contract.update({
        where: { id: amendmentDto.contractId },
        data: {
          contractHistory: updatedHistory as Prisma.JsonObject,
        },
      });

      this.logger.log(`Amendment created successfully: ${amendment.id}`);
      return amendment;
    } catch (error: any) {
      this.logger.error(`Failed to create amendment: ${error.message}`);
      throw new BadRequestException('Failed to create amendment');
    }
  }

  async approveAmendment(
    contractId: string,
    amendmentId: string,
    approvalDto: ApproveAmendmentDto,
  ) {
    this.logger.log(`Processing amendment approval: ${amendmentId}`);

    const contract = await this.findOne(contractId);
    const history = contract.contractHistory as any;
    const amendment = history?.amendments?.[amendmentId];

    if (!amendment) {
      throw new NotFoundException('Amendment not found');
    }

    // Update amendment status
    amendment.status = approvalDto.approved ? AmendmentStatus.APPROVED : AmendmentStatus.REJECTED;
    amendment.approvalComments = approvalDto.comments;
    amendment.approvalConditions = approvalDto.conditions;
    amendment.approvedAt = new Date().toISOString();

    // If approved, apply changes to contract
    if (approvalDto.approved) {
      const updateData: any = {};

      for (const change of amendment.changes) {
        // Apply each change to the contract
        this.applyAmendmentChange(updateData, change);
      }

      // Update contract with amendments
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          ...updateData,
          contractHistory: {
            ...history,
            amendments: {
              ...history.amendments,
              [amendmentId]: { ...amendment, status: AmendmentStatus.IMPLEMENTED },
            },
          } as Prisma.JsonObject,
        },
      });

      this.logger.log(`Amendment approved and implemented: ${amendmentId}`);
    } else {
      // Just update the history with rejection
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          contractHistory: {
            ...history,
            amendments: {
              ...history.amendments,
              [amendmentId]: amendment,
            },
          } as Prisma.JsonObject,
        },
      });

      this.logger.log(`Amendment rejected: ${amendmentId}`);
    }

    return amendment;
  }

  // Contract Renewal Management
  async initiateRenewal(renewalDto: InitiateRenewalDto) {
    this.logger.log(`Initiating renewal for contract: ${renewalDto.contractId}`);

    await this.findOne(renewalDto.contractId);

    const renewal = {
      id: `renewal_${Date.now()}`,
      type: renewalDto.renewalType,
      justification: renewalDto.justification,
      proposedTerms: renewalDto.proposedTerms,
      clientNotificationRequired: renewalDto.clientNotificationRequired,
      managementApprovalRequired: renewalDto.managementApprovalRequired,
      notes: renewalDto.notes,
      status: RenewalStatus.PENDING,
      initiatedAt: new Date().toISOString(),
    };

    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: renewalDto.contractId },
      });

      const currentHistory = (contract.contractHistory as any) || {};
      const updatedHistory = {
        ...currentHistory,
        renewals: {
          ...(currentHistory.renewals || {}),
          [renewal.id]: renewal,
        },
      };

      await this.prisma.contract.update({
        where: { id: renewalDto.contractId },
        data: {
          contractHistory: updatedHistory as Prisma.JsonObject,
        },
      });

      this.logger.log(`Renewal initiated successfully: ${renewal.id}`);
      return renewal;
    } catch (error: any) {
      this.logger.error(`Failed to initiate renewal: ${error.message}`);
      throw new BadRequestException('Failed to initiate renewal');
    }
  }

  async approveRenewal(
    contractId: string,
    renewalId: string,
    approvalDto: ApproveRenewalDto,
  ) {
    this.logger.log(`Processing renewal approval: ${renewalId}`);

    const contract = await this.findOne(contractId);
    const history = contract.contractHistory as any;
    const renewal = history?.renewals?.[renewalId];

    if (!renewal) {
      throw new NotFoundException('Renewal not found');
    }

    renewal.status = approvalDto.approved ? RenewalStatus.APPROVED : RenewalStatus.REJECTED;
    renewal.approvalComments = approvalDto.comments;
    renewal.approvedAt = new Date().toISOString();

    if (approvalDto.modifiedTerms) {
      renewal.finalTerms = approvalDto.modifiedTerms;
    }

    if (approvalDto.approved) {
      // Create new contract or update current one based on renewal terms
      const terms = approvalDto.modifiedTerms || renewal.proposedTerms;

      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          startDate: new Date(terms.newStartDate),
          endDate: new Date(terms.newEndDate),
          serviceDefinitions: terms.updatedServiceDefinitions
            ? (this.transformServiceDefinitions(terms.updatedServiceDefinitions) as Prisma.JsonObject)
            : contract.serviceDefinitions,
          defaultBillingRates: terms.updatedBillingRates
            ? (terms.updatedBillingRates as Prisma.JsonObject)
            : contract.defaultBillingRates,
          serviceLevelAgreement: terms.updatedSLA
            ? (terms.updatedSLA as Prisma.JsonObject)
            : contract.serviceLevelAgreement,
          contractHistory: {
            ...history,
            renewals: {
              ...history.renewals,
              [renewalId]: { ...renewal, status: RenewalStatus.EXECUTED },
            },
          } as Prisma.JsonObject,
        },
      });

      this.logger.log(`Renewal approved and executed: ${renewalId}`);
    } else {
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          contractHistory: {
            ...history,
            renewals: {
              ...history.renewals,
              [renewalId]: renewal,
            },
          } as Prisma.JsonObject,
        },
      });

      this.logger.log(`Renewal rejected: ${renewalId}`);
    }

    return renewal;
  }

  // SLA Tracking and Compliance
  async createSLAComplianceReport(reportDto: CreateSLAComplianceReportDto) {
    this.logger.log(`Creating SLA compliance report for contract: ${reportDto.contractId}`);

    await this.findOne(reportDto.contractId);

    const report = {
      id: `sla_report_${Date.now()}`,
      ...reportDto,
      createdAt: new Date().toISOString(),
    };

    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: reportDto.contractId },
      });

      const currentHistory = (contract.contractHistory as any) || {};
      const updatedHistory = {
        ...currentHistory,
        slaReports: {
          ...(currentHistory.slaReports || {}),
          [report.id]: report,
        },
      };

      await this.prisma.contract.update({
        where: { id: reportDto.contractId },
        data: {
          contractHistory: updatedHistory as Prisma.JsonObject,
        },
      });

      this.logger.log(`SLA compliance report created: ${report.id}`);
      return report;
    } catch (error: any) {
      this.logger.error(`Failed to create SLA report: ${error.message}`);
      throw new BadRequestException('Failed to create SLA compliance report');
    }
  }

  async getSLACompliance(contractId: string, query: SLAComplianceQueryDto) {
    this.logger.log(`Retrieving SLA compliance data for contract: ${contractId}`);

    const contract = await this.findOne(contractId);
    const history = contract.contractHistory as any;
    const slaReports = history?.slaReports || {};

    // Filter reports based on query parameters
    let filteredReports = Object.values(slaReports).filter((report: any) => {
      if (query.startDate && report.periodStart < query.startDate) return false;
      if (query.endDate && report.periodEnd > query.endDate) return false;
      if (query.status && report.overallStatus !== query.status) return false;
      return true;
    });

    // Calculate aggregated compliance metrics
    const aggregatedMetrics = this.calculateAggregatedSLAMetrics(filteredReports);

    return {
      contractId,
      reports: filteredReports,
      aggregatedMetrics,
      summary: {
        totalReports: filteredReports.length,
        averageCompliance: aggregatedMetrics.averageCompliancePercentage,
        trendsAnalysis: this.calculateComplianceTrends(filteredReports),
      },
    };
  }

  // Helper methods
  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count({
      where: {
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    });

    return `CNT-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }

  private transformServiceDefinitions(serviceDefinitions: any) {
    return {
      guardCount: serviceDefinitions.guardCount,
      minStaffingLevel: serviceDefinitions.minStaffingLevel,
      maxStaffingLevel: serviceDefinitions.maxStaffingLevel,
      shiftPatterns: serviceDefinitions.shiftPatterns || {},
      supervisorRequirements: serviceDefinitions.supervisorRequirements || {},
      coverageSpecifications: serviceDefinitions.coverageSpecifications || {},
      requiredSkills: serviceDefinitions.requiredSkills || [],
      equipment: serviceDefinitions.equipment || {},
    };
  }

  private transformBillingConfiguration(billingConfig: any) {
    return {
      billingFrequency: billingConfig.billingFrequency,
      rates: billingConfig.rates,
      paymentTerms: billingConfig.paymentTerms,
      lateFeePercentage: billingConfig.lateFeePercentage,
      invoiceGenerationDay: billingConfig.invoiceGenerationDay,
      autoInvoiceGeneration: billingConfig.autoInvoiceGeneration,
      taxRate: billingConfig.taxRate,
      discountPercentage: billingConfig.discountPercentage,
    };
  }

  private applyAmendmentChange(updateData: any, change: any) {
    // Apply specific field changes to the contract update data
    switch (change.field) {
      case 'serviceDefinitions.guardCount':
        if (!updateData.serviceDefinitions) updateData.serviceDefinitions = {};
        updateData.serviceDefinitions.guardCount = change.newValue;
        break;
      case 'billingRates.regularHourlyRate':
        if (!updateData.defaultBillingRates) updateData.defaultBillingRates = {};
        updateData.defaultBillingRates.regularHourlyRate = change.newValue;
        break;
      // Add more field mappings as needed
      default:
        this.logger.warn(`Unknown amendment field: ${change.field}`);
    }
  }

  private calculateAggregatedSLAMetrics(reports: any[]): any {
    if (reports.length === 0) {
      return {
        averageCompliancePercentage: 0,
        totalViolations: 0,
        totalFinancialImpact: 0,
      };
    }

    const totalCompliance = reports.reduce((sum, report) => sum + report.compliancePercentage, 0);
    const totalViolations = reports.reduce(
      (sum, report) => sum + (report.violations?.length || 0),
      0,
    );
    const totalFinancialImpact = reports.reduce(
      (sum, report) => sum + (report.totalFinancialImpact || 0),
      0,
    );

    return {
      averageCompliancePercentage: totalCompliance / reports.length,
      totalViolations,
      totalFinancialImpact,
    };
  }

  private calculateComplianceTrends(reports: any[]): any {
    if (reports.length < 2) {
      return { trend: 'INSUFFICIENT_DATA' };
    }

    // Sort by period start date
    const sortedReports = reports.sort((a, b) => 
      new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
    );

    const firstHalf = sortedReports.slice(0, Math.floor(sortedReports.length / 2));
    const secondHalf = sortedReports.slice(Math.floor(sortedReports.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.compliancePercentage, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.compliancePercentage, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    return {
      trend: difference > 1 ? 'IMPROVING' : difference < -1 ? 'DECLINING' : 'STABLE',
      trendValue: difference,
      firstPeriodAvg: firstHalfAvg,
      secondPeriodAvg: secondHalfAvg,
    };
  }
}