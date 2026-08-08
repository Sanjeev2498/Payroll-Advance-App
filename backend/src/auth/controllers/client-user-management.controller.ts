import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { ClientUserPermissions } from '../enums/permissions.enum';
import { ClientUserManagementService } from '../services/client-user-management.service';
import {
  CreateClientUserDto,
  UpdateClientUserDto,
  ClientUserQueryDto,
  BulkUpdateClientUsersDto,
} from '../dto/client-user-management.dto';
import {
  ClientUserResponseDto,
  ClientUserListResponseDto,
  ClientUserInvitationResponseDto,
  ClientUserStatisticsDto,
  ClientUserRolePermissionsDto,
  BulkUpdateResultDto,
} from '../dto/client-user-response.dto';
import { ClientUserRole } from '@prisma/client';

@ApiTags('Client User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('client-users')
export class ClientUserManagementController {
  constructor(private readonly clientUserManagementService: ClientUserManagementService) {}

  @Post()
  @RequirePermissions(ClientUserPermissions.CREATE_CLIENT_USER)
  @ApiOperation({
    summary: 'Create and invite client user',
    description: 'Create a new client user and send invitation email',
  })
  @ApiBody({ type: CreateClientUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Client user created and invited successfully',
    type: ClientUserInvitationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or user already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createClientUser(@Body() createDto: CreateClientUserDto): Promise<ClientUserInvitationResponseDto> {
    const result = await this.clientUserManagementService.createClientUser(createDto);

    return {
      success: true,
      data: {
        clientUser: this.mapToClientUserResponse(result.clientUser),
        invitationToken: result.invitationToken,
        invitationSent: result.invitationSent,
      },
      message: 'Client user created and invited successfully',
    };
  }

  @Get()
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'List client users',
    description: 'Get paginated list of client users with filtering options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client users retrieved successfully',
    type: ClientUserListResponseDto,
  })
  async listClientUsers(@Query() query: ClientUserQueryDto): Promise<ClientUserListResponseDto> {
    const result = await this.clientUserManagementService.listClientUsers(
      {
        clientId: query.clientId,
        role: query.role,
        isActive: query.isActive,
        search: query.search,
      },
      query.page,
      query.limit,
      query.sortBy as any,
      query.sortOrder,
    );

    return {
      users: result.users.map(user => this.mapToClientUserResponse(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('statistics')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get client user statistics',
    description: 'Get comprehensive statistics about client users',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: ClientUserStatisticsDto,
  })
  async getStatistics(): Promise<ClientUserStatisticsDto> {
    return this.clientUserManagementService.getClientUserStatistics();
  }

  @Get('roles')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get available client user roles',
    description: 'Get list of available client user roles with descriptions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  async getAvailableRoles(): Promise<{
    roles: {
      role: string;
      description: string;
      hierarchyLevel: number;
    }[];
  }> {
    const roles = this.clientUserManagementService.getAvailableClientRoles();
    return { roles: roles.map(r => ({ ...r, role: r.role.toString() })) };
  }

  @Get('roles/:role/permissions')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Get permissions for a specific client user role',
  })
  @ApiParam({
    name: 'role',
    enum: ClientUserRole,
    description: 'Client user role',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permissions retrieved successfully',
    type: ClientUserRolePermissionsDto,
  })
  async getRolePermissions(@Param('role') role: ClientUserRole): Promise<ClientUserRolePermissionsDto> {
    return this.clientUserManagementService.getClientUserRolePermissions(role);
  }

  @Get(':id')
  @RequirePermissions(ClientUserPermissions.READ_CLIENT_USER)
  @ApiOperation({
    summary: 'Get client user by ID',
    description: 'Get detailed information about a specific client user',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client user retrieved successfully',
    type: ClientUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client user not found',
  })
  async getClientUser(@Param('id', ParseUUIDPipe) id: string): Promise<{
    success: boolean;
    data: ClientUserResponseDto;
  }> {
    const clientUser = await this.clientUserManagementService.getClientUserById(id);
    
    if (!clientUser) {
      throw new Error('Client user not found'); // Will be caught by exception filter
    }

    return {
      success: true,
      data: this.mapToClientUserResponse(clientUser),
    };
  }

  @Put(':id')
  @RequirePermissions(ClientUserPermissions.UPDATE_CLIENT_USER)
  @ApiOperation({
    summary: 'Update client user',
    description: 'Update client user information',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiBody({ type: UpdateClientUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client user updated successfully',
    type: ClientUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client user not found',
  })
  async updateClientUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateClientUserDto,
  ): Promise<{
    success: boolean;
    data: ClientUserResponseDto;
    message: string;
  }> {
    const updatedUser = await this.clientUserManagementService.updateClientUser(id, updateDto);

    return {
      success: true,
      data: this.mapToClientUserResponse(updatedUser),
      message: 'Client user updated successfully',
    };
  }

  @Post(':id/activate')
  @RequirePermissions(ClientUserPermissions.ACTIVATE_CLIENT_USER)
  @ApiOperation({
    summary: 'Activate client user',
    description: 'Activate a client user account',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client user activated successfully',
  })
  async activateClientUser(@Param('id', ParseUUIDPipe) id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.clientUserManagementService.activateClientUser(id);

    return {
      success: true,
      message: 'Client user activated successfully',
    };
  }

  @Post(':id/deactivate')
  @RequirePermissions(ClientUserPermissions.DEACTIVATE_CLIENT_USER)
  @ApiOperation({
    summary: 'Deactivate client user',
    description: 'Deactivate a client user account',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client user deactivated successfully',
  })
  async deactivateClientUser(@Param('id', ParseUUIDPipe) id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.clientUserManagementService.deactivateClientUser(id);

    return {
      success: true,
      message: 'Client user deactivated successfully',
    };
  }

  @Post(':id/resend-invitation')
  @RequirePermissions(ClientUserPermissions.INVITE_CLIENT_USER)
  @ApiOperation({
    summary: 'Resend invitation',
    description: 'Resend invitation email to client user',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation sent successfully',
  })
  async resendInvitation(@Param('id', ParseUUIDPipe) id: string): Promise<{
    success: boolean;
    data: { invitationToken: string; sent: boolean };
    message: string;
  }> {
    const result = await this.clientUserManagementService.resendInvitation(id);

    return {
      success: true,
      data: result,
      message: 'Invitation sent successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions(ClientUserPermissions.DELETE_CLIENT_USER)
  @ApiOperation({
    summary: 'Delete client user',
    description: 'Delete (deactivate) a client user',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client user deleted successfully',
  })
  async deleteClientUser(@Param('id', ParseUUIDPipe) id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.clientUserManagementService.deleteClientUser(id);
  }

  @Post('bulk-update')
  @RequirePermissions(ClientUserPermissions.UPDATE_CLIENT_USER)
  @ApiOperation({
    summary: 'Bulk update client users',
    description: 'Update multiple client users at once',
  })
  @ApiBody({ type: BulkUpdateClientUsersDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk update completed',
    type: BulkUpdateResultDto,
  })
  async bulkUpdateClientUsers(@Body() bulkUpdateDto: BulkUpdateClientUsersDto): Promise<{
    success: boolean;
    data: BulkUpdateResultDto;
    message: string;
  }> {
    const result = await this.clientUserManagementService.bulkUpdateClientUsers(
      bulkUpdateDto.userIds,
      bulkUpdateDto.updates,
    );

    return {
      success: true,
      data: result,
      message: `Bulk update completed: ${result.updated} updated, ${result.failed} failed`,
    };
  }

  /**
   * Helper method to map ClientUser to ClientUserResponseDto
   */
  private mapToClientUserResponse(user: any): ClientUserResponseDto {
    return {
      id: user.id,
      clientId: user.clientId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      jobTitle: user.jobTitle,
      department: user.department,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      invitedAt: user.invitedAt?.toISOString(),
      activatedAt: user.activatedAt?.toISOString(),
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
      client: user.client ? {
        id: user.client.id,
        name: user.client.name,
        companyId: user.client.companyId,
      } : undefined,
    };
  }
}