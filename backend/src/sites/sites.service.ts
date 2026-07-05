import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateSiteDto, UpdateSiteDto, SiteQueryDto, SiteOperationalStatus } from './dto';
import { Site, Prisma } from '@prisma/client';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';


@Injectable()
export class SitesService {
  private readonly logger = new Logger(SitesService.name);

  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly clientRepository: ClientRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new site with client relationship validation
   */
  async create(createSiteDto: CreateSiteDto): Promise<Site> {
    this.logger.log(
      `Creating new site: ${createSiteDto.name} for client: ${createSiteDto.clientId}`,
    );

    // Validate that the client exists and belongs to the current tenant
    const client = await this.clientRepository.findById(createSiteDto.clientId);
    if (!client) {
      throw new BadRequestException(`Client with ID ${createSiteDto.clientId} not found`);
    }

    // Validate client contract status
    if (client.contractStatus === 'TERMINATED') {
      throw new BadRequestException('Cannot create sites for terminated clients');
    }

    // Set default operational status if not provided
    if (!createSiteDto.operationalStatus) {
      createSiteDto.operationalStatus = SiteOperationalStatus.ACTIVE;
    }

    // Prepare the site data for creation
    const siteData: Prisma.SiteCreateInput = {
      name: createSiteDto.name,
      address: createSiteDto.address as unknown as Prisma.JsonValue,
      accessRequirements: createSiteDto.accessRequirements
        ? (createSiteDto.accessRequirements as unknown as Prisma.JsonValue)
        : undefined,
      safetyProtocols: createSiteDto.safetyProtocols
        ? (createSiteDto.safetyProtocols as unknown as Prisma.JsonValue)
        : undefined,
      operationalStatus: createSiteDto.operationalStatus as any,
      contactInfo: createSiteDto.contactInfo
        ? (createSiteDto.contactInfo as unknown as Prisma.JsonValue)
        : undefined,
      client: {
        connect: { id: createSiteDto.clientId },
      },
    };

    // Add custom metadata including staffing requirements and contract details
    const metadata: any = {
      ...createSiteDto.metadata,
    };

    if (createSiteDto.staffingRequirements) {
      metadata.staffingRequirements = createSiteDto.staffingRequirements;
    }

    if (createSiteDto.contractDetails) {
      metadata.contractDetails = createSiteDto.contractDetails;
    }

    if (Object.keys(metadata).length > 0) {
      // Store additional data in JSON fields for flexibility
      siteData.accessRequirements = {
        ...((siteData.accessRequirements as any) || {}),
        metadata,
      };
    }

    try {
      const site = await this.siteRepository.create(siteData);
      this.logger.log(`Successfully created site: ${site.id}`);

      // Trigger site setup workflow
      await this.initiateSiteSetupWorkflow(site);

      return site;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find all sites with advanced filtering and pagination
   */
  async findAll(queryDto: SiteQueryDto) {
    this.logger.log('Fetching sites list with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      clientId: queryDto.clientId,
      operationalStatus: queryDto.operationalStatus,
    };

    try {
      const result = await this.siteRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy as keyof Site,
        queryDto.sortOrder,
      );

      this.logger.log(`Found ${result.total} sites`);
      return result;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find site by ID with related data
   */
  async findOne(id: string): Promise<Site> {
    this.logger.log(`Fetching site: ${id}`);

    const site = await this.siteRepository.findById(id);
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }

    return site;
  }

  /**
   * Update site information
   */
  async update(id: string, updateSiteDto: UpdateSiteDto): Promise<Site> {
    this.logger.log(`Updating site: ${id}`);

    // Validate client relationship if being changed
    if (updateSiteDto.clientId) {
      const client = await this.clientRepository.findById(updateSiteDto.clientId);
      if (!client) {
        throw new BadRequestException(`Client with ID ${updateSiteDto.clientId} not found`);
      }
    }

    // Validate operational status transitions
    if (updateSiteDto.operationalStatus) {
      await this.validateStatusTransition(id, updateSiteDto.operationalStatus);
    }

    // Prepare the update data
    const updateData: Prisma.SiteUpdateInput = {};

    if (updateSiteDto.name) {
      updateData.name = updateSiteDto.name;
    }

    if (updateSiteDto.address) {
      updateData.address = updateSiteDto.address as unknown as Prisma.JsonValue;
    }

    if (updateSiteDto.accessRequirements) {
      updateData.accessRequirements =
        updateSiteDto.accessRequirements as unknown as Prisma.JsonValue;
    }

    if (updateSiteDto.safetyProtocols) {
      updateData.safetyProtocols = updateSiteDto.safetyProtocols as unknown as Prisma.JsonValue;
    }

    if (updateSiteDto.operationalStatus) {
      updateData.operationalStatus = updateSiteDto.operationalStatus as any;
    }

    if (updateSiteDto.contactInfo) {
      updateData.contactInfo = updateSiteDto.contactInfo as unknown as Prisma.JsonValue;
    }

    if (updateSiteDto.clientId) {
      updateData.client = {
        connect: { id: updateSiteDto.clientId },
      };
    }

    try {
      const updatedSite = await this.siteRepository.update(id, updateData);
      this.logger.log(`Successfully updated site: ${id}`);

      // Handle status change workflows
      if (updateSiteDto.operationalStatus) {
        await this.handleStatusChangeWorkflow(updatedSite, updateSiteDto.operationalStatus);
      }

      return updatedSite;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update site: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update site: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Soft delete site (set to INACTIVE status)
   */
  async remove(id: string): Promise<Site> {
    this.logger.log(`Soft deleting site: ${id}`);

    try {
      const deletedSite = await this.siteRepository.delete(id);
      this.logger.log(`Successfully soft deleted site: ${id}`);

      // Handle site deactivation workflow
      await this.handleSiteDeactivation(deletedSite);

      return deletedSite;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete site: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to delete site: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get site statistics
   */
  async getStats() {
    this.logger.log('Fetching site statistics');

    try {
      const stats = await this.siteRepository.getSiteStats();
      this.logger.log('Successfully fetched site statistics', stats);
      return stats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find sites by client ID
   */
  async findByClientId(clientId: string): Promise<Site[]> {
    this.logger.log(`Fetching sites for client: ${clientId}`);

    // Validate client exists and belongs to current tenant
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    try {
      const sites = await this.siteRepository.findByClientId(clientId);
      this.logger.log(`Found ${sites.length} sites for client ${clientId}`);
      return sites;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find sites by operational status
   */
  async findByOperationalStatus(status: SiteOperationalStatus): Promise<Site[]> {
    this.logger.log(`Fetching sites with status: ${status}`);

    try {
      const sites = await this.siteRepository.findByOperationalStatus(status);
      this.logger.log(`Found ${sites.length} sites with status ${status}`);
      return sites;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Site setup workflow
   */
  private async initiateSiteSetupWorkflow(site: Site): Promise<void> {
    this.logger.log(`Initiating setup workflow for site: ${site.id}`);

    try {
      // TODO: Implement setup workflow steps:
      // 1. Validate site requirements completeness
      // 2. Schedule site assessment if needed
      // 3. Create initial staffing requirements
      // 4. Send setup notifications to relevant stakeholders
      // 5. Create onboarding checklist

      this.logger.log(`Setup workflow initiated for site: ${site.id}`);
    } catch (error) {
      this.logger.error(`Setup workflow failed for site ${site.id}: ${getErrorMessage(error)}`);
      // Don't throw here - setup failure shouldn't prevent site creation
    }
  }

  /**
   * Validate operational status transitions
   */
  private async validateStatusTransition(
    siteId: string,
    newStatus: SiteOperationalStatus,
  ): Promise<void> {
    const currentSite = await this.findOne(siteId);
    const currentStatus = currentSite.operationalStatus;

    // Define valid status transitions
    const validTransitions: Record<string, SiteOperationalStatus[]> = {
      ACTIVE: [
        SiteOperationalStatus.INACTIVE,
        SiteOperationalStatus.SUSPENDED,
        SiteOperationalStatus.MAINTENANCE,
      ],
      INACTIVE: [SiteOperationalStatus.ACTIVE],
      MAINTENANCE: [SiteOperationalStatus.ACTIVE, SiteOperationalStatus.SUSPENDED],
      SUSPENDED: [SiteOperationalStatus.ACTIVE, SiteOperationalStatus.INACTIVE],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Handle status change workflows
   */
  private async handleStatusChangeWorkflow(
    site: Site,
    newStatus: SiteOperationalStatus,
  ): Promise<void> {
    this.logger.log(`Handling status change for site ${site.id}: ${newStatus}`);

    try {
      switch (newStatus) {
        case SiteOperationalStatus.ACTIVE:
          // TODO: Activate site services, notify assignments
          break;
        case SiteOperationalStatus.INACTIVE:
          // TODO: Suspend services, reassign personnel
          break;
        case SiteOperationalStatus.SUSPENDED:
          // TODO: Temporary suspension, hold assignments
          break;
        case SiteOperationalStatus.MAINTENANCE:
          // TODO: Maintenance mode, adjust assignments
          break;
      }
    } catch (error) {
      this.logger.error(`Status change handling failed for site ${site.id}: ${getErrorMessage(error)}`);
      // Don't throw here - status change workflow failure shouldn't prevent the update
    }
  }

  /**
   * Handle site deactivation workflow
   */
  private async handleSiteDeactivation(site: Site): Promise<void> {
    this.logger.log(`Handling deactivation workflow for site: ${site.id}`);

    try {
      // TODO: Implement deactivation steps:
      // 1. Reassign or terminate active assignments
      // 2. Cancel upcoming shifts
      // 3. Notify relevant stakeholders
      // 4. Update reporting and analytics
      // 5. Archive site data per retention policy

      this.logger.log(`Deactivation workflow completed for site: ${site.id}`);
    } catch (error) {
      this.logger.error(`Deactivation workflow failed for site ${site.id}: ${getErrorMessage(error)}`);
      // Don't throw here - deactivation workflow failure shouldn't prevent the deletion
    }
  }
}
