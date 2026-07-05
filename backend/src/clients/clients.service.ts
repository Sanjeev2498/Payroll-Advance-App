import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateClientDto, UpdateClientDto, ClientQueryDto, ContractStatus } from './dto';
import { Client } from '@prisma/client';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';


@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new client with onboarding workflow
   */
  async create(createClientDto: CreateClientDto): Promise<Client> {
    this.logger.log(`Creating new client: ${createClientDto.name}`);

    // Validate contract dates if both are provided
    if (createClientDto.contractStart && createClientDto.contractEnd) {
      if (createClientDto.contractStart >= createClientDto.contractEnd) {
        throw new BadRequestException('Contract start date must be before end date');
      }
    }

    // Set default contract status if not provided
    if (!createClientDto.contractStatus) {
      createClientDto.contractStatus = ContractStatus.PENDING;
    }

    // Check for duplicate email within tenant
    await this.validateUniqueEmail(createClientDto.contactEmail);

    try {
      const client = await this.clientRepository.create(createClientDto);
      this.logger.log(`Successfully created client: ${client.id}`);

      // Trigger onboarding workflow
      await this.initiateOnboardingWorkflow(client);

      return client;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find all clients with advanced filtering and pagination
   */
  async findAll(queryDto: ClientQueryDto) {
    this.logger.log('Fetching clients list with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      contractStatus: queryDto.contractStatus,
      contractExpiringBefore: queryDto.contractExpiringBefore,
    };

    try {
      const result = await this.clientRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy,
        queryDto.sortOrder,
      );

      this.logger.log(`Found ${result.total} clients`);
      return result;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find client by ID with related data
   */
  async findOne(id: string): Promise<Client> {
    this.logger.log(`Fetching client: ${id}`);

    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  /**
   * Update client information
   */
  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    this.logger.log(`Updating client: ${id}`);

    // Validate contract dates if both are provided
    if (updateClientDto.contractStart && updateClientDto.contractEnd) {
      if (updateClientDto.contractStart >= updateClientDto.contractEnd) {
        throw new BadRequestException('Contract start date must be before end date');
      }
    }

    // Check for duplicate email if email is being updated
    if (updateClientDto.contactEmail) {
      await this.validateUniqueEmail(updateClientDto.contactEmail, id);
    }

    try {
      const updatedClient = await this.clientRepository.update(id, updateClientDto);
      this.logger.log(`Successfully updated client: ${id}`);

      // Handle contract status changes
      if (updateClientDto.contractStatus) {
        await this.handleContractStatusChange(updatedClient, updateClientDto.contractStatus);
      }

      return updatedClient;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update client: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update client: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Soft delete client (set to TERMINATED status)
   */
  async remove(id: string): Promise<Client> {
    this.logger.log(`Soft deleting client: ${id}`);

    try {
      const deletedClient = await this.clientRepository.delete(id);
      this.logger.log(`Successfully soft deleted client: ${id}`);

      // Handle termination workflow
      await this.handleClientTermination(deletedClient);

      return deletedClient;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete client: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to delete client: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get client statistics
   */
  async getStats() {
    this.logger.log('Fetching client statistics');

    try {
      const stats = await this.clientRepository.getClientStats();
      this.logger.log('Successfully fetched client statistics', stats);
      return stats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find clients with expiring contracts
   */
  async findExpiringContracts(daysUntilExpiry: number = 30) {
    this.logger.log(`Fetching contracts expiring within ${daysUntilExpiry} days`);

    try {
      const clients = await this.clientRepository.findExpiringContracts(daysUntilExpiry);
      this.logger.log(`Found ${clients.length} contracts expiring soon`);
      return clients;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find clients by contract status
   */
  async findByContractStatus(status: ContractStatus) {
    this.logger.log(`Fetching clients with status: ${status}`);

    try {
      const clients = await this.clientRepository.findByContractStatus(status);
      this.logger.log(`Found ${clients.length} clients with status ${status}`);
      return clients;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Client onboarding workflow
   */
  private async initiateOnboardingWorkflow(client: Client): Promise<void> {
    this.logger.log(`Initiating onboarding workflow for client: ${client.id}`);

    try {
      // TODO: Implement onboarding steps:
      // 1. Send welcome email with contract documents
      // 2. Create default billing setup
      // 3. Set up notification preferences
      // 4. Schedule initial meeting/setup call
      // 5. Create onboarding checklist

      this.logger.log(`Onboarding workflow initiated for client: ${client.id}`);
    } catch (error) {
      this.logger.error(`Onboarding workflow failed for client ${client.id}: ${getErrorMessage(error)}`);
      // Don't throw here - onboarding failure shouldn't prevent client creation
    }
  }

  /**
   * Handle contract status changes
   */
  private async handleContractStatusChange(
    client: Client,
    newStatus: ContractStatus,
  ): Promise<void> {
    this.logger.log(`Handling status change for client ${client.id}: ${newStatus}`);

    try {
      switch (newStatus) {
        case ContractStatus.ACTIVE:
          // TODO: Activate services, send activation notification
          break;
        case ContractStatus.TERMINATED:
          // TODO: Deactivate services, final billing, data retention
          break;
        case ContractStatus.EXPIRED:
          // TODO: Send renewal notifications, suspend services
          break;
        case ContractStatus.PENDING:
          // TODO: Send pending documents, follow up reminders
          break;
      }
    } catch (error) {
      this.logger.error(`Status change handling failed for client ${client.id}: ${getErrorMessage(error)}`);
      // Don't throw here - status change workflow failure shouldn't prevent the update
    }
  }

  /**
   * Handle client termination workflow
   */
  private async handleClientTermination(client: Client): Promise<void> {
    this.logger.log(`Handling termination workflow for client: ${client.id}`);

    try {
      // TODO: Implement termination steps:
      // 1. Generate final invoices
      // 2. Export client data for retention
      // 3. Notify relevant stakeholders
      // 4. Schedule data purging per retention policy
      // 5. Update related assignments and sites

      this.logger.log(`Termination workflow completed for client: ${client.id}`);
    } catch (error) {
      this.logger.error(`Termination workflow failed for client ${client.id}: ${getErrorMessage(error)}`);
      // Don't throw here - termination workflow failure shouldn't prevent the deletion
    }
  }

  /**
   * Validate email uniqueness within tenant
   */
  private async validateUniqueEmail(email: string, excludeId?: string): Promise<void> {
    // TODO: Implement email uniqueness check
    // This would require adding a method to the repository
    // For now, we'll rely on database constraints to catch duplicates
  }
}
