import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ClientPermissions } from '../auth/enums/permissions.enum';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  ClientResponseDto,
  ClientListResponseDto,
  ClientStatsResponseDto,
  ContractStatus,
} from './dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions(ClientPermissions.CREATE_CLIENT)
  @ApiOperation({ 
    summary: 'Create a new client',
    description: 'Create a new client with contract information and initiate onboarding workflow'
  })
  @ApiBody({ type: CreateClientDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Client successfully created',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Client with this email already exists',
  })
  async create(@Body() createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    this.logger.log('POST /clients - Creating new client');
    const client = await this.clientsService.create(createClientDto);
    return {
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  @Get()
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({ 
    summary: 'Get all clients',
    description: 'Retrieve a paginated list of clients with optional filtering and search'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by client name or email' })
  @ApiQuery({ name: 'contractStatus', required: false, enum: ContractStatus, description: 'Filter by contract status' })
  @ApiQuery({ name: 'contractExpiringBefore', required: false, description: 'Filter contracts expiring before date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of clients with pagination metadata',
    type: ClientListResponseDto,
  })
  async findAll(@Query() queryDto: ClientQueryDto): Promise<ClientListResponseDto> {
    this.logger.log('GET /clients - Fetching clients list');
    const result = await this.clientsService.findAll(queryDto);
    
    // Map the result to proper response format
    return {
      clients: result.clients.map(client => ({
        id: client.id,
        name: client.name,
        contactEmail: client.contactEmail,
        contactInfo: client.contactInfo,
        contractStatus: client.contractStatus as ContractStatus,
        contractStart: client.contractStart,
        contractEnd: client.contractEnd,
        billingPreferences: client.billingPreferences,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        _count: client._count
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  @Get('stats')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({ 
    summary: 'Get client statistics',
    description: 'Retrieve aggregated statistics about clients (counts by status, expiring contracts, etc.)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client statistics',
    type: ClientStatsResponseDto,
  })
  async getStats(): Promise<ClientStatsResponseDto> {
    this.logger.log('GET /clients/stats - Fetching client statistics');
    return await this.clientsService.getStats();
  }

  @Get('expiring')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({ 
    summary: 'Get clients with expiring contracts',
    description: 'Retrieve clients whose contracts are expiring within the specified number of days'
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days until expiry (default: 30)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of clients with expiring contracts',
    type: [ClientResponseDto],
  })
  async findExpiringContracts(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ): Promise<ClientResponseDto[]> {
    this.logger.log(`GET /clients/expiring - Fetching contracts expiring in ${days} days`);
    const clients = await this.clientsService.findExpiringContracts(days);
    return clients.map(client => ({
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }));
  }

  @Get('by-status/:status')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({ 
    summary: 'Get clients by contract status',
    description: 'Retrieve all clients with a specific contract status'
  })
  @ApiParam({ name: 'status', enum: ContractStatus, description: 'Contract status to filter by' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of clients with the specified status',
    type: [ClientResponseDto],
  })
  async findByStatus(@Param('status') status: ContractStatus): Promise<ClientResponseDto[]> {
    this.logger.log(`GET /clients/by-status/${status} - Fetching clients with status ${status}`);
    const clients = await this.clientsService.findByContractStatus(status);
    return clients.map(client => ({
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }));
  }

  @Get(':id')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({ 
    summary: 'Get client by ID',
    description: 'Retrieve detailed information about a specific client including related sites'
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client details',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    this.logger.log(`GET /clients/${id} - Fetching client details`);
    const client = await this.clientsService.findOne(id);
    return {
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  @Patch(':id')
  @RequirePermissions(ClientPermissions.UPDATE_CLIENT)
  @ApiOperation({ 
    summary: 'Update client',
    description: 'Update client information and contract details'
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiBody({ type: UpdateClientDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client successfully updated',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    this.logger.log(`PATCH /clients/${id} - Updating client`);
    const client = await this.clientsService.update(id, updateClientDto);
    return {
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  @Delete(':id')
  @RequirePermissions(ClientPermissions.DELETE_CLIENT)
  @ApiOperation({ 
    summary: 'Delete client',
    description: 'Soft delete a client by setting contract status to TERMINATED'
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client successfully deleted (terminated)',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    this.logger.log(`DELETE /clients/${id} - Soft deleting client`);
    const client = await this.clientsService.remove(id);
    return {
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactInfo: client.contactInfo,
      contractStatus: client.contractStatus as ContractStatus,
      contractStart: client.contractStart,
      contractEnd: client.contractEnd,
      billingPreferences: client.billingPreferences,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }
}