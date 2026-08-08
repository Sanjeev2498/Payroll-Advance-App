import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { ClientUserRepository } from '../../common/repositories/client-user.repository';
import { ClientUserAuthService } from './client-user-auth.service';
import { ClientUserPermissionsConfig } from '../rbac/client-user-permissions.config';
import { ClientUserRole, ClientUser } from '@prisma/client';

export interface CreateClientUserRequest {
  clientId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClientUserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
}

export interface UpdateClientUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: ClientUserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isActive?: boolean;
}

export interface ClientUserListFilters {
  clientId?: string;
  role?: ClientUserRole;
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class ClientUserManagementService {
  private readonly logger = new Logger(ClientUserManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly clientUserRepository: ClientUserRepository,
    private readonly clientUserAuthService: ClientUserAuthService,
  ) {}

  /**
   * Create and invite a new client user
   */
  async createClientUser(data: CreateClientUserRequest): Promise<{
    clientUser: ClientUser;
    invitationToken: string;
    invitationSent: boolean;
  }> {
    this.logger.log(`Creating client user ${data.email} for client ${data.clientId}`);

    // Verify client exists and belongs to current tenant
    await this.validateClientAccess(data.clientId);

    // Use the auth service to handle invitation
    const result = await this.clientUserAuthService.inviteClientUser(data.clientId, data);

    this.logger.log(`Client user created and invited: ${data.email}`);

    return {
      clientUser: result.clientUser,
      invitationToken: result.invitationToken,
      invitationSent: result.invitationSent,
    };
  }

  /**
   * Get client user by ID
   */
  async getClientUserById(id: string): Promise<ClientUser | null> {
    const clientUser = await this.clientUserRepository.findById(id);
    
    if (clientUser) {
      // Verify the client user's client belongs to current tenant
      await this.validateClientAccess(clientUser.clientId);
    }

    return clientUser;
  }

  /**
   * Update client user
   */
  async updateClientUser(id: string, data: UpdateClientUserRequest): Promise<ClientUser> {
    this.logger.log(`Updating client user ${id}`);

    // Get existing user to verify access
    const existingUser = await this.getClientUserById(id);
    if (!existingUser) {
      throw new NotFoundException('Client user not found');
    }

    // Verify client access
    await this.validateClientAccess(existingUser.clientId);

    // Update the user
    const updatedUser = await this.clientUserRepository.update(id, data);

    this.logger.log(`Client user updated successfully: ${id}`);

    return updatedUser;
  }

  /**
   * List client users with filtering
   */
  async listClientUsers(
    filters: ClientUserListFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: keyof ClientUser = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{
    users: (ClientUser & { client: any })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log('Listing client users with filters:', filters);

    // If clientId is specified, validate access to that client
    if (filters.clientId) {
      await this.validateClientAccess(filters.clientId);
    }

    return this.clientUserRepository.findMany(
      {
        ...filters,
        // Ensure we only get users for clients belonging to current tenant
        // The repository will handle tenant filtering
      },
      page,
      limit,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Get client users by client ID
   */
  async getClientUsersByClientId(clientId: string): Promise<ClientUser[]> {
    await this.validateClientAccess(clientId);
    return this.clientUserRepository.findByClientId(clientId);
  }

  /**
   * Get client users by role
   */
  async getClientUsersByRole(role: ClientUserRole): Promise<ClientUser[]> {
    return this.clientUserRepository.findByRole(role);
  }

  /**
   * Activate client user
   */
  async activateClientUser(id: string): Promise<ClientUser> {
    this.logger.log(`Activating client user ${id}`);

    const existingUser = await this.getClientUserById(id);
    if (!existingUser) {
      throw new NotFoundException('Client user not found');
    }

    await this.validateClientAccess(existingUser.clientId);

    const activatedUser = await this.clientUserRepository.update(id, { isActive: true });

    this.logger.log(`Client user activated: ${id}`);

    return activatedUser;
  }

  /**
   * Deactivate client user
   */
  async deactivateClientUser(id: string): Promise<ClientUser> {
    this.logger.log(`Deactivating client user ${id}`);

    const existingUser = await this.getClientUserById(id);
    if (!existingUser) {
      throw new NotFoundException('Client user not found');
    }

    await this.validateClientAccess(existingUser.clientId);

    const deactivatedUser = await this.clientUserRepository.deactivate(id);

    this.logger.log(`Client user deactivated: ${id}`);

    return deactivatedUser;
  }

  /**
   * Delete client user (soft delete by deactivating)
   */
  async deleteClientUser(id: string): Promise<{ success: boolean; message: string }> {
    await this.deactivateClientUser(id);
    
    return {
      success: true,
      message: 'Client user deleted successfully',
    };
  }

  /**
   * Resend invitation to client user
   */
  async resendInvitation(id: string): Promise<{ invitationToken: string; sent: boolean }> {
    this.logger.log(`Resending invitation to client user ${id}`);

    const existingUser = await this.getClientUserById(id);
    if (!existingUser) {
      throw new NotFoundException('Client user not found');
    }

    await this.validateClientAccess(existingUser.clientId);

    if (existingUser.activatedAt) {
      throw new BadRequestException('User is already activated');
    }

    // Use auth service to regenerate invitation
    const result = await this.clientUserAuthService.inviteClientUser(existingUser.clientId, {
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      role: existingUser.role,
      phone: existingUser.phone,
      jobTitle: existingUser.jobTitle,
      department: existingUser.department,
    });

    return {
      invitationToken: result.invitationToken,
      sent: result.invitationSent,
    };
  }

  /**
   * Update client user permissions
   */
  async updateClientUserPermissions(id: string, permissions: any): Promise<ClientUser> {
    this.logger.log(`Updating permissions for client user ${id}`);

    const existingUser = await this.getClientUserById(id);
    if (!existingUser) {
      throw new NotFoundException('Client user not found');
    }

    await this.validateClientAccess(existingUser.clientId);

    return this.clientUserRepository.updatePermissions(id, permissions);
  }

  /**
   * Get client user statistics
   */
  async getClientUserStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: { role: string; count: number }[];
    byClient: { clientId: string; count: number }[];
    pendingActivations: number;
    recentlyActive: number;
  }> {
    const stats = await this.clientUserRepository.getClientUserStats();
    
    // Convert role stats to expected format
    const byRole = Object.entries(stats.byRole).map(([role, count]) => ({
      role,
      count: count as number,
    }));
    
    // Convert client stats to expected format
    const byClient = Object.entries(stats.byClient).map(([clientId, count]) => ({
      clientId,
      count: count as number,
    }));
    
    return {
      total: stats.total,
      active: stats.active,
      inactive: stats.inactive,
      byRole,
      byClient,
      pendingActivations: stats.pendingActivations,
      recentlyActive: 0, // This would need to be calculated based on recent login activity
    };
  }

  /**
   * Get role permissions for a client user
   */
  async getClientUserRolePermissions(role: ClientUserRole): Promise<{
    role: ClientUserRole;
    permissions: string[];
    description: string;
    summary: any;
  }> {
    const permissions = ClientUserPermissionsConfig.getPermissionsForRole(role);
    const description = ClientUserPermissionsConfig.getRoleDescription(role);
    const summary = ClientUserPermissionsConfig.getPermissionsSummary(role);

    return {
      role,
      permissions: permissions.map(p => p.toString()),
      description,
      summary,
    };
  }

  /**
   * Check if client user has permission
   */
  async checkClientUserPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.getClientUserById(userId);
    if (!user || !user.isActive) {
      return false;
    }

    return ClientUserPermissionsConfig.hasPermission(user.role, permission as any);
  }

  /**
   * Validate that a client belongs to the current tenant
   */
  private async validateClientAccess(clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: this.tenantContext.getTenantId(),
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found or access denied`);
    }
  }

  /**
   * Bulk operations for client users
   */
  async bulkUpdateClientUsers(userIds: string[], updates: Partial<UpdateClientUserRequest>): Promise<{
    updated: number;
    failed: number;
    errors: { id: string; error: string }[];
  }> {
    this.logger.log(`Bulk updating ${userIds.length} client users`);

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[],
    };

    for (const userId of userIds) {
      try {
        await this.updateClientUser(userId, updates);
        results.updated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(`Bulk update completed: ${results.updated} updated, ${results.failed} failed`);

    return results;
  }

  /**
   * Get available roles for client users
   */
  getAvailableClientRoles(): {
    role: ClientUserRole;
    description: string;
    hierarchyLevel: number;
  }[] {
    return Object.values(ClientUserRole).map(role => ({
      role,
      description: ClientUserPermissionsConfig.getRoleDescription(role),
      hierarchyLevel: ClientUserPermissionsConfig.getClientRoleHierarchyLevel(role),
    }));
  }
}