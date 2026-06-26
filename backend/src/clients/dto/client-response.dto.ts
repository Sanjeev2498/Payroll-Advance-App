import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from './create-client.dto';
import { ContractStatus as PrismaContractStatus } from '@prisma/client';

export class ClientStatsDto {
  @ApiProperty({ description: 'Number of sites for this client' })
  sites: number;
}

export class ClientResponseDto {
  @ApiProperty({ description: 'Client unique identifier' })
  id: string;

  @ApiProperty({ description: 'Client company name' })
  name: string;

  @ApiProperty({ description: 'Primary contact email' })
  contactEmail: string;

  @ApiPropertyOptional({ description: 'Additional contact information' })
  contactInfo?: any;

  @ApiProperty({ description: 'Contract status', enum: ContractStatus })
  contractStatus: ContractStatus;

  @ApiPropertyOptional({ description: 'Contract start date' })
  contractStart?: Date;

  @ApiPropertyOptional({ description: 'Contract end date' })
  contractEnd?: Date;

  @ApiPropertyOptional({ description: 'Billing preferences' })
  billingPreferences?: any;

  @ApiProperty({ description: 'Client creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Client statistics', type: ClientStatsDto })
  _count?: ClientStatsDto;
}

export class ClientListResponseDto {
  @ApiProperty({ description: 'List of clients', type: [ClientResponseDto] })
  clients: ClientResponseDto[];

  @ApiProperty({ description: 'Total number of clients' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class ClientStatsResponseDto {
  @ApiProperty({ description: 'Total number of clients' })
  total: number;

  @ApiProperty({ description: 'Number of active clients' })
  active: number;

  @ApiProperty({ description: 'Number of suspended clients' })
  suspended: number;

  @ApiProperty({ description: 'Number of terminated clients' })
  terminated: number;

  @ApiProperty({ description: 'Number of contracts expiring this month' })
  expiringThisMonth: number;
}